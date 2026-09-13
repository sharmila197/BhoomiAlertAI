import * as XLSX from 'xlsx';

export interface CsvValidationResult {
  isValid: boolean;
  totalRows: number;
  validCount: number;
  columnCount: number;
  headers: string[];
  previewRows: any[];
  errorCount: number;
  warningCount: number;
  errors: string[];
  warnings: string[];
  parsedProjects: any[];
}

/**
 * Standardizes column header names by trimming, lowercasing, and stripping non-alphanumeric characters.
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Validates and strictly parses date values.
 * Supports:
 * - ISO strings (YYYY-MM-DD, YYYY/MM/DD)
 * - Indian / British standard (DD-MM-YYYY, DD/MM/YYYY)
 * - Excel serial date numbers (e.g. 45292)
 * Returns { date: Date, formatted: string } or null if invalid.
 */
export function parseDateStrict(val: any): { date: Date; formatted: string } | null {
  if (val === undefined || val === null) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return { date: val, formatted: `${y}-${m}-${d}` };
  }

  // Handle Excel serial date numbers (e.g. 45292 or '45292')
  if (typeof val === 'number' || (typeof val === 'string' && /^\d{5}$/.test(val.trim()))) {
    const num = Number(val);
    if (num > 10000 && num < 100000) {
      // Excel epoch begins 1899-12-30
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dateVal = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(dateVal.getTime())) {
        const y = dateVal.getUTCFullYear();
        const m = String(dateVal.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateVal.getUTCDate()).padStart(2, '0');
        return { date: dateVal, formatted: `${y}-${m}-${d}` };
      }
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        const fY = year;
        const fM = String(month + 1).padStart(2, '0');
        const fD = String(day).padStart(2, '0');
        return { date: d, formatted: `${fY}-${fM}-${fD}` };
      }
    }
    return null;
  }

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        const fY = year;
        const fM = String(month + 1).padStart(2, '0');
        const fD = String(day).padStart(2, '0');
        return { date: d, formatted: `${fY}-${fM}-${fD}` };
      }
    }
    return null;
  }

  // Fallback for valid Date strings (e.g. '01 Jan 2024')
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 1990 && y <= 2050) {
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return { date: parsed, formatted: `${y}-${m}-${d}` };
    }
  }

  return null;
}

/**
 * Parses a single CSV line respecting quoted fields.
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Comprehensive CSV Parser and Validator with 6 Required Columns and Date Validation.
 */
export function validateAndParseCsv(csvText: string): CsvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedProjects: any[] = [];

  if (!csvText || csvText.trim() === '') {
    return {
      isValid: false,
      totalRows: 0,
      validCount: 0,
      columnCount: 0,
      headers: [],
      previewRows: [],
      errorCount: 1,
      warningCount: 0,
      errors: ['The selected dataset file is empty.'],
      warnings: [],
      parsedProjects: [],
    };
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      isValid: false,
      totalRows: lines.length,
      validCount: 0,
      columnCount: 0,
      headers: [],
      previewRows: [],
      errorCount: 1,
      warningCount: 0,
      errors: ['Dataset file must contain a header row and at least one data record row.'],
      warnings: [],
      parsedProjects: [],
    };
  }

  // Parse Headers
  const rawHeaders = parseCsvLine(lines[0]);
  const normHeaders = rawHeaders.map(normalizeHeader);
  const columnCount = rawHeaders.filter((h) => h.trim().length > 0).length;

  // Validate the 6 Required Columns (with robust alias support for standard formats & demo datasets)
  const hasId = normHeaders.some((h) => ['projectid', 'id'].includes(h));
  const hasName = normHeaders.some((h) => ['projectname', 'name', 'title'].includes(h));
  const hasDistrict = normHeaders.some((h) => ['districtstate', 'district', 'state', 'location', 'districtname'].includes(h));
  const hasStatus = normHeaders.some((h) => ['status', 'stage', 'currentstage', 'projectstatus', 'compensationstatus', 'delayed'].includes(h));
  const hasSanctionedDate = normHeaders.some((h) => ['sanctioneddate', 'sanctiondate', 'datesanctioned', 'dateofsanction', 'awarddate', 'dateofaward', 'sanctioneddurationdays'].includes(h));
  const hasDelayDate = normHeaders.some((h) => ['delaydate', 'delayeddate', 'dateofdelay', 'delaydays', 'delaypercentage'].includes(h));

  if (!hasId) errors.push('Missing required column: Project ID');
  if (!hasName) errors.push('Missing required column: Project Name');
  if (!hasDistrict) errors.push('Missing required column: District / State');
  if (!hasStatus) errors.push('Missing required column: Status');
  if (!hasSanctionedDate) errors.push('Missing required column: Sanctioned Date');
  if (!hasDelayDate) errors.push('Missing required column: Delay Date');

  if (errors.length > 0) {
    return {
      isValid: false,
      totalRows: lines.length - 1,
      validCount: 0,
      columnCount,
      headers: rawHeaders,
      previewRows: [],
      errorCount: errors.length,
      warningCount: 0,
      errors,
      warnings,
      parsedProjects: [],
    };
  }

  const seenProjectIds = new Set<string>();

  for (let r = 1; r < lines.length; r++) {
    const rowNum = r + 1;
    const values = parseCsvLine(lines[r]);

    if (values.length === 0 || (values.length === 1 && values[0] === '')) {
      continue;
    }

    const rowObj: Record<string, any> = {};
    rawHeaders.forEach((header, idx) => {
      const normH = normHeaders[idx];
      const val = values[idx] !== undefined ? values[idx] : '';

      // Alias mapping
      if (['projectid', 'id'].includes(normH)) rowObj.projectId = val;
      else if (['projectname', 'name', 'title'].includes(normH)) rowObj.projectName = val;
      else if (['district', 'districtname'].includes(normH)) rowObj.district = val;
      else if (['state', 'statename'].includes(normH)) rowObj.state = val;
      else if (['districtstate'].includes(normH)) rowObj.district = val;
      else if (['taluk'].includes(normH)) rowObj.taluk = val;
      else if (['village'].includes(normH)) rowObj.village = val;
      else if (['status', 'stage', 'currentstage', 'projectstatus'].includes(normH)) rowObj.status = val;
      else if (['sanctioneddate', 'sanctiondate', 'datesanctioned', 'dateofsanction'].includes(normH)) rowObj.sanctionedDate = val;
      else if (['delaydate', 'delayeddate', 'dateofdelay'].includes(normH)) rowObj.delayDate = val;
      else if (['delaydays', 'delayeddays', 'daysofdelay'].includes(normH)) rowObj.delayDays = val;
      else if (['delayed', 'isdelayed'].includes(normH)) rowObj.delayed = val;
      else if (['landrequired', 'landarea'].includes(normH)) rowObj.landRequired = val;
      else if (['landacquired'].includes(normH)) rowObj.landAcquired = val;
      else if (['progress', 'acquisitionprogress', 'landacquisitionprogresspercent', 'landacquisitionprogress'].includes(normH)) {
        rowObj.acquisitionProgress = val;
        rowObj.landAcquisitionProgressPercent = val;
      }
      else if (['compensation', 'compensationamount', 'totalcompensation', 'compensationamountcr'].includes(normH)) {
        rowObj.compensation = val;
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          rowObj.hasExplicitCompensationAmount = true;
        }
      }
      else if (['compensationpaid'].includes(normH)) rowObj.compensationPaid = val;
      else if (['compensationpending'].includes(normH)) rowObj.compensationPending = val;
      else if (['compensationprogress'].includes(normH)) rowObj.compensationProgress = val;
      else if (['compensationstatus', 'compensationstage'].includes(normH)) rowObj.compensationStatus = val;
      else if (['pendingcompensationdays', 'compensationpendingdays', 'compensationdelaydays'].includes(normH)) rowObj.pendingCompensationDays = val;
      else if (['disputes', 'legaldisputes', 'cases', 'courtcases', 'courtcasescount'].includes(normH)) {
        rowObj.legalDisputes = val;
        rowObj.courtCases = val;
      }
      else if (['randrstatus', 'rrstatus', 'rehabilitationstatus', 'resettlementstatus'].includes(normH)) rowObj.rrStatus = val;
      else if (['documentationstatus', 'documentstatus', 'docsstatus'].includes(normH)) rowObj.documentationStatus = val;
      else if (['surveystatus', 'landsurveystatus'].includes(normH)) rowObj.surveyStatus = val;
      else if (['affectedfamilies', 'families'].includes(normH)) rowObj.affectedFamilies = val;
      else if (['documentationprogress'].includes(normH)) rowObj.documentationProgress = val;
      else if (['approvalprogress'].includes(normH)) rowObj.approvalProgress = val;
      else if (['rrprogress'].includes(normH)) rowObj.rrProgress = val;
      else if (['stakeholderresponsiveness', 'responsiveness'].includes(normH)) rowObj.stakeholderResponsiveness = val;
      else if (['latitude', 'lat'].includes(normH)) rowObj.latitude = val;
      else if (['longitude', 'lng', 'lon'].includes(normH)) rowObj.longitude = val;
      else if (['plannedcompletion'].includes(normH)) rowObj.plannedCompletion = val;
      else if (['expectedcompletion'].includes(normH)) rowObj.expectedCompletion = val;
      else if (['cost', 'totalprojectcost', 'projectcost', 'estimatedcost'].includes(normH)) rowObj.totalProjectCost = val;
      else if (['authority', 'projectauthority'].includes(normH)) rowObj.authority = val;
      else if (['sector'].includes(normH)) rowObj.sector = val;
      else if (['projecttype', 'type', 'subsector'].includes(normH)) rowObj.projectType = val;
      else if (['expectedrisk', 'targetrisk'].includes(normH)) rowObj.expectedRisk = val;
      else if (['risklevel'].includes(normH)) rowObj.riskLevel = val;
      else if (['riskscore'].includes(normH)) rowObj.riskScore = val;
      else rowObj[header] = val;
    });

    // Ensure Expected_Risk is captured under expectedRisk regardless of header casing/format
    if (rowObj.expectedRisk === undefined) {
      for (const [k, v] of Object.entries(rowObj)) {
        const normKey = normalizeHeader(k);
        if (normKey === 'expectedrisk') {
          rowObj.expectedRisk = v;
          break;
        }
      }
    }

    // Ensure Sanctioned Date / Award Date is captured
    if (rowObj.sanctionedDate === undefined) {
      for (const [k, v] of Object.entries(rowObj)) {
        const normKey = normalizeHeader(k);
        if (['sanctioneddate', 'sanctiondate', 'datesanctioned', 'dateofsanction', 'awarddate', 'dateofaward'].includes(normKey)) {
          rowObj.sanctionedDate = v;
          break;
        }
      }
    }

    // Ensure status is captured
    if (!rowObj.status) {
      rowObj.status = rowObj.compensationStatus || (rowObj.delayed === 'Yes' ? 'Delayed' : 'Compensation');
    }

    // Ensure Delay Date or Delay Days is captured
    if (rowObj.delayDate === undefined) {
      for (const [k, v] of Object.entries(rowObj)) {
        const normKey = normalizeHeader(k);
        if (['delaydate', 'delayeddate', 'dateofdelay'].includes(normKey)) {
          rowObj.delayDate = v;
          break;
        }
      }
    }

    // If delayDate is not explicitly provided but delayDays and sanctionedDate are available, compute delayDate
    if ((rowObj.delayDate === undefined || rowObj.delayDate === null || String(rowObj.delayDate).trim() === '') && rowObj.delayDays !== undefined && rowObj.sanctionedDate) {
      const parsedS = parseDateStrict(rowObj.sanctionedDate);
      const numDays = Number(rowObj.delayDays);
      if (parsedS && !isNaN(numDays)) {
        const computedD = new Date(parsedS.date.getTime() + numDays * 86400000);
        const y = computedD.getFullYear();
        const m = String(computedD.getMonth() + 1).padStart(2, '0');
        const d = String(computedD.getDate()).padStart(2, '0');
        rowObj.delayDate = `${y}-${m}-${d}`;
      }
    }

    // Row-level validations
    if (!rowObj.projectId || String(rowObj.projectId).trim() === '') {
      errors.push(`Row ${rowNum}: Missing Project ID.`);
      continue;
    }

    const pId = String(rowObj.projectId).trim();
    if (seenProjectIds.has(pId.toLowerCase())) {
      warnings.push(`Row ${rowNum}: Duplicate Project ID "${pId}" in CSV. Later occurrence will be applied.`);
    }
    seenProjectIds.add(pId.toLowerCase());

    if (!rowObj.projectName || String(rowObj.projectName).trim() === '') {
      warnings.push(`Row ${rowNum} (${pId}): Missing Project Name. Default will be applied.`);
      rowObj.projectName = `Project ${pId}`;
    }

    if (!rowObj.district || String(rowObj.district).trim() === '') {
      if (rowObj.state && String(rowObj.state).trim()) {
        rowObj.district = String(rowObj.state).trim();
      } else {
        warnings.push(`Row ${rowNum} (${pId}): Missing District. Defaulting to "Tamil Nadu".`);
        rowObj.district = 'Tamil Nadu';
      }
    }

    // Strict Date Validations (Requirements: Sanctioned Date and Delay Date)
    let sanctionedDateObj: Date | null = null;
    let delayDateObj: Date | null = null;

    const sanctionedDateErr = 'Invalid date format in Sanctioned Date. Please provide a valid date.';
    if (rowObj.sanctionedDate === undefined || rowObj.sanctionedDate === null || String(rowObj.sanctionedDate).trim() === '') {
      if (!errors.includes(sanctionedDateErr)) errors.push(sanctionedDateErr);
    } else {
      const parsedS = parseDateStrict(rowObj.sanctionedDate);
      if (!parsedS) {
        if (!errors.includes(sanctionedDateErr)) errors.push(sanctionedDateErr);
      } else {
        sanctionedDateObj = parsedS.date;
        rowObj.sanctionedDate = parsedS.formatted;
      }
    }

    const delayDateErr = 'Invalid date format in Delay Date. Please provide a valid date.';
    if (rowObj.delayDate === undefined || rowObj.delayDate === null || String(rowObj.delayDate).trim() === '') {
      if (!errors.includes(delayDateErr)) errors.push(delayDateErr);
    } else {
      const parsedD = parseDateStrict(rowObj.delayDate);
      if (!parsedD) {
        if (!errors.includes(delayDateErr)) errors.push(delayDateErr);
      } else {
        delayDateObj = parsedD.date;
        rowObj.delayDate = parsedD.formatted;
      }
    }

    // Dynamic Delay Calculation: Delay Days = Delay Date - Sanctioned Date
    if (sanctionedDateObj && delayDateObj) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const diffDays = Math.round((delayDateObj.getTime() - sanctionedDateObj.getTime()) / msPerDay);
      rowObj.delayDays = diffDays;
    }

    // Number conversions & checks
    ['landRequired', 'landAcquired', 'compensation', 'compensationPaid', 'compensationPending', 'legalDisputes', 'affectedFamilies'].forEach((field) => {
      if (rowObj[field] !== undefined && rowObj[field] !== '') {
        const num = Number(rowObj[field]);
        if (isNaN(num)) {
          warnings.push(`Row ${rowNum} (${pId}): Non-numeric value for "${field}" ("${rowObj[field]}"). Setting to 0.`);
          rowObj[field] = 0;
        } else {
          rowObj[field] = num;
        }
      }
    });

    ['acquisitionProgress', 'compensationProgress', 'documentationProgress', 'approvalProgress', 'rrProgress', 'stakeholderResponsiveness'].forEach((field) => {
      if (rowObj[field] !== undefined && rowObj[field] !== '') {
        const num = Number(rowObj[field]);
        if (isNaN(num) || num < 0 || num > 100) {
          warnings.push(`Row ${rowNum} (${pId}): Percentage value for "${field}" should be between 0 and 100.`);
          rowObj[field] = Math.max(0, Math.min(100, isNaN(num) ? 50 : num));
        } else {
          rowObj[field] = num;
        }
      }
    });

    parsedProjects.push(rowObj);
  }

  const validCount = parsedProjects.length;
  const errorCount = errors.length;
  const warningCount = warnings.length;

  return {
    isValid: validCount > 0 && errorCount === 0,
    totalRows: lines.length - 1,
    validCount,
    columnCount,
    headers: rawHeaders,
    previewRows: parsedProjects.slice(0, 5),
    errorCount,
    warningCount,
    errors,
    warnings,
    parsedProjects,
  };
}

/**
 * Universal File to CSV converter supporting Excel (.xlsx, .xls) and CSV (.csv, .txt).
 */
export async function parseFileToCsv(file: File): Promise<{
  csvText: string;
  fileName: string;
  fileType: string;
  columnCount: number;
  recordCount: number;
  validation: CsvValidationResult;
}> {
  const isXlsx = file.name.endsWith('.xlsx');
  const isXls = file.name.endsWith('.xls');
  let csvText = '';
  let fileType = 'CSV Document (.csv)';

  if (isXlsx || isXls) {
    fileType = isXlsx ? 'Excel Spreadsheet (.xlsx)' : 'Excel 97-2004 (.xls)';
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
    const sheetName = workbook.SheetNames[0] || 'Sheet1';
    const worksheet = workbook.Sheets[sheetName];
    csvText = XLSX.utils.sheet_to_csv(worksheet, { dateNF: 'yyyy-mm-dd' });
  } else {
    csvText = await file.text();
    if (file.name.endsWith('.txt')) {
      fileType = 'Text CSV (.txt)';
    }
  }

  const validation = validateAndParseCsv(csvText);

  return {
    csvText,
    fileName: file.name,
    fileType,
    columnCount: validation.columnCount,
    recordCount: validation.validCount,
    validation,
  };
}
