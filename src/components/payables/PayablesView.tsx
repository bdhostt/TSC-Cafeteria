import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { PurchaseVoucher } from '../../types';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  DollarSign, 
  FileText, 
  Filter, 
  Layers,
  ArrowRight,
  CheckCircle,
  Check,
  AlertCircle,
  Banknote,
  Landmark,
  FileCheck,
  Smartphone,
  Wallet
} from 'lucide-react';

export const PayablesView: React.FC = () => {
  const { data, metrics, saveVendorPayment, deleteVendorPayment, settlePurchaseBill } = useRestaurant();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'bills' | 'summary' | 'history'>('bills');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedVoucherForSettlement, setSelectedVoucherForSettlement] = useState<PurchaseVoucher | null>(null);

  // Payment form state
  const [vendor, setVendor] = useState(data.vendors[0] || 'Kader Meat Supply');
  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState('Cash Drawer');
  const [note, setNote] = useState('');

  // Payment Accounts & Live Balances
  const { cashDrawer, bankTransfer, cheque, bkashMerchant, nagadMerchant } = metrics.paymentAccountBalances || {
    cashDrawer: 0,
    bankTransfer: 0,
    cheque: 0,
    bkashMerchant: 0,
    nagadMerchant: 0
  };

  const PAYMENT_METHODS = [
    { id: 'Cash Drawer', label: 'Cash Drawer', balance: cashDrawer, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', activeBorder: 'border-emerald-600', activeBg: 'bg-emerald-100/70', icon: Banknote },
    { id: 'Bank Transfer', label: 'Bank Transfer', balance: bankTransfer, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', activeBorder: 'border-blue-600', activeBg: 'bg-blue-100/70', icon: Landmark },
    { id: 'Cheque', label: 'Cheque', balance: cheque, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', activeBorder: 'border-purple-600', activeBg: 'bg-purple-100/70', icon: FileCheck },
    { id: 'bKash Merchant', label: 'bKash Merchant', balance: bkashMerchant, color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200', activeBorder: 'border-pink-600', activeBg: 'bg-pink-100/70', icon: Smartphone },
    { id: 'Nagad Merchant', label: 'Nagad Merchant', balance: nagadMerchant, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', activeBorder: 'border-orange-600', activeBg: 'bg-orange-100/70', icon: Smartphone },
  ];

  const selectedMethodObj = PAYMENT_METHODS.find(m => m.id === method) || PAYMENT_METHODS[0];
  const selectedBalance = selectedMethodObj ? selectedMethodObj.balance : 0;
  const isOverBalance = amount > selectedBalance;

  // Compute bill-wise breakdown
  const creditVouchers = data.purchases.filter(p => p.status !== 'DRAFT');

  // Compute vendor balance summary
  const vendorSummary: Array<{ vendor: string; credit: number; paid: number; balance: number; openBillsCount: number }> = [];

  data.vendors.forEach(v => {
    let credit = 0;
    let paid = 0;
    let openBillsCount = 0;

    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      if (p.vendor.toLowerCase().trim() === v.toLowerCase().trim()) {
        credit += (p.total || 0);
        const pPaid = p.paid || (p.paymentType === 'CASH' ? p.total : 0);
        if (p.total > pPaid) {
          openBillsCount++;
        }
      }
    });

    data.payments.forEach(pay => {
      if (pay.vendor.toLowerCase().trim() === v.toLowerCase().trim()) {
        paid += (pay.amount || 0);
      }
    });

    const balance = Math.max(0, credit - paid);
    if (balance > 0 || credit > 0 || paid > 0) {
      vendorSummary.push({ vendor: v, credit, paid, balance, openBillsCount });
    }
  });

  const handleOpenGeneralPay = (vName?: string) => {
    if (vName) setVendor(vName);
    setSelectedVoucherForSettlement(null);
    setBillNo('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount(0);
    setMethod('Cash Drawer');
    setNote('');
    setIsPayModalOpen(true);
  };

  const handleOpenBillSettlement = (voucher: PurchaseVoucher) => {
    const paidAlready = voucher.paid || (voucher.paymentType === 'CASH' ? voucher.total : 0);
    const remainingDue = Math.max(0, voucher.total - paidAlready);

    setSelectedVoucherForSettlement(voucher);
    setVendor(voucher.vendor);
    setBillNo(voucher.billNo || `VOUCHER-${voucher.id}`);
    setDate(new Date().toISOString().split('T')[0]);
    setAmount(remainingDue);
    setMethod('Cash Drawer');
    setNote(`Bill Settlement for ${voucher.billNo}`);
    setIsPayModalOpen(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    if (selectedVoucherForSettlement) {
      // Settle bill-specific payment
      settlePurchaseBill(
        selectedVoucherForSettlement.billNo,
        selectedVoucherForSettlement.vendor,
        amount,
        method,
        note.trim() || `Bill payment for ${selectedVoucherForSettlement.billNo}`
      );
    } else {
      // General vendor ledger payment
      saveVendorPayment({
        vendor,
        billNo: billNo.trim() || undefined,
        date,
        amount: Number(amount),
        method,
        note: note.trim()
      });
    }

    setIsPayModalOpen(false);
  };

  const filteredVouchers = creditVouchers.filter(v => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      v.vendor.toLowerCase().includes(q) ||
      (v.billNo && v.billNo.toLowerCase().includes(q)) ||
      v.date.includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-600" />
            <span>Supplier Payables & Bill-Wise Due Settlement</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track individual voucher / bill dues, record partial bill payments, and audit supplier ledgers
          </p>
        </div>

        <button
          id="btn-pay-vendor-due"
          onClick={() => handleOpenGeneralPay()}
          className="px-4 py-2.5 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Supplier Payment</span>
        </button>
      </div>

      {/* Payment Account Balances Ribbon */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Payment Account Balances (Available to Pay Vendors)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Real-time balance from sales, cash drawer, bank & mobile merchant accounts
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {PAYMENT_METHODS.map(pm => {
            const Icon = pm.icon;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => {
                  setMethod(pm.id);
                  handleOpenGeneralPay();
                }}
                className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 text-left transition hover:border-amber-400/60 group cursor-pointer"
                title={`Click to record payment using ${pm.label}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition truncate">
                    {pm.label}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
                </div>
                <div className="text-sm sm:text-base font-black font-mono text-amber-300">
                  ৳ {pm.balance.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>Pay from this</span>
                  <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition text-amber-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="text-xs font-bold text-slate-500">Total Supplier Due</div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">
            ৳ {metrics.totalVendorDue.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5 font-medium">
            Outstanding Accounts Payable
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="text-xs font-bold text-slate-500">Total Purchases Inward</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ৳ {metrics.totalPurchases.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {creditVouchers.length} raw material vouchers
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="text-xs font-bold text-slate-500">Settled Payments</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            ৳ {data.payments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
            {data.payments.length} payment entries
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="text-xs font-bold text-slate-500">Active Vendors</div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
            {data.vendors.length} Vendors
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Master supplier directory
          </div>
        </div>
      </div>

      {/* Sub navigation tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'bills'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Voucher / Bill-Wise Breakdown ({creditVouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'summary'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Supplier Balances Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'history'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Payment History Log ({data.payments.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by voucher bill no, supplier name, or date..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* TAB 1: BILL-WISE BREAKDOWN */}
      {activeTab === 'bills' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-700">
              Vouchers & Invoices breakdown with Partial Payment Status
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Click "Pay Bill / Partial" to settle specific voucher bills
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-slate-300 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Voucher & Date</th>
                  <th className="py-2.5 px-3 font-bold">Supplier & Items</th>
                  <th className="py-2.5 px-3 font-bold text-right">Bill Total & Dues</th>
                  <th className="py-2.5 px-2.5 font-bold text-center">Status</th>
                  <th className="py-2.5 px-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No purchase voucher records match the query.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map(voucher => {
                    const paid = voucher.paid || (voucher.paymentType === 'CASH' ? voucher.total : 0);
                    const due = Math.max(0, voucher.total - paid);
                    const isFullyPaid = due === 0;

                    return (
                      <tr key={voucher.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900">
                            {voucher.billNo || `VOUCHER-${voucher.id}`}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{voucher.date}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{voucher.vendor}</div>
                          <div className="text-[10px] text-slate-500">{(voucher.items || []).length} line items</div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-black text-slate-900 text-xs sm:text-sm font-mono">
                            ৳ {voucher.total.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            <span className="text-emerald-700 font-bold">Paid: ৳{paid.toLocaleString()}</span>
                            {due > 0 && (
                              <span className="text-rose-700 font-black ml-1">Due: ৳{due.toLocaleString()}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isFullyPaid 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : paid > 0 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isFullyPaid ? 'Settled' : paid > 0 ? 'Partially Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {!isFullyPaid ? (
                            <button
                              onClick={() => handleOpenBillSettlement(voucher)}
                              className="px-2.5 py-1 bg-[#004b9b] hover:bg-[#005bb8] text-white rounded-lg font-black text-[11px] transition cursor-pointer shadow-2xs"
                            >
                              Pay / Partial
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VENDOR SUMMARY TABLE */}
      {activeTab === 'summary' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-xs text-slate-700">
            Supplier Balance Summary (Vendor Ledger Accounts)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="py-3 px-4 font-bold">Supplier / Vendor Name</th>
                  <th className="py-3 px-4 font-bold text-center">Open Dues</th>
                  <th className="py-3 px-4 font-bold text-right">Total Purchased</th>
                  <th className="py-3 px-4 font-bold text-right">Total Settled</th>
                  <th className="py-3 px-4 font-bold text-right">Outstanding Payable</th>
                  <th className="py-3 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vendorSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No supplier dues or transactions found.
                    </td>
                  </tr>
                ) : (
                  vendorSummary.map((vs, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-extrabold text-slate-900 text-sm">{vs.vendor}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {vs.openBillsCount} pending bills
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 font-semibold">
                        ৳ {vs.credit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                        ৳ {vs.paid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-amber-700 text-sm">
                        ৳ {vs.balance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenGeneralPay(vs.vendor)}
                          className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-xs transition cursor-pointer"
                        >
                          Make Payment
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT HISTORY LOG */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-xs text-slate-700">
            Payment History Log
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="py-2.5 px-4 font-bold">Date</th>
                  <th className="py-2.5 px-4 font-bold">Bill / Voucher #</th>
                  <th className="py-2.5 px-4 font-bold">Vendor / Supplier</th>
                  <th className="py-2.5 px-4 font-bold">Payment Method</th>
                  <th className="py-2.5 px-4 font-bold">Notes</th>
                  <th className="py-2.5 px-4 font-bold text-right">Paid Amount (৳)</th>
                  <th className="py-2.5 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No supplier payment records yet.
                    </td>
                  </tr>
                ) : (
                  data.payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-600">{p.date}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {p.billNo || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{p.vendor}</td>
                      <td className="py-2.5 px-4 text-slate-600">{p.method}</td>
                      <td className="py-2.5 px-4 text-slate-500">{p.note || '-'}</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-emerald-700">
                        ৳ {p.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => deleteVendorPayment(p.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Entry Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-extrabold text-slate-900 text-lg mb-1">
              {selectedVoucherForSettlement ? 'Bill Settlement Payment' : 'Record Supplier Payment'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {selectedVoucherForSettlement 
                ? `Paying Bill No: ${selectedVoucherForSettlement.billNo}`
                : 'General supplier account payment'}
            </p>

            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vendor / Supplier *</label>
                <input
                  type="text"
                  readOnly={!!selectedVoucherForSettlement}
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              {selectedVoucherForSettlement && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>Total Bill:</span>
                    <span className="font-bold">৳ {selectedVoucherForSettlement.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>Already Paid:</span>
                    <span className="text-emerald-700 font-bold">
                      ৳ {(selectedVoucherForSettlement.paid || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-900 border-t border-amber-200 pt-1">
                    <span>Remaining Due:</span>
                    <span>৳ {Math.max(0, selectedVoucherForSettlement.total - (selectedVoucherForSettlement.paid || 0)).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount (৳) * {selectedVoucherForSettlement && '(Partial or Full)'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount === 0 ? '' : amount}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-extrabold text-amber-700 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Payment Method *</label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Available: <span className="font-extrabold font-mono text-emerald-700">৳ {selectedBalance.toLocaleString()}</span>
                  </span>
                </div>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                >
                  {PAYMENT_METHODS.map(pm => (
                    <option key={pm.id} value={pm.id}>
                      {pm.label} (৳ {pm.balance.toLocaleString()} Available)
                    </option>
                  ))}
                </select>

                {/* Notice if payment amount exceeds available balance */}
                {amount > 0 && isOverBalance && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-1.5 text-xs text-amber-900 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Notice: Payment amount (<strong>৳{amount.toLocaleString()}</strong>) exceeds available balance (<strong>৳{selectedBalance.toLocaleString()}</strong>) in {method}.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note / Reference</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Partial settlement for bill..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
