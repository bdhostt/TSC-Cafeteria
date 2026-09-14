import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { ReportFilters, DatePreset, exportCsvHelper } from './ReportFilters';
import { 
  ShoppingCart, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  FileText, 
  UserCheck, 
  CreditCard, 
  ChevronRight,
  TrendingDown,
  Building2,
  Calendar
} from 'lucide-react';

interface SubReportProps {
  reportType: 'supplier-po' | 'supplier-grn' | 'supplier-returns' | 'all-purchases' | 'vendor-statement';
}

export const ProcurementReports: React.FC<SubReportProps> = ({ reportType }) => {
  const { data } = useRestaurant();

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('ALL');

  // Date filter helper
  const matchesDate = (itemDate: string) => {
    if (!itemDate) return true;
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  };

  // --- 4. SUPPLIER WISE TOTAL PO ---
  const supplierPoSummary = useMemo(() => {
    const poList = data.purchaseOrders || [];
    const vendorMap: Record<string, {
      vendor: string;
      poCount: number;
      totalPoValue: number;
      fulfilledValue: number;
      pendingValue: number;
      poList: typeof poList;
    }> = {};

    // Initialize for all known vendors
    data.vendors.forEach(v => {
      vendorMap[v] = {
        vendor: v,
        poCount: 0,
        totalPoValue: 0,
        fulfilledValue: 0,
        pendingValue: 0,
        poList: []
      };
    });

    poList.forEach(po => {
      if (!matchesDate(po.date)) return;
      if (!vendorMap[po.vendor]) {
        vendorMap[po.vendor] = {
          vendor: po.vendor,
          poCount: 0,
          totalPoValue: 0,
          fulfilledValue: 0,
          pendingValue: 0,
          poList: []
        };
      }

      vendorMap[po.vendor].poCount += 1;
      vendorMap[po.vendor].totalPoValue += po.total;
      vendorMap[po.vendor].poList.push(po);

      if (po.status === 'FULFILLED') {
        vendorMap[po.vendor].fulfilledValue += po.total;
      } else if (po.status === 'PARTIALLY_RECEIVED') {
        // e.g. 60% fulfilled
        vendorMap[po.vendor].fulfilledValue += Math.round(po.total * 0.65);
        vendorMap[po.vendor].pendingValue += Math.round(po.total * 0.35);
      } else if (po.status === 'PENDING') {
        vendorMap[po.vendor].pendingValue += po.total;
      }
    });

    const result = Object.values(vendorMap).filter(row => {
      if (selectedVendor !== 'ALL' && row.vendor !== selectedVendor) return false;
      if (!searchQuery) return true;
      return row.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return result.sort((a, b) => b.totalPoValue - a.totalPoValue);
  }, [data.purchaseOrders, data.vendors, selectedVendor, startDate, endDate, searchQuery]);

  // --- 5. SUPPLIER WISE GRN REPORT ---
  const supplierGrnData = useMemo(() => {
    const grnRows: Array<{
      date: string;
      billNo: string;
      vendor: string;
      itemsCount: number;
      itemsSummary: string;
      total: number;
      paymentType: string;
      status: string;
    }> = [];

    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      if (!matchesDate(p.date)) return;
      if (selectedVendor !== 'ALL' && p.vendor !== selectedVendor) return;

      const summary = p.items.map(i => `${i.item} (${i.qty} ${i.uom})`).join(', ');

      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        p.billNo.toLowerCase().includes(query) ||
        p.vendor.toLowerCase().includes(query) ||
        summary.toLowerCase().includes(query);

      if (matchesSearch) {
        grnRows.push({
          date: p.date,
          billNo: p.billNo,
          vendor: p.vendor,
          itemsCount: p.items.length,
          itemsSummary: summary,
          total: p.total,
          paymentType: p.paymentType,
          status: p.status
        });
      }
    });

    return grnRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.purchases, selectedVendor, startDate, endDate, searchQuery]);

  // --- 6. SUPPLIER WISE RETURN REPORT ---
  const supplierReturnsData = useMemo(() => {
    const returnList = data.purchaseReturns || [];
    return returnList.filter(ret => {
      if (!matchesDate(ret.date)) return false;
      if (selectedVendor !== 'ALL' && ret.vendor !== selectedVendor) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        ret.returnNo.toLowerCase().includes(q) ||
        ret.vendor.toLowerCase().includes(q) ||
        ret.item.toLowerCase().includes(q) ||
        ret.reason.toLowerCase().includes(q) ||
        (ret.billNo && ret.billNo.toLowerCase().includes(q))
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.purchaseReturns, selectedVendor, startDate, endDate, searchQuery]);

  // --- 7. ALL REPORTS OF PURCHASE (CONSOLIDATED PURCHASE REGISTER) ---
  const allPurchasesData = useMemo(() => {
    return data.purchases.filter(p => {
      if (!matchesDate(p.date)) return false;
      if (selectedVendor !== 'ALL' && p.vendor !== selectedVendor) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const itemsStr = p.items.map(i => `${i.item} ${i.category}`).join(' ');
      return (
        p.billNo.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        p.paymentType.toLowerCase().includes(q) ||
        itemsStr.toLowerCase().includes(q)
      );
    }).map(p => {
      const paid = p.paid ?? (p.paymentType === 'CASH' ? p.total : 0);
      const due = Math.max(0, p.total - paid);
      return {
        ...p,
        paid,
        due
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.purchases, selectedVendor, startDate, endDate, searchQuery]);

  // --- 8. VENDOR REPORT (VENDOR 360° STATEMENT & LEDGER) ---
  const vendorStatementData = useMemo(() => {
    const map: Record<string, {
      vendor: string;
      totalBillsCount: number;
      totalInvoiced: number;
      totalPaid: number;
      outstandingDue: number;
      bills: Array<{ billNo: string; date: string; total: number; paid: number; due: number; status: string }>;
      payments: Array<{ id: number; date: string; amount: number; method: string; note?: string }>;
    }> = {};

    data.vendors.forEach(v => {
      map[v] = {
        vendor: v,
        totalBillsCount: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        outstandingDue: 0,
        bills: [],
        payments: []
      };
    });

    // Invoices
    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      if (!matchesDate(p.date)) return;
      if (!map[p.vendor]) {
        map[p.vendor] = {
          vendor: p.vendor,
          totalBillsCount: 0,
          totalInvoiced: 0,
          totalPaid: 0,
          outstandingDue: 0,
          bills: [],
          payments: []
        };
      }
      const paid = p.paid ?? (p.paymentType === 'CASH' ? p.total : 0);
      const due = Math.max(0, p.total - paid);

      map[p.vendor].totalBillsCount += 1;
      map[p.vendor].totalInvoiced += p.total;
      map[p.vendor].totalPaid += paid;
      map[p.vendor].outstandingDue += due;

      map[p.vendor].bills.push({
        billNo: p.billNo,
        date: p.date,
        total: p.total,
        paid,
        due,
        status: due === 0 ? 'SETTLED' : (paid > 0 ? 'PARTIAL' : 'UNPAID')
      });
    });

    // Payments
    data.payments.forEach(pay => {
      if (!matchesDate(pay.date)) return;
      if (map[pay.vendor]) {
        map[pay.vendor].payments.push({
          id: pay.id,
          date: pay.date,
          amount: pay.amount,
          method: pay.method,
          note: pay.note
        });
      }
    });

    const result = Object.values(map).filter(row => {
      if (selectedVendor !== 'ALL' && row.vendor !== selectedVendor) return false;
      if (!searchQuery) return true;
      return row.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return result.sort((a, b) => b.outstandingDue - a.outstandingDue);
  }, [data.purchases, data.payments, data.vendors, selectedVendor, startDate, endDate, searchQuery]);

  // Export CSV Handlers
  const handleExportPo = () => {
    const headers = ['Vendor Name', 'Total POs', 'Total PO Value (৳)', 'Fulfilled Value (৳)', 'Pending Delivery (৳)', 'Completion Rate %'];
    const rows = supplierPoSummary.map(r => [
      r.vendor,
      r.poCount,
      r.totalPoValue,
      r.fulfilledValue,
      r.pendingValue,
      r.totalPoValue > 0 ? `${Math.round((r.fulfilledValue / r.totalPoValue) * 100)}%` : '0%'
    ]);
    exportCsvHelper('supplier_wise_total_po', headers, rows);
  };

  const handleExportGrn = () => {
    const headers = ['Date', 'GRN / Bill No', 'Supplier', 'Items Count', 'Summary of Items', 'Total Value (৳)', 'Payment Terms', 'Status'];
    const rows = supplierGrnData.map(r => [
      r.date,
      r.billNo,
      r.vendor,
      r.itemsCount,
      r.itemsSummary,
      r.total,
      r.paymentType,
      r.status
    ]);
    exportCsvHelper('supplier_wise_grn_report', headers, rows);
  };

  const handleExportReturns = () => {
    const headers = ['Date', 'Return / Memo No', 'Supplier', 'Bill Ref', 'Raw Material', 'Qty', 'UoM', 'Rate (৳)', 'Credit Value (৳)', 'Reason', 'Status'];
    const rows = supplierReturnsData.map(r => [
      r.date,
      r.returnNo,
      r.vendor,
      r.billNo || '-',
      r.item,
      r.qty,
      r.uom,
      r.rate,
      r.total,
      r.reason,
      r.refundStatus
    ]);
    exportCsvHelper('supplier_wise_return_report', headers, rows);
  };

  const handleExportPurchases = () => {
    const headers = ['Bill No', 'Date', 'Vendor', 'Items Details', 'Total Amount (৳)', 'Paid Amount (৳)', 'Due Amount (৳)', 'Payment Mode', 'Status'];
    const rows = allPurchasesData.map(r => [
      r.billNo,
      r.date,
      r.vendor,
      r.items.map(i => `${i.item} x${i.qty}`).join('; '),
      r.total,
      r.paid,
      r.due,
      r.paymentType,
      r.status
    ]);
    exportCsvHelper('consolidated_purchase_register', headers, rows);
  };

  const handleExportVendorStatement = () => {
    const headers = ['Vendor Name', 'Total Bills', 'Total Invoiced (৳)', 'Total Paid (৳)', 'Net Outstanding Due (৳)', 'Status'];
    const rows = vendorStatementData.map(r => [
      r.vendor,
      r.totalBillsCount,
      r.totalInvoiced,
      r.totalPaid,
      r.outstandingDue,
      r.outstandingDue === 0 ? 'Clear / Settled' : 'Payable Due'
    ]);
    exportCsvHelper('vendor_360_statement', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* 4. SUPPLIER WISE TOTAL PO */}
      {reportType === 'supplier-po' && (
        <>
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search supplier name..."
            totalRecords={supplierPoSummary.length}
            onExportCsv={handleExportPo}
            onPrint={() => window.print()}
            onResetFilters={() => {
              setDatePreset('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
              setSelectedVendor('ALL');
            }}
          >
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Vendor:</span>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Suppliers</option>
                {data.vendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </ReportFilters>

          {/* Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Total Purchase Orders</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {supplierPoSummary.reduce((s, r) => s + r.poCount, 0)} POs
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Raised procurement orders</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Total Committed PO Value</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                ৳{supplierPoSummary.reduce((s, r) => s + r.totalPoValue, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Total authorized order book</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Fulfilled Inward Value</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                ৳{supplierPoSummary.reduce((s, r) => s + r.fulfilledValue, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Stock received in restaurant</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Pending Delivery Value</div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                ৳{supplierPoSummary.reduce((s, r) => s + r.pendingValue, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Awaiting supplier delivery</div>
            </div>
          </div>

          {/* PO Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-teal-600" />
                  <span>Supplier-Wise Total Purchase Orders (PO Summary)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Overview of purchase orders issued, delivered, and pending fulfillment per vendor</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                    <th className="py-3 px-4">Supplier / Vendor Name</th>
                    <th className="py-3 px-4 text-center">Total POs Raised</th>
                    <th className="py-3 px-4 text-right">Total Order Value (৳)</th>
                    <th className="py-3 px-4 text-right">Received / Fulfilled (৳)</th>
                    <th className="py-3 px-4 text-right">Pending Delivery (৳)</th>
                    <th className="py-3 px-4 text-center">Fulfillment Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierPoSummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        No purchase orders found for the active criteria.
                      </td>
                    </tr>
                  ) : (
                    supplierPoSummary.map((row, idx) => {
                      const rate = row.totalPoValue > 0 ? Math.round((row.fulfilledValue / row.totalPoValue) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span>{row.vendor}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {row.poCount} order{row.poCount === 1 ? '' : 's'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ৳{row.totalPoValue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            ৳{row.fulfilledValue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                            ৳{row.pendingValue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full ${rate === 100 ? 'bg-emerald-500' : (rate > 0 ? 'bg-amber-500' : 'bg-slate-300')}`}
                                  style={{ width: `${rate}%` }}
                                ></div>
                              </div>
                              <span className="font-mono text-[11px] font-bold text-slate-600">{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {supplierPoSummary.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td className="py-3 px-4">Total Aggregate Procurement Orders</td>
                      <td className="py-3 px-4 text-center font-mono">
                        {supplierPoSummary.reduce((s, r) => s + r.poCount, 0)} POs
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        ৳{supplierPoSummary.reduce((s, r) => s + r.totalPoValue, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        ৳{supplierPoSummary.reduce((s, r) => s + r.fulfilledValue, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700">
                        ৳{supplierPoSummary.reduce((s, r) => s + r.pendingValue, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {Math.round((supplierPoSummary.reduce((s, r) => s + r.fulfilledValue, 0) / (supplierPoSummary.reduce((s, r) => s + r.totalPoValue, 0) || 1)) * 100)}% Overall
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 5. SUPPLIER WISE GRN REPORT */}
      {reportType === 'supplier-grn' && (
        <>
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search bill no, supplier, items received..."
            totalRecords={supplierGrnData.length}
            onExportCsv={handleExportGrn}
            onPrint={() => window.print()}
            onResetFilters={() => {
              setDatePreset('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
              setSelectedVendor('ALL');
            }}
          >
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Vendor:</span>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Suppliers</option>
                {data.vendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </ReportFilters>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Supplier-Wise Goods Received Note (GRN) Inward Register</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Physical goods verification and receiving vouchers recorded by supplier</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <th className="py-2.5 px-3">GRN / Bill & Date</th>
                    <th className="py-2.5 px-3">Supplier & Terms</th>
                    <th className="py-2.5 px-3">Received Items & Quantities</th>
                    <th className="py-2.5 px-3 text-right">Inward Total (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierGrnData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                        No GRN inward vouchers found matching the active filters.
                      </td>
                    </tr>
                  ) : (
                    supplierGrnData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900">{row.billNo}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{row.date}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{row.vendor}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                              row.paymentType === 'CASH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {row.paymentType}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-teal-100 text-teal-800">
                              {row.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-700 text-[11px]" title={row.itemsSummary}>
                          <div className="line-clamp-1">{row.itemsSummary}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.itemsCount} raw materials</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-xs sm:text-sm">
                          ৳{row.total.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {supplierGrnData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                      <td colSpan={3} className="py-3 px-3">Total Received Goods Valuation</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 text-sm">
                        ৳{supplierGrnData.reduce((s, r) => s + r.total, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 6. SUPPLIER WISE RETURN REPORT */}
      {reportType === 'supplier-returns' && (
        <>
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search return memo, vendor, item, reason..."
            totalRecords={supplierReturnsData.length}
            onExportCsv={handleExportReturns}
            onPrint={() => window.print()}
            onResetFilters={() => {
              setDatePreset('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
              setSelectedVendor('ALL');
            }}
          >
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Vendor:</span>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Suppliers</option>
                {data.vendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </ReportFilters>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>Supplier-Wise Purchase Returns & Debit Notes Report</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Rejected goods, damaged raw material returns, and vendor credit adjustments</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Return / Debit Note #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Bill Ref</th>
                    <th className="py-3 px-4">Item Returned</th>
                    <th className="py-3 px-4 text-right">Return Qty</th>
                    <th className="py-3 px-4 text-right">Rate (৳)</th>
                    <th className="py-3 px-4 text-right">Credit Value (৳)</th>
                    <th className="py-3 px-4">Reason for Return</th>
                    <th className="py-3 px-4 text-center">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierReturnsData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        No purchase returns or debit notes found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    supplierReturnsData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-slate-600">{row.date}</td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-900">{row.returnNo}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{row.vendor}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{row.billNo || '-'}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{row.item}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                          {row.qty} {row.uom}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">৳{row.rate}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                          ৳{row.total.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">{row.reason}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            row.refundStatus === 'REFUNDED' ? 'bg-emerald-100 text-emerald-800' :
                            row.refundStatus === 'ADJUSTED' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {row.refundStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {supplierReturnsData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={7} className="py-3 px-4">Total Purchase Return Credits</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 text-sm">
                        ৳{supplierReturnsData.reduce((s, r) => s + r.total, 0).toLocaleString()}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 7. ALL REPORTS OF PURCHASE (CONSOLIDATED REGISTER) */}
      {reportType === 'all-purchases' && (
        <>
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search bill no, vendor, raw items..."
            totalRecords={allPurchasesData.length}
            onExportCsv={handleExportPurchases}
            onPrint={() => window.print()}
            onResetFilters={() => {
              setDatePreset('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
              setSelectedVendor('ALL');
            }}
          >
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Vendor:</span>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Suppliers</option>
                {data.vendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </ReportFilters>

          {/* Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Gross Purchases</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                ৳{allPurchasesData.reduce((s, r) => s + r.total, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{allPurchasesData.length} purchase vouchers</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Cash Purchases Paid</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                ৳{allPurchasesData.reduce((s, r) => s + r.paid, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Paid at time of inward</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Outstanding Payables</div>
              <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                ৳{allPurchasesData.reduce((s, r) => s + r.due, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Unsettled credit invoices</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Credit Purchases Ratio</div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                {allPurchasesData.reduce((s, r) => s + r.total, 0) > 0 ? `${Math.round((allPurchasesData.reduce((s, r) => s + r.due, 0) / allPurchasesData.reduce((s, r) => s + r.total, 0)) * 100)}%` : '0%'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Percentage on supplier credit</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Consolidated 360° Purchase Register</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Complete register of all raw material inward bills with payment settlement status</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <th className="py-2.5 px-3">Bill No & Date</th>
                    <th className="py-2.5 px-3">Vendor & Status</th>
                    <th className="py-2.5 px-3">Items Summary</th>
                    <th className="py-2.5 px-3 text-right">Bill Total & Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPurchasesData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                        No purchase records found matching the active criteria.
                      </td>
                    </tr>
                  ) : (
                    allPurchasesData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900">{row.billNo}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{row.date}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{row.vendor}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                              row.paymentType === 'CASH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {row.paymentType}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                              row.due === 0 ? 'bg-emerald-100 text-emerald-800' : (row.paid > 0 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800')
                            }`}>
                              {row.due === 0 ? 'PAID' : (row.paid > 0 ? 'PARTIAL' : 'DUE')}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-700 text-[11px]" title={row.items.map(i => `${i.item} (${i.qty} ${i.uom})`).join(', ')}>
                          <div className="line-clamp-1">{row.items.map(i => `${i.item} (x${i.qty})`).join(', ')}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.items.length} line items</div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                            ৳{row.total.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            <span className="text-emerald-700 font-bold">Paid: ৳{row.paid.toLocaleString()}</span>
                            {row.due > 0 && (
                              <span className="text-rose-700 font-black ml-1">Due: ৳{row.due.toLocaleString()}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {allPurchasesData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                      <td colSpan={3} className="py-3 px-3">Total Purchases Register</td>
                      <td className="py-3 px-3 text-right font-mono text-sm">
                        <div className="text-slate-900 font-black">৳{allPurchasesData.reduce((s, r) => s + r.total, 0).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">
                          Paid: ৳{allPurchasesData.reduce((s, r) => s + r.paid, 0).toLocaleString()} • Due: ৳{allPurchasesData.reduce((s, r) => s + r.due, 0).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 8. VENDOR REPORT (VENDOR 360° STATEMENT) */}
      {reportType === 'vendor-statement' && (
        <>
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search vendor profile..."
            totalRecords={vendorStatementData.length}
            onExportCsv={handleExportVendorStatement}
            onPrint={() => window.print()}
            onResetFilters={() => {
              setDatePreset('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
              setSelectedVendor('ALL');
            }}
          >
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Vendor:</span>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Suppliers</option>
                {data.vendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </ReportFilters>

          <div className="grid grid-cols-1 gap-4">
            {vendorStatementData.map((vData, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">{vData.vendor}</h4>
                      <p className="text-xs text-slate-500">{vData.totalBillsCount} Invoices Billed &bull; Supplier Statement</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Invoiced</span>
                      <span className="font-mono font-black text-slate-900">৳{vData.totalInvoiced.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Paid</span>
                      <span className="font-mono font-black text-emerald-600">৳{vData.totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                      <span className="text-rose-600 block text-[10px] uppercase font-black">Net Due Balance</span>
                      <span className="font-mono font-black text-rose-700 text-sm">৳{vData.outstandingDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-table: Bills & Invoices Breakdown */}
                {vData.bills.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Invoice Ledger History</span>
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold">
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Bill No</th>
                            <th className="py-2 px-3 text-right">Invoiced (৳)</th>
                            <th className="py-2 px-3 text-right">Paid (৳)</th>
                            <th className="py-2 px-3 text-right">Remaining Due (৳)</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vData.bills.map((b, bIdx) => (
                            <tr key={bIdx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-600">{b.date}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">{b.billNo}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">৳{b.total.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">৳{b.paid.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                                {b.due > 0 ? `৳${b.due.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                  b.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-800' : (b.status === 'PARTIAL' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800')
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
