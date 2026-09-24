import React, { useState } from 'react';
import { useRestaurant, formatRoleTitle, getOrderTakerDisplay } from '../../context/RestaurantContext';
import { SaleRecord } from '../../types';
import { VoidOrderModal } from '../pos/VoidOrderModal';
import { 
  Receipt, 
  Search, 
  Trash2, 
  Plus, 
  Coins, 
  Filter, 
  Printer, 
  Download, 
  CheckCircle2,
  FileText,
  X,
  Eye,
  FileSpreadsheet,
  ReceiptText,
  UserCheck,
  Ban,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const SalesLedgerView: React.FC = () => {
  const { 
    data, 
    metrics, 
    deleteSale, 
    updateSaleWaiter, 
    saveDirectDueCollection, 
    openPrintBill, 
    openPrintVoidReceipt, 
    setPrintableReceipt, 
    currentUser,
    reopenSaleInPos 
  } = useRestaurant();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'VOIDED'>('ALL');
  const [isDueModalOpen, setIsDueModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reassignSale, setReassignSale] = useState<{ id: number; invoiceNo: string; waiterName: string } | null>(null);
  const [newWaiterChoice, setNewWaiterChoice] = useState<string>('');
  const [voidingSale, setVoidingSale] = useState<SaleRecord | null>(null);

  // Due collection modal state
  const [dueCust, setDueCust] = useState(data.customers[0] || 'Walk-in Customer');
  const [dueAmount, setDueAmount] = useState<number>(0);
  const [dueMethod, setDueMethod] = useState<'CASH' | 'CARD' | 'BKASH' | 'NAGAD'>('CASH');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSaveDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (dueAmount <= 0) return;
    saveDirectDueCollection(dueDate, dueCust, dueAmount, dueMethod);
    setIsDueModalOpen(false);
    setDueAmount(0);
  };

  const filteredSales = data.sales.filter(s => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchInv = (s.invoiceNo || '').toLowerCase().includes(q);
      const matchDet = (s.details || '').toLowerCase().includes(q);
      const matchCust = (s.dueCustomer || '').toLowerCase().includes(q) || (s.dueCollectedFrom || '').toLowerCase().includes(q);
      const matchTable = (s.table || '').toLowerCase().includes(q);
      const matchChannel = (s.channelOrAgent || '').toLowerCase().includes(q);

      // Smart table number matching (matches Table 01, Table 1, 01, 1, T-01, etc.)
      let matchTableSmart = false;
      const detLower = (s.details || '').toLowerCase();
      const tableLower = (s.table || '').toLowerCase();
      const numMatch = q.match(/\d+/);
      if (numMatch) {
        const num = numMatch[0];
        const numPadded = num.padStart(2, '0');
        const numUnpadded = parseInt(num, 10).toString();
        
        matchTableSmart = 
          detLower.includes(`table ${num}`) || 
          detLower.includes(`table ${numPadded}`) || 
          detLower.includes(`table ${numUnpadded}`) || 
          detLower.includes(`t-${num}`) || 
          detLower.includes(`t-${numPadded}`) || 
          detLower.includes(`t-${numUnpadded}`) || 
          tableLower.includes(num) || 
          tableLower.includes(numPadded);
      }

      if (!matchInv && !matchDet && !matchCust && !matchTable && !matchChannel && !matchTableSmart) {
        return false;
      }
    }
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    if (statusFilter === 'ACTIVE' && s.status === 'voided') return false;
    if (statusFilter === 'VOIDED' && s.status !== 'voided') return false;
    return true;
  });

  const allSalesCount = data.sales.filter(s => {
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  }).length;
  const activeSalesCount = data.sales.filter(s => {
    if (s.status === 'voided') return false;
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  }).length;
  const voidedSalesCount = data.sales.filter(s => {
    if (s.status !== 'voided') return false;
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  }).length;

  const completedFilteredSales = filteredSales.filter(s => s.status !== 'voided');
  const voidedFilteredSales = filteredSales.filter(s => s.status === 'voided');

  const totalFilteredSales = completedFilteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalFilteredCash = completedFilteredSales.reduce((sum, s) => sum + (s.cash || 0), 0);
  const totalFilteredCard = completedFilteredSales.reduce((sum, s) => sum + (s.card || 0), 0);
  const totalFilteredBkash = completedFilteredSales.reduce((sum, s) => sum + (s.bkash || 0), 0);
  const totalFilteredNagad = completedFilteredSales.reduce((sum, s) => sum + (s.nagad || 0), 0);
  const totalFilteredDigital = totalFilteredCard + totalFilteredBkash + totalFilteredNagad;
  const totalFilteredDue = completedFilteredSales.reduce((sum, s) => sum + (s.dueGiven || 0), 0);
  const totalFilteredVoided = voidedFilteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalFilteredVoidedCount = voidedFilteredSales.length;

  const handleOpenReceipt = (sale: any, defaultType: 'PAID_MEMO' | 'KOT' | 'VOID_BILL' = 'PAID_MEMO') => {
    if (currentUser?.role === 'WAITER') return;
    if (sale.status === 'voided') {
      openPrintVoidReceipt(sale);
      return;
    }
    let tableName = sale.table || 'Table';
    let tableZone = 'Floor 1';
    let waiter = (sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff';
    let customer = sale.dueCustomer || sale.dueCollectedFrom || 'Walk-in Customer';

    const detailsStr = sale.details || '';

    if (!sale.table && detailsStr) {
      const tableMatch = detailsStr.match(/(Table\s*\w+|T-\w+|Takeaway|Delivery)/i);
      if (tableMatch) {
        tableName = tableMatch[0];
      }
    }

    if (detailsStr) {
      const zoneMatch = detailsStr.match(/Zone:\s*([^\]]+)/i);
      if (zoneMatch) {
        tableZone = zoneMatch[1].trim();
      }
      const waiterMatch = detailsStr.match(/W:\s*([^):,]+)/i);
      if (waiterMatch && waiterMatch[1].trim() !== 'N/A' && waiterMatch[1].trim() !== 'Staff') {
        waiter = waiterMatch[1].trim();
      }
      if (!sale.dueCustomer && detailsStr.includes('•')) {
        const parts = detailsStr.split('•');
        if (parts.length >= 3) {
          customer = parts[2].trim();
        }
        if (parts.length >= 2 && !waiterMatch) {
          waiter = parts[1].trim();
        }
      }
    }

    let receiptItems: any[] = [];
    if (Array.isArray(sale.items) && sale.items.length > 0) {
      receiptItems = sale.items;
    } else {
      if (detailsStr.includes(':')) {
        const itemsPart = detailsStr.split(':').slice(1).join(':').trim();
        if (itemsPart) {
          const rawItems = itemsPart.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (rawItems.length > 0) {
            receiptItems = rawItems.map((str: string, idx: number) => {
              const qtyMatch = str.match(/^(\d+)\s*[xX*]\s*(.+)$/);
              if (qtyMatch) {
                return {
                  id: idx + 1,
                  name: qtyMatch[2].trim(),
                  qty: parseInt(qtyMatch[1], 10),
                  price: Math.round(sale.total / rawItems.length)
                };
              }
              return {
                id: idx + 1,
                name: str,
                qty: 1,
                price: Math.round(sale.total / rawItems.length)
              };
            });
          }
        }
      }

      if (receiptItems.length === 0) {
        receiptItems = [
          {
            id: 1,
            name: detailsStr || 'Restaurant Order',
            qty: 1,
            price: sale.total
          }
        ];
      }
    }

    const subtotal = sale.subtotal || sale.total;
    const discountDeduction = Math.max(0, subtotal - sale.total);

    setPrintableReceipt({
      restaurantName: data.restaurantProfile?.name || 'BARCODE CAFE BANANI',
      restaurantAddress: data.restaurantProfile?.address || 'House #42, Road #11, Block D, Banani, Dhaka-1213',
      restaurantHotline: data.restaurantProfile?.phone || '+880 1700-000000',
      restaurantBin: data.restaurantProfile?.binOrVat || '0029381-01',
      invoiceNo: sale.invoiceNo || `POS-${sale.id}`,
      dateTime: sale.date || new Date().toISOString().split('T')[0],
      tableName,
      tableZone,
      waiter,
      orderTakenBy: getOrderTakerDisplay(sale.orderCreatedBy || sale.sellerName || sale.waiterName, sale.orderCreatedRole || sale.sellerRole),
      settleBillRole: formatRoleTitle(sale.cashierRole || 'Cashier'),
      customer,
      channelOrAgent: sale.channelOrAgent,
      channelCommissionPercent: sale.channelCommissionPercent,
      channelCommissionAmount: sale.channelCommissionAmount,
      items: receiptItems,
      subtotal,
      discountDeduction,
      discountType: 'taka',
      discountVal: discountDeduction,
      netTotal: sale.total,
      netRestaurantRevenue: sale.netRestaurantRevenue ?? sale.total,
      paymentBreakdown: {
        cash: sale.cash || 0,
        card: sale.card || 0,
        bkash: sale.bkash || 0,
        nagad: sale.nagad || 0,
        due: sale.dueGiven || 0,
      },
      changeReturn: sale.change || 0,
      isSettled: true,
      receiptType: defaultType
    });
  };

  const generateReportHtml = () => {
    const restaurantName = data.restaurantProfile?.name || 'BARCODE CAFE BANANI';
    const address = data.restaurantProfile?.address || 'Banani, Dhaka - 1213';
    const phone = data.restaurantProfile?.phone || '+880 1700-000000';
    const reportDateRange = startDate && endDate 
      ? `${startDate} to ${endDate}` 
      : startDate 
        ? `From ${startDate}` 
        : endDate 
          ? `Up to ${endDate}` 
          : 'All Recorded Transactions';
    const filterNote = search.trim() ? `Search Filter: "${search.trim()}"` : '';

    const rowsHtml = filteredSales.map((s, idx) => {
      const isVoid = s.status === 'voided';
      const payments = [
        s.cash ? `Cash: ৳${s.cash.toLocaleString()}` : '',
        s.card ? `Card: ৳${s.card.toLocaleString()}` : '',
        s.bkash ? `bKash: ৳${s.bkash.toLocaleString()}` : '',
        s.nagad ? `Nagad: ৳${s.nagad.toLocaleString()}` : '',
      ].filter(Boolean).join(', ');

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; ${isVoid ? 'background-color: #fff1f2; color: #94a3b8;' : ''}">
          <td style="padding: 7px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 7px 8px; font-family: monospace; font-weight: bold; ${isVoid ? 'text-decoration: line-through; color: #e11d48;' : 'color: #0f172a;'}">
            ${s.invoiceNo} ${isVoid ? '<span style="font-size: 9px; background: #e11d48; color: #fff; padding: 1px 4px; border-radius: 3px; font-weight: bold; text-decoration: none; display: inline-block;">VOID</span>' : ''}
          </td>
          <td style="padding: 7px 8px; font-family: monospace; color: #475569;">${s.date}</td>
          <td style="padding: 7px 8px; color: ${isVoid ? '#94a3b8' : '#1e293b'};">
            ${s.details}
            ${isVoid && s.voidReason ? `<div style="font-size: 9.5px; color: #e11d48; margin-top: 2px;">Voided: ${s.voidReason} (${s.voidedBy || 'Admin'})</div>` : ''}
          </td>
          <td style="padding: 7px 8px; font-size: 10px; font-family: monospace;">${payments || '—'}</td>
          <td style="padding: 7px 8px; text-align: right; color: ${s.dueGiven ? '#dc2626' : '#64748b'}; font-weight: ${s.dueGiven ? 'bold' : 'normal'};">
            ${s.dueGiven ? '৳' + s.dueGiven.toLocaleString() : '—'}
          </td>
          <td style="padding: 7px 8px; text-align: right; font-weight: bold; ${isVoid ? 'text-decoration: line-through; color: #94a3b8;' : 'color: #0f172a;'}">
            ৳${s.total.toLocaleString()}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sales_Report_${new Date().toISOString().split('T')[0]}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
          .restaurant-name { font-size: 20px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #0f172a; margin: 0; }
          .sub-header { font-size: 11px; color: #64748b; margin: 3px 0 0 0; }
          .report-title { font-size: 14px; font-weight: 800; text-transform: uppercase; margin: 8px 0 2px 0; color: #0284c7; }
          .meta-info { display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 14px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          .kpi-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; }
          .kpi-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
          .kpi-value { font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #0f172a; color: #f8fafc; font-size: 10px; text-transform: uppercase; padding: 8px; text-align: left; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="restaurant-name">${restaurantName}</h1>
          <p class="sub-header">${address} • Phone: ${phone}</p>
          <div class="report-title">Sales Invoices & Revenue Statement</div>
        </div>

        <div class="meta-info">
          <div><strong>Period:</strong> ${reportDateRange} ${filterNote ? ` | ${filterNote}` : ''}</div>
          <div><strong>Generated:</strong> ${new Date().toLocaleString('en-US')}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Completed Invoices</div>
            <div class="kpi-value">${completedFilteredSales.length}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Net Sales</div>
            <div class="kpi-value" style="color: #047857;">৳${totalFilteredSales.toLocaleString()}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Cash Collected</div>
            <div class="kpi-value">৳${totalFilteredCash.toLocaleString()}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">${totalFilteredVoidedCount > 0 ? 'Voided (' + totalFilteredVoidedCount + ')' : 'Digital (Card/MFS)'}</div>
            <div class="kpi-value" style="color: ${totalFilteredVoidedCount > 0 ? '#e11d48' : '#1d4ed8'};">৳${(totalFilteredVoidedCount > 0 ? totalFilteredVoided : totalFilteredDigital).toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 95px;">Invoice No</th>
              <th style="width: 80px;">Date</th>
              <th>Details / Table / Dishes</th>
              <th style="width: 140px;">Payment Breakdown</th>
              <th style="width: 80px; text-align: right;">Due</th>
              <th style="width: 90px; text-align: right;">Total (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 25px; color: #94a3b8;">No sales records found for this period.</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a; font-size: 11px;">
              <td colspan="5" style="padding: 10px; text-align: right; text-transform: uppercase;">Total Sales Summary:</td>
              <td style="padding: 10px; text-align: right; color: #dc2626;">৳${totalFilteredDue.toLocaleString()}</td>
              <td style="padding: 10px; text-align: right; font-size: 14px; font-weight: 900; color: #0f172a;">৳${totalFilteredSales.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div>Prepared By: ${currentUser?.name || 'Cashier'} (${currentUser?.role || 'Staff'}) • BD HOSTT Cloud ERP</div>
          <div>Authorized Manager Signature: ___________________________</div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(generateReportHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(generateReportHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <span>Sales Ledger & Customer Receivables</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction history across POS billing, payment channels, and customer credit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-open-due-collection"
            onClick={() => setIsDueModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>Customer Due Collection</span>
          </button>
        </div>
      </div>

      {/* Mini KPI summary */}
      <div className={`grid gap-3 ${totalFilteredVoidedCount > 0 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Net Sales Revenue</div>
          <div className="text-lg font-extrabold text-emerald-700 mt-0.5 font-mono">৳ {totalFilteredSales.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{completedFilteredSales.length} Active Bills</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Cash Received</div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5 font-mono">৳ {totalFilteredCash.toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Digital (Card/MFS)</div>
          <div className="text-lg font-extrabold text-blue-700 mt-0.5 font-mono">৳ {totalFilteredDigital.toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Receivables (Due)</div>
          <div className="text-lg font-extrabold text-amber-700 mt-0.5 font-mono">৳ {totalFilteredDue.toLocaleString()}</div>
        </div>
        {totalFilteredVoidedCount > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="text-[11px] font-bold text-rose-800">Voided (Excluded)</div>
            <div className="text-lg font-extrabold text-rose-700 mt-0.5 font-mono">৳ {totalFilteredVoided.toLocaleString()}</div>
            <div className="text-[10px] text-rose-600 font-bold mt-0.5">{totalFilteredVoidedCount} Invoices Voided</div>
          </div>
        )}
      </div>

      {/* Filter and Date Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-full sm:w-80 md:w-96 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice no, table no (e.g. Table 01), dishes, or customer..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            title="Start Date"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            title="End Date"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
            >
              Reset
            </button>
          )}

          {/* Status Tabs: All, Active, Voided (Matching Screenshot) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All ({allSalesCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Active ({activeSalesCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('VOIDED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'VOIDED'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Voided ({voidedSalesCount})
            </button>
          </div>

          {/* View Report Button */}
          <button
            id="btn-view-sales-report"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition cursor-pointer whitespace-nowrap ml-1"
            title="View, Print and Export Sales Report"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>View Report</span>
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 font-bold">Invoice & Date</th>
                <th className="py-2.5 px-3 font-bold">Details / Customer</th>
                <th className="py-2.5 px-3 font-bold">Payment Methods Breakdown</th>
                <th className="py-2.5 px-2.5 font-bold text-center">Status / Undo</th>
                <th className="py-2.5 px-2.5 font-bold text-right">Due / Collected</th>
                <th className="py-2.5 px-3 font-bold text-right">Total Bill</th>
                <th className="py-2.5 px-3 font-bold text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No sales records found.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const isVoided = sale.status === 'voided';
                  const paymentItems = [
                    sale.cash ? { label: 'Cash', amt: sale.cash, color: 'text-emerald-700' } : null,
                    sale.card ? { label: 'Card', amt: sale.card, color: 'text-blue-700' } : null,
                    sale.bkash ? { label: 'bKash', amt: sale.bkash, color: 'text-pink-700' } : null,
                    sale.nagad ? { label: 'Nagad', amt: sale.nagad, color: 'text-orange-700' } : null,
                  ].filter(Boolean);

                  return (
                    <tr 
                      key={sale.id} 
                      onClick={() => handleOpenReceipt(sale, isVoided ? 'VOID_BILL' : 'PAID_MEMO')}
                      className={`transition cursor-pointer group ${isVoided ? 'bg-rose-50/50 hover:bg-rose-100/60 opacity-85' : 'hover:bg-amber-50/70'}`}
                      title={isVoided ? "Voided Order - Click to view & print void receipt" : "Click to view & print thermal receipt"}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-blue-700 transition flex items-center gap-1.5">
                          <span className={isVoided ? 'line-through text-slate-500' : ''}>{sale.invoiceNo}</span>
                          {isVoided ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                              <Ban className="w-2.5 h-2.5" />
                              VOID
                            </span>
                          ) : (
                            <ReceiptText className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{sale.date}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className={`font-medium line-clamp-1 ${isVoided ? 'line-through text-slate-400' : 'text-slate-800 group-hover:text-slate-900'}`}>{sale.details}</div>
                        {isVoided && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              Voided: <strong>{sale.voidReason || 'Order Voided'}</strong> {sale.voidedBy ? `• By: ${sale.voidedBy}` : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {currentUser?.role !== 'WAITER' && !isVoided ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentW = (sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff';
                                setReassignSale({
                                  id: sale.id,
                                  invoiceNo: sale.invoiceNo,
                                  waiterName: currentW
                                });
                                setNewWaiterChoice(currentW !== 'Staff' ? currentW : '');
                              }}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A'
                                  ? 'bg-blue-50 hover:bg-blue-100 text-[#004b9b] border-blue-200'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                              title="Click to reassign/change waiter"
                            >
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>Waiter: {(sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff'}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>Waiter: {(sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff'}</span>
                            </span>
                          )}
                          {sale.dueCustomer && (
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                              Due: {sale.dueCustomer}
                            </span>
                          )}
                          {sale.dueCollectedFrom && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                              From: {sale.dueCollectedFrom}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono font-semibold">
                          {paymentItems.length > 0 ? (
                            paymentItems.map((p, idx) => (
                              <span key={idx} className={`${p!.color} bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 rounded ${isVoided ? 'line-through opacity-70' : ''}`}>
                                {p!.label}: ৳{p!.amt.toLocaleString()}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      {/* Status / Undo Column (Matching Screenshot) */}
                      <td className="py-2.5 px-2.5 text-center" onClick={e => e.stopPropagation()}>
                        {!isVoided ? (
                          <button
                            type="button"
                            onClick={() => reopenSaleInPos(sale)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition shadow-2xs cursor-pointer group"
                            title="Reopen order in POS to refund items or void entire order"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-[-45deg] transition" />
                            <span>Void / Edit in POS</span>
                            <Ban className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                            <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Voided ({sale.voidReason || 'Cancelled'})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold">
                        {sale.dueGiven ? (
                          <div className={`text-xs ${isVoided ? 'line-through text-slate-400' : 'text-rose-700'}`}>Due: ৳{sale.dueGiven.toLocaleString()}</div>
                        ) : null}
                        {sale.dueCollected ? (
                          <div className={`text-xs ${isVoided ? 'line-through text-slate-400' : 'text-emerald-700'}`}>Rec: ৳{sale.dueCollected.toLocaleString()}</div>
                        ) : null}
                        {!sale.dueGiven && !sale.dueCollected ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-sm whitespace-nowrap">
                        <span className={isVoided ? 'line-through text-rose-500' : 'text-slate-900'}>৳{sale.total.toLocaleString()}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {currentUser?.role !== 'WAITER' && (
                            <>
                              {!isVoided && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentW = (sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff';
                                    setReassignSale({
                                      id: sale.id,
                                      invoiceNo: sale.invoiceNo,
                                      waiterName: currentW
                                    });
                                    setNewWaiterChoice(currentW !== 'Staff' ? currentW : '');
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-[#004b9b] rounded-lg hover:bg-blue-50 transition cursor-pointer"
                                  title="Reassign / Change Waiter"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenReceipt(sale, isVoided ? 'VOID_BILL' : 'PAID_MEMO')}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${isVoided ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-100/70' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100/70'}`}
                                title={isVoided ? "Print Void Thermal Bill" : "View & Print Bill / Cash Memo Receipt"}
                              >
                                <ReceiptText className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteSale(sale.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer ml-0.5"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Due Collection Modal */}
      {isDueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-lg mb-1">Customer Due Collection</h3>
            <p className="text-xs text-slate-500 mb-4">Record direct payment received from credit customers</p>

            <form onSubmit={handleSaveDue} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer *</label>
                <select
                  value={dueCust}
                  onChange={e => setDueCust(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                >
                  {data.customers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (৳) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={dueAmount || ''}
                  onChange={e => setDueAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount collected"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Received Via</label>
                <select
                  value={dueMethod}
                  onChange={e => setDueMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                >
                  <option value="CASH">Cash Drawer</option>
                  <option value="CARD">Card</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDueModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Complete Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Waiter Modal */}
      {reassignSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#004b9b] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Reassign Order Waiter</h3>
                  <div className="text-[11px] text-slate-500 font-mono font-bold">
                    Invoice: {reassignSale.invoiceNo}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setReassignSale(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="my-4 space-y-3">
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                Current Assigned: <strong className="text-slate-900 font-bold">{reassignSale.waiterName || 'Staff'}</strong>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select New Waiter</label>
                <select
                  value={newWaiterChoice}
                  onChange={e => setNewWaiterChoice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004b9b] cursor-pointer"
                >
                  <option value="">-- Choose Waiter --</option>
                  {(data.waiters || []).map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                  <option value="Staff">Staff (Unassigned)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassignSale(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetWaiter = newWaiterChoice.trim() || 'Staff';
                  updateSaleWaiter(reassignSale.id, targetWaiter);
                  setReassignSale(null);
                }}
                className="px-4 py-2 text-xs font-extrabold text-white bg-[#004b9b] hover:bg-blue-800 rounded-xl shadow-xs cursor-pointer transition"
              >
                Save Waiter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Sales Report Modal with Live Preview, Print, and PDF Export */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Modal Top Action Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#004b9b] text-white flex items-center justify-center font-bold shadow-xs">
                  <FileText className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    Sales Invoices & Revenue Statement
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {startDate && endDate 
                      ? `Period: ${startDate} to ${endDate}` 
                      : startDate 
                        ? `From: ${startDate}` 
                        : endDate 
                          ? `Up to: ${endDate}` 
                          : 'All Recorded Transactions'}
                    {search.trim() ? ` • Filter: "${search.trim()}"` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-print-sales-report"
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition cursor-pointer"
                  title="Print Report directly or send to physical printer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>
                <button
                  id="btn-pdf-sales-report"
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  title="Export and Save as clean PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>Export to PDF</span>
                </button>
                <button
                  id="btn-close-sales-report-modal"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer ml-1"
                  title="Close Report View"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: A4 Printable Styled Document Preview */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-100/60">
              <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-8 shadow-xs max-w-4xl mx-auto space-y-5">
                {/* Document Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-wider uppercase">
                    {data.restaurantProfile?.name || 'BARCODE CAFE BANANI'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {data.restaurantProfile?.address || 'Banani, Dhaka - 1213'} • Phone: {data.restaurantProfile?.phone || '+880 1700-000000'}
                  </p>
                  <div className="text-sm font-bold text-[#004b9b] uppercase tracking-wide mt-2">
                    Sales Invoices & Revenue Statement
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-600 gap-1 pb-2 border-b border-dashed border-slate-200 font-mono">
                  <div>
                    <strong>Period:</strong> {startDate && endDate ? `${startDate} to ${endDate}` : (startDate ? `From ${startDate}` : (endDate ? `Up to ${endDate}` : 'All Recorded Transactions'))}
                    {search.trim() ? <span className="ml-2 font-sans font-bold text-[#004b9b]">(Filter: "{search.trim()}")</span> : ''}
                  </div>
                  <div>
                    <strong>Generated:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </div>
                </div>

                {/* KPI Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Completed Invoices</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{completedFilteredSales.length}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Net Sales</div>
                    <div className="text-base font-extrabold text-emerald-700 mt-0.5">৳ {totalFilteredSales.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Cash Collected</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">৳ {totalFilteredCash.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">{totalFilteredVoidedCount > 0 ? `Voided (${totalFilteredVoidedCount})` : 'Digital (Card/MFS)'}</div>
                    <div className={`text-base font-extrabold mt-0.5 ${totalFilteredVoidedCount > 0 ? 'text-rose-600' : 'text-blue-700'}`}>৳ {(totalFilteredVoidedCount > 0 ? totalFilteredVoided : totalFilteredDigital).toLocaleString()}</div>
                  </div>
                </div>

                {/* Statement Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-900 text-slate-200 text-[10.5px]">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10 font-bold">#</th>
                        <th className="py-2.5 px-3 font-bold">Invoice & Date</th>
                        <th className="py-2.5 px-3 font-bold">Details / Table / Dishes</th>
                        <th className="py-2.5 px-3 font-bold">Payment Methods</th>
                        <th className="py-2.5 px-3 text-right font-bold">Due</th>
                        <th className="py-2.5 px-3 text-right font-bold">Total Bill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No sales records found for this period.
                          </td>
                        </tr>
                      ) : (
                        filteredSales.map((sale, idx) => {
                          const isVoid = sale.status === 'voided';
                          const payments = [
                            sale.cash ? `Cash: ৳${sale.cash.toLocaleString()}` : '',
                            sale.card ? `Card: ৳${sale.card.toLocaleString()}` : '',
                            sale.bkash ? `bKash: ৳${sale.bkash.toLocaleString()}` : '',
                            sale.nagad ? `Nagad: ৳${sale.nagad.toLocaleString()}` : '',
                          ].filter(Boolean);

                          return (
                            <tr key={sale.id} className={`hover:bg-slate-50/80 ${isVoid ? 'bg-rose-50/40 text-slate-400' : ''}`}>
                              <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <div className={`font-mono font-bold flex items-center gap-1 ${isVoid ? 'line-through text-rose-600' : 'text-slate-900'}`}>
                                  <span>{sale.invoiceNo}</span>
                                  {isVoid && <span className="bg-rose-600 text-white text-[9px] px-1 py-0.5 rounded font-black no-underline">VOID</span>}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">{sale.date}</div>
                              </td>
                              <td className="py-2 px-3 max-w-sm">
                                <div className={`font-medium ${isVoid ? 'line-through text-slate-400' : 'text-slate-800'}`}>{sale.details}</div>
                                {isVoid && sale.voidReason && (
                                  <div className="text-[10px] text-rose-600 font-bold">Voided: {sale.voidReason} ({sale.voidedBy || 'Admin'})</div>
                                )}
                                {sale.dueCustomer && (
                                  <div className="text-[10px] text-amber-700 font-bold">Due Customer: {sale.dueCustomer}</div>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                                  {payments.length > 0 ? (
                                    payments.map((p, pIdx) => (
                                      <span key={pIdx} className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-200">
                                        {p}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold">
                                {sale.dueGiven ? (
                                  <span className={isVoid ? 'line-through text-slate-400' : 'text-rose-600'}>৳{sale.dueGiven.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-400 font-normal">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-black whitespace-nowrap">
                                <span className={isVoid ? 'line-through text-rose-500' : 'text-slate-900'}>৳{sale.total.toLocaleString()}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-900 text-xs">
                        <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-slate-700 font-black">
                          Net Total ({completedFilteredSales.length} Completed Invoices):
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-rose-600">
                          {totalFilteredDue > 0 ? `৳${totalFilteredDue.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                          ৳{totalFilteredSales.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Audit Signatures */}
                <div className="pt-8 flex flex-col sm:flex-row justify-between text-xs text-slate-500 gap-6 border-t border-slate-200">
                  <div>
                    <div className="border-t border-slate-400 w-44 pt-1 text-center font-bold text-slate-700">
                      Prepared By: {currentUser?.name || 'Cashier'}
                    </div>
                    <div className="text-[10px] text-center text-slate-400">{currentUser?.role || 'Staff Operator'}</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 w-48 pt-1 text-center font-bold text-slate-700">
                      Authorized Signature
                    </div>
                    <div className="text-[10px] text-center text-slate-400">Branch Manager / Owner</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Order Modal */}
      {voidingSale && (
        <VoidOrderModal
          isOpen={!!voidingSale}
          onClose={() => setVoidingSale(null)}
          targetSale={voidingSale}
        />
      )}
    </div>
  );
};
