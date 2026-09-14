import React from 'react';
import { 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  RotateCcw, 
  X, 
  Filter
} from 'lucide-react';

export type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth' | 'custom';

interface ReportFiltersProps {
  title?: string;
  subtitle?: string;
  datePreset: DatePreset;
  setDatePreset?: (preset: DatePreset) => void;
  onPresetChange?: (preset: DatePreset) => void;
  startDate: string;
  setStartDate?: (date: string) => void;
  onStartDateChange?: (date: string) => void;
  endDate: string;
  setEndDate?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onSearchQueryChange?: (query: string) => void;
  searchPlaceholder?: string;
  totalRecords?: number;
  onExportCsv?: () => void;
  onPrint?: () => void;
  onResetFilters?: () => void;
  children?: React.ReactNode; // Filter for row 3 (2: Shift)
  topRightControl?: React.ReactNode; // Filter for dedicated row 2 (1: Staff, right above 2)
  bottomControl?: React.ReactNode; // Filter for dedicated row 4 (3: Sort By, right below 2)
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  title,
  subtitle,
  datePreset,
  setDatePreset,
  onPresetChange,
  startDate,
  setStartDate,
  onStartDateChange,
  endDate,
  setEndDate,
  onEndDateChange,
  searchQuery = '',
  setSearchQuery,
  onSearchQueryChange,
  searchPlaceholder = 'Search records, items, vouchers, parties...',
  totalRecords,
  onExportCsv,
  onPrint,
  onResetFilters,
  children,
  topRightControl,
  bottomControl
}) => {
  const updatePreset = onPresetChange || setDatePreset || (() => {});
  const updateStartDate = onStartDateChange || setStartDate || (() => {});
  const updateEndDate = onEndDateChange || setEndDate || (() => {});
  const updateSearchQuery = onSearchQueryChange || setSearchQuery || (() => {});

  const handlePresetClick = (preset: DatePreset) => {
    updatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      updateStartDate('');
      updateEndDate('');
    } else if (preset === 'today') {
      updateStartDate(todayStr);
      updateEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      updateStartDate(yestStr);
      updateEndDate(yestStr);
    } else if (preset === '7days') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 7);
      updateStartDate(past7.toISOString().split('T')[0]);
      updateEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      updateStartDate(firstDay);
      updateEndDate(todayStr);
    } else if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      updateStartDate(firstDayLastMonth);
      updateEndDate(lastDayLastMonth);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 print:hidden">
      {/* 4: Dedicated Full-Width Row 1 (Period Presets & Action Buttons: Export CSV & Print) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        {/* Date Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold mr-1">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Period:</span>
          </div>

          {[
            { id: 'all', label: 'All-Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: 'Last 7 Days' },
            { id: 'thisMonth', label: 'This Month' },
            { id: 'lastMonth', label: 'Last Month' },
            { id: 'custom', label: 'Custom Range' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handlePresetClick(p.id as DatePreset)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                datePreset === p.id 
                  ? 'bg-teal-700 text-white shadow-xs' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Export CSV & Print */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              title="Reset all filters"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          {onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: (Staff filter on the right, directly above Shift) */}
      {topRightControl && (
        <div className="flex items-center justify-end">
          {topRightControl}
        </div>
      )}

      {/* Row 3: (Left: From, To, Search | Right: Filters: label + Shift) */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* From Date Input */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 w-full sm:w-auto min-w-[145px] shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* To Date Input */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 w-full sm:w-auto min-w-[145px] shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Search Box - Compact Width */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-60 lg:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 1: Filters: label with icon in Row 3 + Shift filter (Right aligned) */}
        {children && (
          <div className="flex items-center gap-2 w-full lg:w-auto self-end lg:self-auto shrink-0">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold shrink-0">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              <span>Filters:</span>
            </div>
            {children}
          </div>
        )}
      </div>

      {/* Row 4: (Left: Showing records badge | Right: 3: Sort By, directly below 2) */}
      {(typeof totalRecords === 'number' || bottomControl) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            {typeof totalRecords === 'number' && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                <span>Showing <strong>{totalRecords}</strong> matching record{totalRecords === 1 ? '' : 's'}</span>
                {(startDate || endDate) && (
                  <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border border-teal-200">
                    {startDate || 'Beginning'} &rarr; {endDate || 'Today'}
                  </span>
                )}
                {searchQuery && (
                  <span className="text-amber-700 font-medium ml-1">
                    • Filtered by &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </>
            )}
          </div>

          {/* 3: Sort By Control in Row 4 (Right aligned, directly below 2) */}
          {bottomControl && (
            <div className="self-end sm:self-auto shrink-0">
              {bottomControl}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const exportCsvHelper = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => 
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
