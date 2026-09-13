import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { parseFileToCsv } from '../../utils/csvParser';
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sparkles,
  Download,
} from 'lucide-react';

export const CsvUploadModal: React.FC = () => {
  const {
    isCsvModalOpen,
    setIsCsvModalOpen,
    validateCsvFile,
    uploadCsvData,
    setActiveTab,
  } = useApp();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    name: string;
    fileType: string;
    recordCount: number;
    columnCount: number;
    isValid: boolean;
    previewRows: any[];
  } | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCsvModalOpen) return null;

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedFileMeta(null);
    setFileContent('');
    setValidationErrors([]);
    setIsProcessing(false);
    setIsCsvModalOpen(false);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setValidationErrors([]);
    setIsProcessing(true);

    try {
      const parsed = await parseFileToCsv(file);
      setFileContent(parsed.csvText);
      setSelectedFileMeta({
        name: parsed.fileName,
        fileType: parsed.fileType,
        recordCount: parsed.recordCount,
        columnCount: parsed.columnCount,
        isValid: parsed.validation.isValid,
        previewRows: parsed.validation.previewRows,
      });

      if (!parsed.validation.isValid) {
        setValidationErrors(
          parsed.validation.errors.length > 0
            ? parsed.validation.errors
            : ['Invalid dataset format. Please verify required column headers.']
        );
      }
    } catch (err: any) {
      setValidationErrors([err?.message || 'Failed to read and parse file. Please try again.']);
      setSelectedFileMeta(null);
      setFileContent('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validExtensions = ['.csv', '.xlsx', '.xls', '.txt'];
      if (validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        processFile(file);
      } else {
        setValidationErrors(['Please upload a valid Excel (.xlsx, .xls) or CSV (.csv, .txt) file.']);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = () => {
    if (!fileContent || !selectedFile) {
      setValidationErrors(['No file content loaded.']);
      return;
    }

    setIsProcessing(true);
    setValidationErrors([]);

    const validation = validateCsvFile(fileContent);

    if (!validation.isValid) {
      setIsProcessing(false);
      setValidationErrors(
        validation.errors.length > 0
          ? validation.errors
          : ['Invalid CSV format. Please verify required column headers.']
      );
      return;
    }

    setTimeout(() => {
      const result = uploadCsvData(fileContent, selectedFile.name);
      setIsProcessing(false);

      if (result.success) {
        handleClose();
        setActiveTab('dashboard');
      } else {
        setValidationErrors(result.errors || ['Error uploading dataset.']);
      }
    }, 400);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'Project ID,Project Name,District,Status,Sanctioned Date,Delay Date,Expected_Risk,Land Required,Land Acquired,Acquisition Progress,Compensation,Compensation Paid,Compensation Pending,Legal Disputes,Latitude,Longitude\n' +
      'LA-101,Chennai Port - Maduravoyal Elevated Corridor,Chennai,Compensation,2024-01-01,2024-07-01,HIGH,142.5,98.2,69,425000000,310000000,115000000,8,13.0827,80.2707\n' +
      'LA-102,Coimbatore Western Ring Road Phase II,Coimbatore,Compensation,2024-02-15,2024-08-15,HIGH,184.6,101.5,55,512000000,281600000,230400000,16,11.0168,76.9558\n' +
      'LA-106,Thanjavur Smart Agro Processing Corridor,Thanjavur,Completed,2023-05-10,2023-08-10,LOW,61.7,61.7,100,145000000,145000000,0,0,10.7870,79.1378\n' +
      'LA-107,Tiruppur Export Industrial Link Highway,Tiruppur,Possession,2024-03-01,2024-06-01,MEDIUM,84.0,75.6,90,220000000,198000000,22000000,2,11.1085,77.3411\n' +
      'LA-108,Erode Dairy Logistics Bypass Corridor,Erode,Notification,2024-01-10,2024-09-10,HIGH,95.2,19.0,20,180000000,36000000,144000000,5,11.3410,77.7172\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'land_acquisition_projects_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 overflow-hidden">
      {/* Upload Panel Modal: Controlled height 85vh, overflow hidden, no horizontal scroll */}
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden overflow-x-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gov-navy text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading">
                Upload Project Dataset
              </h3>
              <p className="text-xs text-slate-300">
                Excel (.xlsx, .xls) and CSV datasets supported
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body: max-height 50vh, only this section scrolls */}
        <div
          className="p-5 sm:p-6 overflow-y-auto overflow-x-hidden space-y-4 flex-1"
          style={{ maxHeight: '50vh' }}
        >
          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50/70'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls, .txt"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900">
                {selectedFile ? (
                  <span>Selected: <span className="text-blue-600 underline">{selectedFile.name}</span></span>
                ) : (
                  <>Drop your Excel or CSV file here, or <span className="text-blue-600 underline">Browse</span></>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Supports Excel (.xlsx, .xls) and CSV (.csv, .txt) format
              </p>
            </div>
          </div>

          {/* Compact Dataset Summary Card */}
          {selectedFileMeta && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      selectedFileMeta.isValid ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Dataset Ready
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded font-mono ${
                    selectedFileMeta.isValid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {selectedFileMeta.isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">File</div>
                  <div
                    className="font-semibold text-slate-800 truncate text-xs mt-0.5"
                    title={selectedFileMeta.name}
                  >
                    {selectedFileMeta.name}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">File Type</div>
                  <div className="font-semibold text-slate-700 text-xs mt-0.5">
                    {selectedFileMeta.fileType}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Records</div>
                  <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">
                    {selectedFileMeta.recordCount}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Columns</div>
                  <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">
                    {selectedFileMeta.columnCount}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-xs text-red-800">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Dataset Validation Issue</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-red-700 text-[11px]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dataset Preview: ONLY First 5 Rows in a proper table */}
          {selectedFileMeta && selectedFileMeta.previewRows.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Dataset Preview (First {selectedFileMeta.previewRows.length} Rows):
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedFileMeta.recordCount} total rows in file
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
                      <th className="px-3 py-2 font-semibold">Sanctioned Date</th>
                      <th className="px-3 py-2 font-semibold">Delay Date</th>
                      <th className="px-3 py-2 font-semibold text-right">Delay Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedFileMeta.previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-1.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {row.projectId || '-'}
                        </td>
                        <td
                          className="px-3 py-1.5 font-medium text-slate-900 max-w-[150px] truncate"
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
                        <td className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">
                          {row.sanctionedDate || '-'}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">
                          {row.delayDate || '-'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                          {row.delayDays !== undefined ? `${row.delayDays} days` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-slate-400 text-right">
                Showing first {selectedFileMeta.previewRows.length} of {selectedFileMeta.recordCount} records.
              </div>
            </div>
          )}

          {/* Required Fields Guide */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>Required Columns:</span>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 text-[11px] underline cursor-pointer"
              >
                <Download className="w-3 h-3" /> Download Sample CSV
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-slate-700 text-[11px]">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Project ID</strong></span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Project Name</strong></span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>District / State</strong></span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Status</strong></span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Sanctioned Date</strong></span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Delay Date</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Action Buttons Footer: Always visible & reachable */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedFile || isProcessing || (selectedFileMeta !== null && !selectedFileMeta.isValid)}
            onClick={handleUploadSubmit}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
              selectedFile && !isProcessing && (selectedFileMeta === null || selectedFileMeta.isValid)
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing Dataset...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Submit / Analyze Dataset</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
