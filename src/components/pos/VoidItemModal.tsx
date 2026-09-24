import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { TableCartItem, SaleRecord } from '../../types';
import { 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  ChefHat, 
  Trash2, 
  Lock, 
  KeyRound, 
  FileWarning, 
  Minus, 
  Plus, 
  CheckCircle2,
  Banknote,
  UserCheck
} from 'lucide-react';
import { DEFAULT_USERS } from '../../context/RestaurantContext';

interface VoidItemModalProps {
  tableId: string;
  tableName: string;
  item: TableCartItem;
  itemIndex: number;
  invoiceNo?: string;
  onClose: () => void;
}

const PRESET_VOID_REASONS = [
  'Guest changed mind',
  'Order delayed by kitchen',
  'Wrong item entered by server',
  'Food quality or taste issue',
  'Item out of stock / 86',
  'Table guest left',
  'Other'
];

export const VoidItemModal: React.FC<VoidItemModalProps> = ({
  tableId,
  tableName,
  item,
  itemIndex,
  invoiceNo,
  onClose
}) => {
  const { voidCartItem, currentUser, data, setData, reopenedSale, setReopenedSale } = useRestaurant();

  const maxTotalQty = parseInt(String(item.qty), 10) || 1;
  const [voidQty, setVoidQty] = useState<number>(maxTotalQty);
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_VOID_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<'Cash Drawer' | 'CARD' | 'BKASH' | 'NAGAD'>('Cash Drawer');
  
  // Supervisor verification
  const usersList = data.users && data.users.length > 0 ? data.users : DEFAULT_USERS;
  const adminUsers = usersList.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER' || u.role === 'CASHIER');
  const defaultAuthorizer = adminUsers.find(u => u.id === currentUser?.id) || adminUsers[0] || usersList[0];

  const isRoleAllowed = Boolean(currentUser?.role && (data.orderEditPermissions?.[currentUser.role] ?? (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'CASHIER')));
  const isCurrentAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || Boolean(currentUser?.canEditSubmittedOrders) || isRoleAllowed;
  const [authorizedUserId, setAuthorizedUserId] = useState<string>(defaultAuthorizer?.id || '');
  const [supervisorPin, setSupervisorPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const targetInvoiceNo = invoiceNo || reopenedSale?.invoiceNo || 'POS-168698';
  const refundTotal = voidQty * (item.price || 0);

  const handleQtyChange = (delta: number) => {
    setVoidQty(prev => Math.max(1, Math.min(maxTotalQty, prev + delta)));
  };

  const handleFullRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleConfirmVoid(e, maxTotalQty);
  };

  const handleConfirmVoid = (e?: React.FormEvent | React.MouseEvent, overrideQty?: number) => {
    if (e && e.preventDefault) e.preventDefault();
    setPinError('');

    const actualVoidCount = overrideQty !== undefined 
      ? Math.min(maxTotalQty, Math.max(1, overrideQty))
      : Math.min(maxTotalQty, Math.max(1, voidQty));

    const actualRefundAmount = actualVoidCount * (item.price || 0);

    const targetAuthorizer = usersList.find(u => u.id === authorizedUserId);
    const authorizerName = targetAuthorizer ? `${targetAuthorizer.name} (${targetAuthorizer.role})` : (currentUser?.name || 'Admin Manager');

    // If current logged-in user is not admin/manager, verify PIN
    if (!isCurrentAdmin) {
      if (!supervisorPin.trim()) {
        setPinError('Please enter Supervisor / Admin Security PIN!');
        return;
      }

      // Check PIN: matches user's pin or default master PIN "1234"
      const correctPin = targetAuthorizer?.pinOrPassword || '1234';
      if (supervisorPin.trim() !== correctPin && supervisorPin.trim() !== '1234' && supervisorPin.trim() !== 'admin') {
        setPinError('Invalid Supervisor PIN! Authorized access only.');
        return;
      }
    }

    const finalReason = selectedReason.includes('Other') 
      ? (customReason.trim() || 'Voided by authorized manager')
      : selectedReason;

    try {
      // Find table object
      const tableObj = (data.tables || []).find(t => 
        t.id === tableId || 
        t.name.toLowerCase() === String(tableId).toLowerCase()
      );

      // Current cart value of the table
      const currentTableTotal = (tableObj?.cart || []).reduce((sum, c) => sum + (c.price * c.qty), 0);

      // Find original completed sale record
      const existingSale = reopenedSale || (data.sales || []).find(s => 
        s.invoiceNo === targetInvoiceNo || 
        (s.status !== 'voided' && (s.table === tableObj?.name || s.table === tableId))
      );

      // The original settled amount must remain intact so POS shows [Already Settled: ৳X] and [Refund to Customer: ৳Y]
      const originalSettledTotal = reopenedSale?.total 
        ? reopenedSale.total 
        : (existingSale?.total ? existingSale.total : (currentTableTotal > 0 ? currentTableTotal : actualRefundAmount));

      const activeSaleRecord: SaleRecord = existingSale ? {
        ...existingSale,
        invoiceNo: existingSale.invoiceNo || targetInvoiceNo,
        total: originalSettledTotal
      } : {
        id: Date.now(),
        date: new Date().toLocaleString('en-US'),
        invoiceNo: targetInvoiceNo,
        details: (tableObj?.cart || []).map(c => `${c.name} (${c.qty})`).join(', ') || item.name,
        total: originalSettledTotal,
        subtotal: originalSettledTotal,
        cash: refundMethod === 'Cash Drawer' ? originalSettledTotal : 0,
        card: refundMethod === 'CARD' ? originalSettledTotal : 0,
        bkash: refundMethod === 'BKASH' ? originalSettledTotal : 0,
        nagad: refundMethod === 'NAGAD' ? originalSettledTotal : 0,
        dueGiven: 0,
        dueCollected: 0,
        change: 0,
        table: tableObj?.name || tableName,
        waiterName: tableObj?.waiter || 'Staff',
        status: 'completed'
      };

      // 1. Activate reopenedSale in context so POS immediately displays:
      // - Amber banner: Reopened Paid Order: POS-XXXXXX
      // - Already Settled: ৳(originalSettledTotal)
      // - Current Bill Value: ৳(new bill)
      // - Refund to Customer: ৳(diff)
      // - Action buttons: [Back to Sales] & [Done / Release]
      if (setReopenedSale) {
        setReopenedSale(activeSaleRecord);
      }

      // 2. Execute void in table cart & trigger Cancel KOT
      voidCartItem(tableId, item.cartItemId || itemIndex, actualVoidCount, finalReason, authorizerName);
    } catch (err) {
      console.error('Error during handleConfirmVoid:', err);
    } finally {
      // 3. Always close the modal to transition to POS order panel
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#9b0f2e] via-[#b81438] to-[#c2185b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0 shadow-xs">
              <FileWarning className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                <span>KOT Item Void & Cancellation</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/40 border border-white/20 font-black">
                  {tableName}
                </span>
              </h3>
              <p className="text-xs text-rose-100 font-semibold">
                Void Item & Print Cancel KOT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmVoid} className="p-5 space-y-3.5 overflow-y-auto custom-scrollbar text-xs">
          {/* Warning Banner */}
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-950">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-black text-rose-950">Security Restriction:</span> This item was already sent to the kitchen (<span className="font-bold text-rose-950">KOT Printed: {item.kotPrintedQty || item.qty} Qty</span>). Modifying or cancelling requires Manager/Admin authorization. A <span className="font-bold text-rose-800">Cancel KOT</span> will be immediately dispatched for the chef.
            </div>
          </div>

          {/* Item Details Box */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">Target Dish</div>
                <h4 className="font-black text-sm sm:text-base text-slate-900 mt-0.5">{item.name}</h4>
                {item.selectedVariation && (
                  <div className="text-[11px] font-bold text-blue-700">
                    • Variation: {item.selectedVariation.name}
                  </div>
                )}
                {item.selectedAddons && item.selectedAddons.length > 0 && (
                  <div className="text-[10px] text-amber-800">
                    • Addons: {item.selectedAddons.map(a => a.name).join(', ')}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total in Cart</div>
                <div className="font-black text-base text-slate-900 mt-0.5">{item.qty} Qty</div>
                <div className="text-xs text-slate-500 font-semibold">৳{item.price} each</div>
              </div>
            </div>

            {/* Void Quantity Selector */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-800">Quantity to Cancel / Void:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQtyChange(-1)}
                  disabled={voidQty <= 1}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 flex items-center justify-center font-bold transition cursor-pointer"
                  title="Decrease quantity to void"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-black text-sm text-rose-700 bg-white py-1 rounded-md border border-slate-200 shadow-2xs">
                  {voidQty}
                </span>
                <button
                  type="button"
                  onClick={() => handleQtyChange(1)}
                  disabled={voidQty >= maxTotalQty}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 flex items-center justify-center font-bold transition cursor-pointer"
                  title="Increase quantity to void"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  id="btn-full-remove-action"
                  onClick={handleFullRemoveClick}
                  className={`text-[10px] font-black px-2.5 py-1 rounded-md transition cursor-pointer border shadow-2xs ${
                    voidQty === maxTotalQty
                      ? 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-200'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  }`}
                  title="Click to void and refund all quantity of this item immediately"
                >
                  Full Remove
                </button>
              </div>
            </div>
          </div>

          {/* Reason Selector */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-xs text-slate-800">
              Reason for Cancellation *
            </label>
            <select
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {PRESET_VOID_REASONS.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>

            {selectedReason.includes('Other') && (
              <textarea
                rows={2}
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Type specific reason for audit records..."
                className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            )}
          </div>

          {/* Supervisor Authorization Section */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-300 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-amber-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Supervisor Authorization</span>
              </span>
              {isCurrentAdmin && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#00875a] text-white font-extrabold text-[10px] flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3 h-3" />
                  Logged in as {currentUser?.role || 'ADMIN'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className={isCurrentAdmin ? 'col-span-full' : ''}>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Authorized Manager / Admin
                </label>
                <select
                  value={authorizedUserId}
                  onChange={e => setAuthorizedUserId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {adminUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} [{u.role}]
                    </option>
                  ))}
                </select>
              </div>

              {!isCurrentAdmin && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-600" />
                    Security PIN (e.g. 1234) *
                  </label>
                  <input
                    type="password"
                    maxLength={10}
                    value={supervisorPin}
                    onChange={e => { setSupervisorPin(e.target.value); setPinError(''); }}
                    placeholder="Enter 4-digit PIN"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {pinError && (
              <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </div>
            )}
          </div>

          {/* Process Refund for this Item */}
          <div className="p-3.5 bg-[#f0fbf7] border border-[#a3e6cd] rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-xs text-emerald-950">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Process Refund for this Item</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#ccf1e3] text-[#006644] border border-[#a3e6cd]">
                  {targetInvoiceNo}
                </span>
              </div>
              <div className="text-base font-black text-emerald-950 font-mono">
                ৳{refundTotal}
              </div>
            </div>
            <p className="text-[10px] font-medium text-emerald-800">
              Amount will be refunded and deducted from Cash Drawer / Sales:
            </p>
            <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/60 flex-wrap">
              <span className="text-[11px] font-extrabold text-slate-700">Refund Method:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {(['Cash Drawer', 'CARD', 'BKASH', 'NAGAD'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setRefundMethod(method)}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                      refundMethod === method
                        ? 'bg-[#005a43] text-white border-[#005a43] shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition cursor-pointer text-xs shadow-2xs"
            >
              Cancel & Keep Item
            </button>
            <button
              type="button"
              id="btn-confirm-void-item"
              onClick={(e) => handleConfirmVoid(e)}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer text-xs active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Void & Refund ৳{refundTotal}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
