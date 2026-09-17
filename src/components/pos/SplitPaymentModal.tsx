import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  X, 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  UserX, 
  UserCheck,
  Coins, 
  Zap 
} from 'lucide-react';

export const SplitPaymentModal: React.FC = () => {
  const { activeSettlingTable, closeSettleModal, settlePayment, data, setTableCustomer, setTableWaiter } = useRestaurant();

  const [cash, setCash] = useState<number>(0);
  const [card, setCard] = useState<number>(0);
  const [bkash, setBkash] = useState<number>(0);
  const [nagad, setNagad] = useState<number>(0);
  const [due, setDue] = useState<number>(0);
  const [selectedWaiter, setSelectedWaiter] = useState<string>(
    activeSettlingTable?.waiter && activeSettlingTable.waiter !== 'Staff' && activeSettlingTable.waiter !== 'N/A'
      ? activeSettlingTable.waiter
      : ''
  );
  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    activeSettlingTable?.customer && activeSettlingTable.customer !== 'Walk-in Customer'
      ? activeSettlingTable.customer
      : ''
  );

  if (!activeSettlingTable) return null;

  const subtotal = activeSettlingTable.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discDeduction = activeSettlingTable.discountType === 'percent' 
    ? (subtotal * activeSettlingTable.discountVal) / 100 
    : activeSettlingTable.discountVal;
  const netTotal = Math.round(Math.max(0, subtotal - discDeduction));

  const totalEntered = Number(cash || 0) + Number(card || 0) + Number(bkash || 0) + Number(nagad || 0) + Number(due || 0);
  const remaining = Math.max(0, netTotal - totalEntered);
  const changeReturn = Math.max(0, totalEntered - netTotal);

  const handleFillAllCash = () => {
    setCash(netTotal);
    setCard(0);
    setBkash(0);
    setNagad(0);
    setDue(0);
  };

  const handleFillAllBkash = () => {
    setBkash(netTotal);
    setCash(0);
    setCard(0);
    setNagad(0);
    setDue(0);
  };

  const handleFillAllCard = () => {
    setCard(netTotal);
    setCash(0);
    setBkash(0);
    setNagad(0);
    setDue(0);
  };

  const handleFillAllNagad = () => {
    setNagad(netTotal);
    setCash(0);
    setCard(0);
    setBkash(0);
    setDue(0);
  };

  const handleFillAllDue = () => {
    setDue(netTotal);
    setCash(0);
    setCard(0);
    setBkash(0);
    setNagad(0);
  };

  const handleSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalEntered < netTotal) {
      alert(`Payment incomplete! Remaining ৳${remaining.toLocaleString()} is due.`);
      return;
    }

    const finalWaiter = selectedWaiter.trim() || activeSettlingTable.waiter || '';
    if (!finalWaiter && (data.waiters || []).length > 0) {
      const confirmProceed = window.confirm('No waiter is assigned to this order. Do you want to proceed as unassigned (Staff)?');
      if (!confirmProceed) {
        return;
      }
    }
    if (finalWaiter && finalWaiter !== activeSettlingTable.waiter) {
      setTableWaiter(activeSettlingTable.id, finalWaiter);
    }

    if (due > 0) {
      const finalCustomer = selectedCustomer.trim() || activeSettlingTable.customer;
      if (!finalCustomer || finalCustomer.toLowerCase().includes('walk-in')) {
        alert('Please select or specify a registered customer name for due/credit sales!');
        return;
      }
      setTableCustomer(activeSettlingTable.id, finalCustomer);
    }

    settlePayment(activeSettlingTable.id, {
      cash: Number(cash || 0),
      card: Number(card || 0),
      bkash: Number(bkash || 0),
      nagad: Number(nagad || 0),
      due: Number(due || 0)
    }, finalWaiter);
  };

  const currentWaiterDisplay = selectedWaiter || activeSettlingTable.waiter;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#004b9b] text-white font-extrabold text-sm">
                {activeSettlingTable.name}
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg">Bill Settlement & Split Payment</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span>Order Taker: <strong className="text-slate-800 font-bold">{activeSettlingTable.orderCreatedBy || 'Staff'} {activeSettlingTable.orderCreatedRole ? `(${activeSettlingTable.orderCreatedRole})` : ''}</strong></span>
              <span>• Waiter: <strong className="text-[#004b9b] font-bold">{currentWaiterDisplay && currentWaiterDisplay !== 'Staff' && currentWaiterDisplay !== 'N/A' ? currentWaiterDisplay : 'Not Assigned'}</strong></span>
              <span>• Customer: <strong className="text-slate-800 font-semibold">{selectedCustomer || activeSettlingTable.customer || 'Walk-in Customer'}</strong></span>
            </p>
          </div>
          <button
            id="close-split-payment-modal"
            onClick={closeSettleModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Assigned Waiter Selection Bar */}
        <div className="mt-3 p-2 px-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <UserCheck className="w-4 h-4 text-[#004b9b]" />
            <span>Assigned Waiter:</span>
            {currentWaiterDisplay && currentWaiterDisplay !== 'Staff' && currentWaiterDisplay !== 'N/A' ? (
              <span className="text-xs font-extrabold text-[#004b9b] bg-blue-100 px-2 py-0.5 rounded-md">
                {currentWaiterDisplay}
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Not Assigned
              </span>
            )}
          </div>
          <select
            id="settle-select-waiter"
            value={selectedWaiter}
            onChange={e => {
              const w = e.target.value;
              setSelectedWaiter(w);
              if (w) setTableWaiter(activeSettlingTable.id, w);
            }}
            className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004b9b] cursor-pointer"
          >
            <option value="">-- Choose Waiter --</option>
            {(data.waiters || []).map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        {/* Bill Summary Banner */}
        <div className="my-4 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-inner">
          <div>
            <div className="text-xs text-slate-400 font-medium">Net Payable Bill</div>
            <div className="text-2xl font-extrabold text-blue-400 tracking-tight">
              ৳ {netTotal.toLocaleString()}
            </div>
            {discDeduction > 0 && (
              <div className="text-[11px] text-emerald-400">
                Discount: ৳{discDeduction.toLocaleString()} (Subtotal: ৳{subtotal.toLocaleString()})
              </div>
            )}
          </div>

          <div className="text-right">
            {remaining > 0 ? (
              <div>
                <div className="text-xs text-rose-300 font-bold">Remaining Due</div>
                <div className="text-xl font-extrabold text-rose-400">৳ {remaining.toLocaleString()}</div>
              </div>
            ) : (
              <div>
                <div className="text-xs text-emerald-300 font-bold">Change Return</div>
                <div className="text-xl font-extrabold text-emerald-400">৳ {changeReturn.toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Fast Presets */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#004b9b]" />
            <span>1-Click Full Payment Shortcut</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              id="preset-all-cash"
              onClick={handleFillAllCash}
              className="py-2 px-1 text-center bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Full Cash</span>
            </button>
            <button
              type="button"
              id="preset-all-bkash"
              onClick={handleFillAllBkash}
              className="py-2 px-1 text-center bg-pink-50 hover:bg-pink-100 border border-pink-300 text-pink-800 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-pink-600" />
              <span>Full bKash</span>
            </button>
            <button
              type="button"
              id="preset-all-nagad"
              onClick={handleFillAllNagad}
              className="py-2 px-1 text-center bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-800 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-orange-600" />
              <span>Full Nagad</span>
            </button>
            <button
              type="button"
              id="preset-all-card"
              onClick={handleFillAllCard}
              className="py-2 px-1 text-center bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Full Card</span>
            </button>
            <button
              type="button"
              id="preset-all-due"
              onClick={handleFillAllDue}
              className="py-2 px-1 text-center bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <UserX className="w-4 h-4 text-amber-600" />
              <span>Full Due</span>
            </button>
          </div>
        </div>

        {/* Multi-Split Payment Form */}
        <form onSubmit={handleSettle} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Cash */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cash</span>
              </label>
              <input
                type="number"
                id="input-pay-cash"
                min="0"
                step="1"
                value={cash === 0 ? '' : cash}
                onChange={e => setCash(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#004b9b] focus:outline-none"
              />
            </div>

            {/* Card */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Card</span>
              </label>
              <input
                type="number"
                id="input-pay-card"
                min="0"
                step="1"
                value={card === 0 ? '' : card}
                onChange={e => setCard(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#004b9b] focus:outline-none"
              />
            </div>

            {/* bKash */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-pink-600" />
                <span>bKash</span>
              </label>
              <input
                type="number"
                id="input-pay-bkash"
                min="0"
                step="1"
                value={bkash === 0 ? '' : bkash}
                onChange={e => setBkash(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#004b9b] focus:outline-none"
              />
            </div>

            {/* Nagad */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                <span>Nagad</span>
              </label>
              <input
                type="number"
                id="input-pay-nagad"
                min="0"
                step="1"
                value={nagad === 0 ? '' : nagad}
                onChange={e => setNagad(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#004b9b] focus:outline-none"
              />
            </div>

            {/* Due (Receivable) */}
            <div className="col-span-2 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <UserX className="w-3.5 h-3.5 text-amber-600" />
                <span>Due / Customer Credit {selectedCustomer ? `(${selectedCustomer})` : `(${activeSettlingTable.customer})`}</span>
              </label>
              <input
                type="number"
                id="input-pay-due"
                min="0"
                step="1"
                value={due === 0 ? '' : due}
                onChange={e => setDue(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-amber-50/60 border border-amber-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Customer Selection for Credit/Due Sales */}
          {due > 0 && (
            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 animate-in fade-in">
              <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-amber-700" />
                <span>Assign Customer for Due / Accounts Receivable *</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Select Registered Customer</label>
                  <select
                    value={selectedCustomer}
                    onChange={e => setSelectedCustomer(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {(data.customers || []).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Or Type Customer Name</label>
                  <input
                    type="text"
                    value={selectedCustomer}
                    onChange={e => setSelectedCustomer(e.target.value)}
                    placeholder="Enter customer / company name..."
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={closeSettleModal}
              className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-sm transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-settle-payment"
              disabled={totalEntered < netTotal}
              className={`flex-1 py-3 rounded-xl font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 ${
                totalEntered >= netTotal 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm Payment & Settle Bill</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
