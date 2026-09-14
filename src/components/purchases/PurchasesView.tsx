import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  PurchaseVoucher, 
  PurchaseItem, 
  PurchasePaymentType, 
  PurchaseStatus, 
  PurchaseOrder, 
  PurchaseReturn 
} from '../../types';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  CheckCircle, 
  Clock, 
  X, 
  Layers, 
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign,
  AlertTriangle,
  Eye,
  FileSpreadsheet
} from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const { 
    data, 
    metrics, 
    savePurchaseVoucher, 
    deletePurchaseVoucher,
    savePurchaseOrder,
    deletePurchaseOrder,
    savePurchaseReturn,
    deletePurchaseReturn
  } = useRestaurant();

  const [subTab, setSubTab] = useState<'vouchers' | 'orders' | 'returns'>('vouchers');
  const [search, setSearch] = useState('');

  // 1. Voucher Form State
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<PurchaseVoucher | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState(data.vendors[0] || 'Kader Meat Supply');
  const [billNo, setBillNo] = useState('');
  const [paymentType, setPaymentType] = useState<PurchasePaymentType>('CREDIT');
  const [voucherStatus, setVoucherStatus] = useState<PurchaseStatus>('FINAL');
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // 2. Purchase Order (PO) Form State
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poForm, setPoForm] = useState<{
    vendor: string;
    date: string;
    expectedDate: string;
    items: PurchaseItem[];
    status: 'PENDING' | 'PARTIALLY_RECEIVED' | 'FULFILLED' | 'CANCELLED';
  }>({
    vendor: data.vendors[0] || 'Kader Meat Supply',
    date: new Date().toISOString().split('T')[0],
    expectedDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    items: [],
    status: 'PENDING'
  });

  // 3. Purchase Return Form State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState<{
    vendor: string;
    date: string;
    billNo: string;
    itemId: number;
    qty: number;
    rate: number;
    reason: string;
    refundStatus: 'REFUNDED' | 'ADJUSTED' | 'PENDING';
  }>({
    vendor: data.vendors[0] || 'Kader Meat Supply',
    date: new Date().toISOString().split('T')[0],
    billNo: '',
    itemId: data.masterItems[0]?.id || 1,
    qty: 1,
    rate: data.masterItems[0]?.defaultRate || 100,
    reason: 'Damaged / Spoilage during transit',
    refundStatus: 'ADJUSTED'
  });

  // --- Handlers for Purchase Voucher ---
  const handleOpenNewVoucher = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setVendor(data.vendors[0] || 'Kader Meat Supply');
    setBillNo('BILL-' + Date.now().toString().slice(-4));
    setPaymentType('CREDIT');
    setVoucherStatus('FINAL');
    
    if (data.masterItems.length > 0) {
      const defaultRaw = data.masterItems[0];
      setItems([{
        itemId: defaultRaw.id,
        item: defaultRaw.name,
        category: defaultRaw.category,
        uom: defaultRaw.uom,
        qty: 1,
        rate: defaultRaw.defaultRate,
        total: defaultRaw.defaultRate
      }]);
    } else {
      setItems([]);
    }
    setIsVoucherModalOpen(true);
  };

  const handleAddRow = () => {
    if (data.masterItems.length === 0) {
      alert('No raw materials found. Please create raw materials in master inventory first.');
      return;
    }
    const defaultRaw = data.masterItems[0];
    setItems(prev => [...prev, {
      itemId: defaultRaw.id,
      item: defaultRaw.name,
      category: defaultRaw.category,
      uom: defaultRaw.uom,
      qty: 1,
      rate: defaultRaw.defaultRate,
      total: defaultRaw.defaultRate
    }]);
  };

  const handleItemChange = (index: number, rawId: number | string) => {
    const raw = data.masterItems.find(m => String(m.id) === String(rawId) || Number(m.id) === Number(rawId));
    if (!raw) return;

    const standardRate = Number(raw.defaultRate) || 0;

    setItems(prev => prev.map((row, i) => {
      if (i !== index) return row;
      const currentQty = Number(row.qty) || 1;
      return {
        ...row,
        itemId: raw.id,
        item: raw.name,
        category: raw.category,
        uom: raw.uom,
        qty: currentQty,
        rate: standardRate,
        total: Math.round(currentQty * standardRate)
      };
    }));
  };

  const updateRowQty = (index: number, rawVal: string) => {
    const val = rawVal === '' ? 0 : parseFloat(rawVal);
    const qty = isNaN(val) ? 0 : val;
    setItems(prev => prev.map((row, i) => {
      if (i !== index) return row;
      const currentRate = Number(row.rate) || 0;
      return {
        ...row,
        qty,
        total: Math.round(qty * currentRate)
      };
    }));
  };

  const updateRowRate = (index: number, rawVal: string) => {
    const val = rawVal === '' ? 0 : parseFloat(rawVal);
    const rate = isNaN(val) ? 0 : val;
    setItems(prev => prev.map((row, i) => {
      if (i !== index) return row;
      const currentQty = Number(row.qty) || 0;
      return {
        ...row,
        rate,
        total: Math.round(currentQty * rate)
      };
    }));
  };

  const handleRemoveRow = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalVoucherAmount = items.reduce(
    (sum, i) => sum + Math.round((Number(i.qty) || 0) * (Number(i.rate) || 0)), 
    0
  );

  const handleSubmitVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one item to the voucher!');
      return;
    }

    const calculatedItems = items.map(i => ({
      ...i,
      qty: Number(i.qty) || 0,
      rate: Number(i.rate) || 0,
      total: Math.round((Number(i.qty) || 0) * (Number(i.rate) || 0))
    }));

    const newVoucher: PurchaseVoucher = {
      id: Date.now(),
      date,
      vendor,
      billNo: billNo.trim() || ('BILL-' + Date.now().toString().slice(-4)),
      paymentType,
      status: voucherStatus,
      total: calculatedItems.reduce((sum, i) => sum + i.total, 0),
      items: calculatedItems
    };

    savePurchaseVoucher(newVoucher);
    setIsVoucherModalOpen(false);
  };

  // --- Handlers for Purchase Orders (PO) ---
  const handleOpenNewPo = () => {
    const defaultRaw = data.masterItems[0];
    setPoForm({
      vendor: data.vendors[0] || 'Supplier',
      date: new Date().toISOString().split('T')[0],
      expectedDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      items: defaultRaw ? [{
        itemId: defaultRaw.id,
        item: defaultRaw.name,
        category: defaultRaw.category,
        uom: defaultRaw.uom,
        qty: 10,
        rate: Number(defaultRaw.defaultRate) || 0,
        total: (Number(defaultRaw.defaultRate) || 0) * 10
      }] : [],
      status: 'PENDING'
    });
    setIsPoModalOpen(true);
  };

  const handleAddPoRow = () => {
    if (data.masterItems.length === 0) return;
    const defaultRaw = data.masterItems[0];
    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, {
        itemId: defaultRaw.id,
        item: defaultRaw.name,
        category: defaultRaw.category,
        uom: defaultRaw.uom,
        qty: 5,
        rate: Number(defaultRaw.defaultRate) || 0,
        total: (Number(defaultRaw.defaultRate) || 0) * 5
      }]
    }));
  };

  const handlePoItemChange = (index: number, rawId: number | string) => {
    const raw = data.masterItems.find(m => String(m.id) === String(rawId) || Number(m.id) === Number(rawId));
    if (!raw) return;

    const standardRate = Number(raw.defaultRate) || 0;

    setPoForm(prev => ({
      ...prev,
      items: prev.items.map((row, i) => {
        if (i !== index) return row;
        const currentQty = Number(row.qty) || 1;
        return {
          ...row,
          itemId: raw.id,
          item: raw.name,
          category: raw.category,
          uom: raw.uom,
          qty: currentQty,
          rate: standardRate,
          total: Math.round(currentQty * standardRate)
        };
      })
    }));
  };

  const updatePoRowQty = (index: number, rawVal: string) => {
    const val = rawVal === '' ? 0 : parseFloat(rawVal);
    const qty = isNaN(val) ? 0 : val;
    setPoForm(prev => ({
      ...prev,
      items: prev.items.map((row, i) => {
        if (i !== index) return row;
        const currentRate = Number(row.rate) || 0;
        return {
          ...row,
          qty,
          total: Math.round(qty * currentRate)
        };
      })
    }));
  };

  const updatePoRowRate = (index: number, rawVal: string) => {
    const val = rawVal === '' ? 0 : parseFloat(rawVal);
    const rate = isNaN(val) ? 0 : val;
    setPoForm(prev => ({
      ...prev,
      items: prev.items.map((row, i) => {
        if (i !== index) return row;
        const currentQty = Number(row.qty) || 0;
        return {
          ...row,
          rate,
          total: Math.round(currentQty * rate)
        };
      })
    }));
  };

  const handleRemovePoRow = (index: number) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitPo = (e: React.FormEvent) => {
    e.preventDefault();
    if (poForm.items.length === 0) {
      alert('Please add at least one item to the Purchase Order!');
      return;
    }
    const poTotal = poForm.items.reduce((sum, i) => sum + (i.total || 0), 0);
    savePurchaseOrder({
      vendor: poForm.vendor,
      date: poForm.date,
      expectedDate: poForm.expectedDate,
      items: poForm.items,
      total: poTotal,
      status: poForm.status
    });
    setIsPoModalOpen(false);
  };

  // --- Handlers for Purchase Returns ---
  const handleOpenNewReturn = () => {
    const defaultRaw = data.masterItems[0];
    setReturnForm({
      vendor: data.vendors[0] || 'Supplier',
      date: new Date().toISOString().split('T')[0],
      billNo: '',
      itemId: defaultRaw?.id || 1,
      qty: 2,
      rate: defaultRaw?.defaultRate || 100,
      reason: 'Damaged / Quality rejection',
      refundStatus: 'ADJUSTED'
    });
    setIsReturnModalOpen(true);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = data.masterItems.find(m => m.id === returnForm.itemId);
    const returnTotal = Math.round(returnForm.qty * returnForm.rate);

    savePurchaseReturn({
      vendor: returnForm.vendor,
      date: returnForm.date,
      billNo: returnForm.billNo ? returnForm.billNo.trim() : undefined,
      itemId: returnForm.itemId,
      item: raw ? raw.name : 'Item',
      uom: raw ? raw.uom : 'Kg',
      qty: Number(returnForm.qty),
      rate: Number(returnForm.rate),
      total: returnTotal,
      reason: returnForm.reason,
      refundStatus: returnForm.refundStatus
    });
    setIsReturnModalOpen(false);
  };

  // Filtered lists
  const filteredPurchases = data.purchases.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return p.vendor.toLowerCase().includes(q) || p.billNo.toLowerCase().includes(q) || p.date.includes(q);
  });

  const filteredOrders = (data.purchaseOrders || []).filter(po => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return po.vendor.toLowerCase().includes(q) || po.poNo.toLowerCase().includes(q) || po.date.includes(q);
  });

  const filteredReturns = (data.purchaseReturns || []).filter(pr => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return pr.vendor.toLowerCase().includes(q) || pr.returnNo.toLowerCase().includes(q) || pr.item.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span>Purchases, Purchase Orders & Supplier Returns</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage raw material procurement vouchers (GRN), supplier purchase orders (PO), and return debit notes
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {subTab === 'vouchers' && (
            <button
              id="btn-create-purchase-voucher"
              onClick={handleOpenNewVoucher}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Voucher</span>
            </button>
          )}

          {subTab === 'orders' && (
            <button
              id="btn-create-purchase-order"
              onClick={handleOpenNewPo}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Order (PO)</span>
            </button>
          )}

          {subTab === 'returns' && (
            <button
              id="btn-create-purchase-return"
              onClick={handleOpenNewReturn}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Supplier Return</span>
            </button>
          )}
        </div>
      </div>

      {/* Mini KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Total Purchases (Inward)</div>
          <div className="text-lg font-extrabold text-blue-700 mt-0.5">৳ {metrics.totalPurchases.toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Purchase Invoices</div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">{metrics.purchaseCount} vouchers</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Purchase Orders (PO)</div>
          <div className="text-lg font-extrabold text-indigo-700 mt-0.5">{(data.purchaseOrders || []).length} POs</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Vendor Payables</div>
          <div className="text-lg font-extrabold text-amber-700 mt-0.5">৳ {metrics.totalVendorDue.toLocaleString()}</div>
        </div>
      </div>

      {/* Sub navigation tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setSubTab('vouchers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            subTab === 'vouchers'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>1. Purchase Vouchers & GRN ({data.purchases.length})</span>
        </button>

        <button
          onClick={() => setSubTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            subTab === 'orders'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>2. Purchase Orders / PO ({(data.purchaseOrders || []).length})</span>
        </button>

        <button
          onClick={() => setSubTab('returns')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            subTab === 'returns'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>3. Supplier Returns ({(data.purchaseReturns || []).length})</span>
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
            placeholder={
              subTab === 'vouchers' 
                ? "Search vendor name, bill no, or date..."
                : subTab === 'orders'
                  ? "Search PO number, supplier, or date..."
                  : "Search return number, item, or vendor..."
            }
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 1. Purchases Vouchers Table */}
      {subTab === 'vouchers' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Voucher & Date</th>
                  <th className="py-2.5 px-3 font-bold">Vendor & Payment</th>
                  <th className="py-2.5 px-3 font-bold">Items Inward</th>
                  <th className="py-2.5 px-3 font-bold text-right">Bill Total & Paid</th>
                  <th className="py-2.5 px-2 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No purchase vouchers found.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(voucher => {
                    const paidAmt = voucher.paid || (voucher.paymentType === 'CASH' ? voucher.total : 0);
                    const remainingDue = Math.max(0, voucher.total - paidAmt);

                    return (
                      <tr key={voucher.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900">{voucher.billNo}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{voucher.date}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{voucher.vendor}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                              voucher.paymentType === 'CREDIT' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {voucher.paymentType === 'CREDIT' ? 'Credit' : 'Cash'}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                              voucher.status === 'FINAL' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {voucher.status === 'FINAL' ? '✓ In-Stock' : 'Draft'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="line-clamp-1 text-slate-600 font-medium text-[11px]">
                            {voucher.items.map(i => `${i.item} (${i.qty} ${i.uom})`).join(', ')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {voucher.items.length} raw material line items
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-extrabold text-blue-700 text-xs sm:text-sm font-mono">
                            ৳ {voucher.total.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            <span className="font-bold text-emerald-700">Paid: ৳{paidAmt.toLocaleString()}</span>
                            {remainingDue > 0 && (
                              <span className="text-amber-600 font-bold ml-1">Due: ৳{remainingDue.toLocaleString()}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewingVoucher(voucher)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                              title="View Voucher Memo"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deletePurchaseVoucher(voucher.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Delete"
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
      )}

      {/* 2. Purchase Orders (PO) Table */}
      {subTab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold">PO Number</th>
                  <th className="py-3 px-4 font-bold">Supplier</th>
                  <th className="py-3 px-4 font-bold">Expected Date</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold">Items Required</th>
                  <th className="py-3 px-4 font-bold text-right">Order Value (৳)</th>
                  <th className="py-3 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No Purchase Orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(po => (
                    <tr key={po.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{po.date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-900">{po.poNo}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{po.vendor}</td>
                      <td className="py-3 px-4 text-slate-600">{po.expectedDate || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          po.status === 'FULFILLED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : po.status === 'PARTIALLY_RECEIVED'
                              ? 'bg-amber-50 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600 font-medium">
                        {po.items.map(i => `${i.item} (${i.qty} ${i.uom})`).join(', ')}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm whitespace-nowrap">
                        ৳ {po.total.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => deletePurchaseOrder(po.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                          title="Delete PO"
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

      {/* 3. Supplier Returns Table */}
      {subTab === 'returns' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold">Return No</th>
                  <th className="py-3 px-4 font-bold">Vendor / Supplier</th>
                  <th className="py-3 px-4 font-bold">Returned Item</th>
                  <th className="py-3 px-4 font-bold text-center">Quantity</th>
                  <th className="py-3 px-4 font-bold">Reason</th>
                  <th className="py-3 px-4 font-bold text-center">Refund Status</th>
                  <th className="py-3 px-4 font-bold text-right">Debit Amount (৳)</th>
                  <th className="py-3 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No Supplier Returns recorded.
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map(pr => (
                    <tr key={pr.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{pr.date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-900">{pr.returnNo}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{pr.vendor}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{pr.item}</td>
                      <td className="py-3 px-4 text-center font-extrabold text-slate-900">
                        {pr.qty} {pr.uom}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{pr.reason}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pr.refundStatus === 'REFUNDED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : pr.refundStatus === 'ADJUSTED'
                              ? 'bg-blue-50 text-blue-800 border border-blue-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                        }`}>
                          {pr.refundStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-rose-700 text-sm whitespace-nowrap">
                        ৳ {pr.total.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => deletePurchaseReturn(pr.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                          title="Delete Return"
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

      {/* --- Modal 1: New Purchase Voucher --- */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span>Create Inward Purchase Voucher</span>
              </h3>
              <button onClick={() => setIsVoucherModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVoucher} className="flex-1 flex flex-col overflow-hidden my-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier / Vendor *</label>
                  <select
                    value={vendor}
                    onChange={e => setVendor(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    {data.vendors.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bill / Invoice No</label>
                  <input
                    type="text"
                    value={billNo}
                    onChange={e => setBillNo(e.target.value)}
                    placeholder="e.g. INV-9901"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Term</label>
                  <select
                    value={paymentType}
                    onChange={e => setPaymentType(e.target.value as PurchasePaymentType)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    <option value="CREDIT">Credit (Accounts Payable)</option>
                    <option value="CASH">Cash Paid Instantly</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Raw Material</th>
                      <th className="py-2.5 px-2 font-bold text-center">UOM</th>
                      <th className="py-2.5 px-2 font-bold text-right">Qty</th>
                      <th className="py-2.5 px-2 font-bold text-right">Unit Rate (৳)</th>
                      <th className="py-2.5 px-3 font-bold text-right">Total (৳)</th>
                      <th className="py-2.5 px-2 font-bold text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <select
                            value={row.itemId}
                            onChange={e => handleItemChange(idx, Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                          >
                            {data.masterItems.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-700">{row.uom}</td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={row.qty === 0 ? '' : row.qty}
                            onChange={e => updateRowQty(idx, e.target.value)}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.rate === 0 ? '' : row.rate}
                            onChange={e => updateRowRate(idx, e.target.value)}
                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-blue-700 whitespace-nowrap">
                          ৳ {Math.round((Number(row.qty) || 0) * (Number(row.rate) || 0)).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold mr-2">Voucher Total:</span>
                  <span className="text-lg font-black text-blue-800">৳ {totalVoucherAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Save & Inward Stock (৳{totalVoucherAmount.toLocaleString()})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal 2: New Purchase Order (PO) --- */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Create Purchase Order (PO Requisition)</span>
              </h3>
              <button onClick={() => setIsPoModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPo} className="flex-1 flex flex-col overflow-hidden my-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier *</label>
                  <select
                    value={poForm.vendor}
                    onChange={e => setPoForm({ ...poForm, vendor: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    {data.vendors.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PO Date</label>
                  <input
                    type="date"
                    required
                    value={poForm.date}
                    onChange={e => setPoForm({ ...poForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={poForm.expectedDate}
                    onChange={e => setPoForm({ ...poForm, expectedDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Item Required</th>
                      <th className="py-2.5 px-2 font-bold text-right">Order Qty</th>
                      <th className="py-2.5 px-2 font-bold text-right">Est. Rate (৳)</th>
                      <th className="py-2.5 px-3 font-bold text-right">Est. Total</th>
                      <th className="py-2.5 px-2 font-bold text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {poForm.items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <select
                            value={row.itemId}
                            onChange={e => handlePoItemChange(idx, Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          >
                            {data.masterItems.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.uom})</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={row.qty === 0 ? '' : row.qty}
                            onChange={e => updatePoRowQty(idx, e.target.value)}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.rate === 0 ? '' : row.rate}
                            onChange={e => updatePoRowRate(idx, e.target.value)}
                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-indigo-700 whitespace-nowrap">
                          ৳ {Math.round((Number(row.qty) || 0) * (Number(row.rate) || 0)).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePoRow(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddPoRow}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold mr-2">Total PO Amount:</span>
                  <span className="text-lg font-black text-indigo-800">
                    ৳ {poForm.items.reduce((s, i) => s + (i.total || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal 3: New Supplier Return --- */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span>Supplier Return (Debit Note)</span>
              </h3>
              <button onClick={() => setIsReturnModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Return Date *</label>
                <input
                  type="date"
                  required
                  value={returnForm.date}
                  onChange={e => setReturnForm({ ...returnForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vendor / Supplier *</label>
                <select
                  value={returnForm.vendor}
                  onChange={e => setReturnForm({ ...returnForm, vendor: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  {data.vendors.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Raw Material Item *</label>
                <select
                  value={returnForm.itemId}
                  onChange={e => {
                    const rawId = Number(e.target.value);
                    const raw = data.masterItems.find(m => m.id === rawId);
                    setReturnForm({
                      ...returnForm,
                      itemId: rawId,
                      rate: raw ? raw.defaultRate : returnForm.rate
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  {data.masterItems.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.uom})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={returnForm.qty}
                    onChange={e => setReturnForm({ ...returnForm, qty: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rate (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={returnForm.rate}
                    onChange={e => setReturnForm({ ...returnForm, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Return</label>
                <input
                  type="text"
                  value={returnForm.reason}
                  onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })}
                  placeholder="e.g. Broken packaging, expired, quality issues..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Refund / Adjustment Status</label>
                <select
                  value={returnForm.refundStatus}
                  onChange={e => setReturnForm({ ...returnForm, refundStatus: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="ADJUSTED">Adjusted in Accounts Payable</option>
                  <option value="REFUNDED">Refunded in Cash/Bank</option>
                  <option value="PENDING">Pending Claim</option>
                </select>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-rose-800">Total Return Value:</span>
                <span className="font-black text-rose-900 text-sm">৳ {Math.round(returnForm.qty * returnForm.rate).toLocaleString()}</span>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Save Supplier Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Voucher Memo Modal */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                  {viewingVoucher.billNo}
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg mt-1">Purchase Voucher Memo</h3>
              </div>
              <button onClick={() => setViewingVoucher(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Date:</span>
                <span className="font-bold text-slate-900">{viewingVoucher.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Supplier / Vendor:</span>
                <span className="font-extrabold text-slate-900">{viewingVoucher.vendor}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Payment Type:</span>
                <span className="font-bold text-slate-900">{viewingVoucher.paymentType}</span>
              </div>

              <div className="pt-2">
                <div className="font-bold text-slate-700 mb-1">Purchased Raw Materials:</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="py-2 px-3 text-left">Item</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingVoucher.items.map((i, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{i.item}</td>
                          <td className="py-2 px-2 text-center text-slate-600">{i.qty} {i.uom}</td>
                          <td className="py-2 px-2 text-right text-slate-600">৳{i.rate}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">৳{i.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 flex justify-between text-base font-extrabold text-slate-900">
                <span>Voucher Total:</span>
                <span className="text-blue-700">৳ {viewingVoucher.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewingVoucher(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close Memo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
