import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  FileCheck, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { readSpreadsheetFile } from '../../utils/excelUtils';

interface ExcelImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  templateFileName: string;
  onDownloadTemplate: () => void;
  parser: (rawRows: any[]) => { items: T[]; errors: string[]; newDepartments?: string[]; newCategories?: string[]; newVendors?: string[] };
  onImport: (items: T[], overwrite: boolean, extraData?: { newDepartments?: string[]; newCategories?: string[]; newVendors?: string[] }) => { added: number; updated: number };
  previewColumns: { key: keyof T | string; label: string; render?: (item: T) => React.ReactNode }[];
  itemTypeLabel: string;
}

export function ExcelImportModal<T extends { id?: number; name?: string }>({
  isOpen,
  onClose,
  title,
  subtitle,
  templateFileName,
  onDownloadTemplate,
  parser,
  onImport,
  previewColumns,
  itemTypeLabel
}: ExcelImportModalProps<T>) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<{
    items: T[];
    errors: string[];
    newDepartments?: string[];
    newCategories?: string[];
    newVendors?: string[];
  } | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [importSummary, setImportSummary] = useState<{ added: number; updated: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsLoading(true);
    setImportSummary(null);

    try {
      const rawRows = await readSpreadsheetFile(selectedFile);
      if (rawRows.length === 0) {
        setParseResult({
          items: [],
          errors: ['The selected file is empty or has no readable tabular data.'],
        });
      } else {
        const result = parser(rawRows);
        setParseResult(result);
      }
    } catch (err: any) {
      setParseResult({
        items: [],
        errors: [`Failed to read Excel file: ${err?.message || 'Invalid format'}`],
      });
    } finally {
      setIsLoading(false);
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
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.items.length === 0) return;
    const summary = onImport(parseResult.items, overwrite, {
      newDepartments: parseResult.newDepartments,
      newCategories: parseResult.newCategories,
      newVendors: parseResult.newVendors
    });
    setImportSummary(summary);
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500 text-white rounded-full font-bold">.XLS / .XLSX</span>
              </h3>
              <p className="text-xs text-slate-300 font-medium">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {/* Template Download & Help Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-indigo-950">Need the correct Excel format template?</div>
                <div className="text-[11px] text-indigo-700">Download the pre-structured Excel sample template with instructions and column headers.</div>
              </div>
            </div>

            <button
              onClick={onDownloadTemplate}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Sample</span>
            </button>
          </div>

          {/* Success Summary View */}
          {importSummary ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-emerald-950">Import Successful!</h4>
                <p className="text-xs text-emerald-700 font-medium mt-1">
                  Successfully imported {importSummary.added + importSummary.updated} {itemTypeLabel}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-center">
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <div className="text-xs font-bold text-slate-500 uppercase">New Added</div>
                  <div className="text-xl font-black text-emerald-600">{importSummary.added}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <div className="text-xs font-bold text-slate-500 uppercase">Updated / Matched</div>
                  <div className="text-xl font-black text-indigo-600">{importSummary.updated}</div>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
                >
                  Import Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Upload Dropzone */}
              {!parseResult ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                    dragActive
                      ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]'
                      : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl mb-3 border border-emerald-100">
                    <Upload className="w-8 h-8" />
                  </div>

                  <div className="font-extrabold text-slate-900 text-sm">
                    {isLoading ? 'Processing Excel File...' : 'Click to select or drag & drop Excel file here'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) spreadsheets
                  </p>
                </div>
              ) : (
                /* Parsed Preview Section */
                <div className="space-y-4">
                  {/* File Info Bar */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-xs text-slate-900">{file?.name}</span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          ({parseResult.items.length} {itemTypeLabel} detected)
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleReset}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Errors / Warnings */}
                  {parseResult.errors.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Warnings / Skipped entries:</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                        {parseResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {parseResult.errors.length > 5 && (
                          <li>...and {parseResult.errors.length - 5} more skipped rows</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="p-3 bg-slate-100/70 border-b border-slate-200 text-xs font-extrabold text-slate-700 flex items-center justify-between">
                      <span>Data Preview (First {Math.min(parseResult.items.length, 6)} of {parseResult.items.length} items)</span>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Verify before import</span>
                    </div>

                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                          <tr>
                            {previewColumns.map((col, idx) => (
                              <th key={idx} className="py-2.5 px-3">{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parseResult.items.slice(0, 8).map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              {previewColumns.map((col, cIdx) => (
                                <td key={cIdx} className="py-2 px-3 text-slate-800 font-medium">
                                  {col.render ? col.render(item) : String((item as any)[col.key] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Import Configuration Checkbox */}
                  <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={overwrite}
                        onChange={(e) => setOverwrite(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span>Update existing items if matching ID or Item Name is found</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {overwrite ? 'Auto-Update enabled' : 'Always append new'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        {!importSummary && (
          <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>

            {parseResult && parseResult.items.length > 0 && (
              <button
                onClick={handleConfirmImport}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition cursor-pointer"
              >
                <span>Import {parseResult.items.length} {itemTypeLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
