import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CsvValidationResult, parseFileToCsv } from '../utils/csvParser';
import {
  Database,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Trash2,
  Sparkles,
  ArrowRight,
  Calendar,
  Clock,
  Download,
  FileCheck,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Check,
  Layers,
} from 'lucide-react';

export const DataManagementPage: React.FC = () => {
  const {
    currentProjects,
    validateCsvFile,
    uploadCsvData,
    uploadHistory,
    returnToLiveData,
    dataSource,
    sourceFileName,
    showToast,
    setActiveTab,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard Steps: 'idle' | 'selected' | 'validated' | 'analysing' | 'completed'
  const [wizardStep, setWizardStep] = useState<'idle' | 'selected' | 'validated' | 'analysing' | 'completed'>('idle');

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    fileType: string;
    size: string;
    rawContent: string;
    lineCount: number;
    columnCount: number;
  } | null>(null);

  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);

  const [assessmentSummary, setAssessmentSummary] = useState<{
    totalProcessed: number;
    updatedCount: number;
    addedCount: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
  } | null>(null);

  // 1. File Selection Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeKb = Math.max(1, Math.round(file.size / 1024));

      try {
        const parsed = await parseFileToCsv(file);
        setSelectedFile({
          name: parsed.fileName,
          fileType: parsed.fileType,
          size: `${sizeKb} KB`,
          rawContent: parsed.csvText,
          lineCount: parsed.recordCount,
          columnCount: parsed.columnCount,
        });
        setValidationResult(parsed.validation);
        setWizardStep('validated');
      } catch (err: any) {
        showToast(err?.message || 'Error reading dataset file', 'error');
      }
      e.target.value = '';
    }
  };

  // 2. Validate Data Handler (Requirement 11)
  const handleValidateData = () => {
    if (!selectedFile) return;
    const result = validateCsvFile(selectedFile.rawContent);
    setValidationResult(result);
    setWizardStep('validated');
  };

  // 3. Run Risk Assessment & Dataset Application Handler (Requirement 11, 14, 15)
  const handleRunAssessment = () => {
    if (!validationResult || !selectedFile) return;

    setWizardStep('analysing');

    setTimeout(() => {
      const result = uploadCsvData(selectedFile.rawContent, selectedFile.name);
      if (result.success) {
        const total = result.count || validationResult.validCount;
        const high = currentProjects.filter((p) => p.hasRiskAssessment && p.riskLevel === 'HIGH').length;
        const med = currentProjects.filter((p) => p.hasRiskAssessment && p.riskLevel === 'MEDIUM').length;
        const low = currentProjects.filter((p) => p.hasRiskAssessment && p.riskLevel === 'LOW').length;

        setAssessmentSummary({
          totalProcessed: total,
          updatedCount: total,
          addedCount: 0,
          highRiskCount: high,
          mediumRiskCount: med,
          lowRiskCount: low,
        });
        setWizardStep('completed');
      } else {
        showToast(result.errors?.[0] || 'Error processing CSV dataset', 'error');
        setWizardStep('validated');
      }
    }, 500);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setAssessmentSummary(null);
    setWizardStep('idle');
  };

  // Download Sample Land-Acquisition CSV matching Live PPPIN Projects
  const handleDownloadTemplate = () => {
    const csvContent =
      'Project ID,Project Name,District,Status,Sanctioned Date,Delay Date,Land Required,Land Acquired,Acquisition Progress,Compensation,Compensation Paid,Compensation Pending,Legal Disputes,Documentation Progress,Approval Progress,R&R Progress,Stakeholder Responsiveness\n' +
      'PPPIN-TN-001,Chennai Koyambedu Four Laning Expressway Corridor (Phase 2),Chennai,Compensation,2024-01-01,2024-07-01,145.0,72.5,50,420000000,210000000,210000000,16,55,48,40,42\n' +
      'PPPIN-TN-002,Chennai Minjur State Highway Bypass & Elevated Corridor (Phase 3),Chennai,Legal / R&R,2024-02-15,2024-08-15,110.0,44.0,40,310000000,124000000,186000000,18,60,50,35,38\n' +
      'PPPIN-TN-003,Chennai Nerkundram Container & Bulk Cargo Terminal DBFOT (Phase 1),Chennai,Compensation,2023-05-10,2023-11-10,85.0,51.0,60,250000000,150000000,100000000,6,70,65,55,60\n' +
      'PPPIN-TN-004,Chengalpattu Alathur Dedicated Coastal Freight Railway Siding (Phase 2),Chengalpattu,Documentation,2024-03-01,2024-09-01,125.0,87.5,70,360000000,252000000,108000000,3,75,70,65,70\n' +
      'PPPIN-TN-005,Chengalpattu Vandalur Integrated Bus Terminus & Mobility Hub (Phase 3),Chengalpattu,Approval,2024-01-10,2024-05-10,60.0,48.0,80,180000000,144000000,36000000,1,85,80,75,85\n' +
      'NEW-LA-TN-01,Madurai Ring Road Elevated Corridor Phase IV,Madurai,Compensation,2024-02-01,2024-08-01,95.0,38.0,40,290000000,116000000,174000000,14,50,45,40,45\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tamil_nadu_land_acquisition_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sample land-acquisition matching CSV downloaded.', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Data Management & Ingestion Studio
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Upload the latest land acquisition project data to update monitored projects.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Template</span>
          </button>
          {dataSource === 'Uploaded CSV' && (
            <button
              onClick={returnToLiveData}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-300 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Return to Live Feed</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Upload Project Data Wizard */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 flex flex-col overflow-hidden overflow-x-hidden"
            style={{ maxHeight: '85vh' }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Upload Project Data</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Excel (.xlsx, .xls) and CSV datasets supported
                </p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono border border-slate-200">
                Active Source: {dataSource}
              </span>
            </div>

            {/* Step 1: Idle Browse State */}
            {wizardStep === 'idle' && (
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center transition-colors bg-slate-50/60 space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Upload land acquisition dataset file
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Supported: Excel (.xlsx, .xls) and CSV (.csv, .txt). The uploaded file will be validated and analyzed dynamically.
                  </p>
                </div>

                <div className="flex justify-center pt-2">
                  <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm">
                    <Upload className="w-4 h-4" />
                    <span>Browse File</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls, .txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="text-[11px] text-slate-400 font-medium">
                  Required columns: Project ID, Project Name, District / State, Status, Sanctioned Date, Delay Date
                </div>
              </div>
            )}

            {/* Step 2 & 3: Validated Report View with Compact Summary & 5-row Preview */}
            {wizardStep === 'validated' && validationResult && selectedFile && (
              <div className="flex flex-col flex-1 overflow-hidden overflow-x-hidden space-y-4 animate-in fade-in">
                {/* Scrollable Content: max-height 50vh */}
                <div
                  className="space-y-4 overflow-y-auto overflow-x-hidden pr-1 flex-1"
                  style={{ maxHeight: '50vh' }}
                >
                  {/* Compact Dataset Ready Summary Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            validationResult.isValid ? 'text-emerald-600' : 'text-red-500'
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Dataset Ready
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded font-mono ${
                          validationResult.isValid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {validationResult.isValid ? 'Valid' : 'Validation Failed'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">File</div>
                        <div
                          className="font-semibold text-slate-800 truncate text-xs mt-0.5"
                          title={selectedFile.name}
                        >
                          {selectedFile.name}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">File Type</div>
                        <div className="font-semibold text-slate-700 text-xs mt-0.5">
                          {selectedFile.fileType}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Records</div>
                        <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">
                          {selectedFile.lineCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Columns</div>
                        <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">
                          {selectedFile.columnCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Valid Records</span>
                      <span className="text-base font-black text-emerald-700 font-mono">
                        {validationResult.validCount}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Warnings</span>
                      <span className="text-base font-black text-amber-700 font-mono">
                        {validationResult.warningCount}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Errors</span>
                      <span className="text-base font-black text-red-700 font-mono">
                        {validationResult.errorCount}
                      </span>
                    </div>
                  </div>

                  {/* Errors List */}
                  {validationResult.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1">
                      <div className="font-bold text-red-900 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>Validation Errors:</span>
                      </div>
                      <ul className="list-disc list-inside text-red-700 space-y-0.5 text-[11px]">
                        {validationResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings List */}
                  {validationResult.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1 max-h-28 overflow-y-auto">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Notices & Warnings ({validationResult.warnings.length}):</span>
                      </div>
                      <ul className="list-disc list-inside text-amber-800 space-y-0.5 text-[11px]">
                        {validationResult.warnings.slice(0, 5).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                        {validationResult.warnings.length > 5 && (
                          <li className="italic">+{validationResult.warnings.length - 5} more warnings handled.</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Dataset Preview: ONLY First 5 Rows in a proper table */}
                  {validationResult.previewRows && validationResult.previewRows.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          Dataset Preview (First {validationResult.previewRows.length} Rows):
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {selectedFile.lineCount} total rows in file
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-full">
                        <table className="w-full text-[11px] text-left border-collapse">
                          <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Project ID</th>
                              <th className="px-3 py-2 font-semibold">Project Name</th>
                              <th className="px-3 py-2 font-semibold">District</th>
                              <th className="px-3 py-2 font-semibold">Status</th>
                              <th className="px-3 py-2 font-semibold text-right">Progress</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {validationResult.previewRows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-1.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                                  {row.projectId || '-'}
                                </td>
                                <td
                                  className="px-3 py-1.5 font-medium text-slate-900 max-w-[180px] truncate"
                                  title={row.projectName}
                                >
                                  {row.projectName || '-'}
                                </td>
                                <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">
                                  {row.district || '-'}
                                </td>
                                <td className="px-3 py-1.5 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {row.status || 'Compensation'}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                                  {row.acquisitionProgress !== undefined && row.acquisitionProgress !== null && row.acquisitionProgress !== ''
                                    ? `${row.acquisitionProgress}%`
                                    : 'Not Available'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        Showing first {validationResult.previewRows.length} of {selectedFile.lineCount} records.
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Action Buttons at bottom of panel: Always visible & reachable */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 shrink-0 sticky bottom-0 bg-white z-10">
                  <button
                    onClick={handleReset}
                    className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleRunAssessment}
                    disabled={!validationResult.isValid}
                    className={`px-5 py-2.5 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all ${
                      validationResult.isValid
                        ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Submit / Analyze Dataset</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Analysing updated project data State (Requirement 14) */}
            {wizardStep === 'analysing' && (
              <div className="p-10 text-center space-y-3 animate-in fade-in">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-sm font-bold text-slate-800">
                  Analysing updated project data...
                </div>
                <p className="text-xs text-slate-500">
                  Matching project identifiers, calculating multi-factor delay risks, and updating central project store.
                </p>
              </div>
            )}

            {/* Step 5: Risk Assessment Completed (Requirement 14 & 15) */}
            {wizardStep === 'completed' && assessmentSummary && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Risk Assessment Completed</span>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Projects Processed</span>
                      <span className="text-base font-black text-slate-900 font-mono">
                        {assessmentSummary.totalProcessed}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-blue-600 font-bold uppercase block">Projects Updated</span>
                      <span className="text-base font-black text-blue-700 font-mono">
                        {assessmentSummary.updatedCount}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-emerald-600 font-bold uppercase block">Projects Added</span>
                      <span className="text-base font-black text-emerald-700 font-mono">
                        {assessmentSummary.addedCount}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-red-700 font-bold uppercase block">High Risk</span>
                      <span className="text-base font-black text-red-700 font-mono">
                        {assessmentSummary.highRiskCount}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-amber-800 font-bold uppercase block">Medium Risk</span>
                      <span className="text-base font-black text-amber-800 font-mono">
                        {assessmentSummary.mediumRiskCount}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-bold uppercase block">Low Risk</span>
                      <span className="text-base font-black text-emerald-800 font-mono">
                        {assessmentSummary.lowRiskCount}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-800 pt-1">
                    Central project dataset has been synchronized. All dashboard metrics, GIS maps, project tables, and reports are now dynamically updated.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleReset}
                    className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    Upload Another File
                  </button>

                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span>View Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Previous Uploads History (Requirement 24) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Previous Uploads</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit history of ingested CSV datasets
              </p>
            </div>

            {uploadHistory.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1">
                {uploadHistory.map((item) => (
                  <div key={item.id} className="py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {item.fileName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{item.uploadDate}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>{item.records}</strong> records • <strong>{item.updatedCount}</strong> updated • <strong>{item.addedCount}</strong> added
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-700">No previous CSV uploads recorded yet</div>
                <p className="text-[11px] text-slate-400">Upload a project CSV file to begin tracking.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
