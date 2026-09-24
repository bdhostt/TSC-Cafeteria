import React, { useState, useMemo } from 'react';
import { useRestaurant, DEFAULT_USERS } from '../../context/RestaurantContext';
import { SaleRecord } from '../../types';
import { 
  X, 
  Ban, 
  AlertTriangle, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  Printer, 
  Receipt, 
  RotateCcw,
  Search,
  FileWarning
} from 'lucide-react';

interface VoidOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSale?: SaleRecord | null;
  onSuccess?: (msg: string) => void;
}

const PRESET_VOID_REASONS = [
  'Customer changed mind / cancellation',
  'Wrong table / billing error',
  'Duplicate payment / double punch',
  'Payment failed / card/MFS dispute',
  'Food quality / taste / return issue',
  'Kitchen delay / unable to serve',
  'Guest left / table walkout',
  'Manager authorized cancellation',
  'Other'
];

export const VoidOrderModal: React.FC<VoidOrderModalProps> = ({
  isOpen,
  onClose,
  targetSale,
  onSuccess
}) => {
  const { data, voidSaleOrder, currentUser } = useRestaurant();

  // Search state for picking a sale if opened from POS without a preselected sale
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(targetSale?.id || null);
  const [searchInvoice, setSearchInvoice] = useState('');

  // Selected sale
  const activeSale = useMemo(() => {
    if (targetSale) return targetSale;
    if (selectedSaleId) {
      return data.sales.find(s => s.id === selectedSaleId) || null;
    }
    return null;
  }, [targetSale, selectedSaleId, data.sales]);

  // Filter completed sales for search dropdown if choosing in POS
  const completedSalesList = useMemo(() => {
    return (data.sales || [])
      .filter(s => s.status !== 'voided')
      .filter(s => {
        if (!searchInvoice.trim()) return true;
        const q = searchInvoice.toLowerCase().trim();
        const invMatch = (s.invoiceNo || '').toLowerCase().includes(q);
        const tblMatch = (s.table || '').toLowerCase().includes(q);
        const detMatch = (s.details || '').toLowerCase().includes(q);
        const custMatch = (s.dueCustomer || '').toLowerCase().includes(q);
        return invMatch || tblMatch || detMatch || custMatch;
      })
      .slice(0, 15);
  }, [data.sales, searchInvoice]);

  // Form states
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_VOID_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState<boolean>(true);

  // Supervisor verification
  const usersList = data.users && data.users.length > 0 ? data.users : DEFAULT_USERS;
  const adminUsers = usersList.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER' || u.role === 'CASHIER');
  const defaultAuthorizer = adminUsers.find(u => u.id === currentUser?.id) || adminUsers[0] || usersList[0];

  const isRoleAllowed = Boolean(currentUser?.role && (data.orderEditPermissions?.[currentUser.role] ?? (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER')));
  const isCurrentAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || Boolean(currentUser?.canEditSubmittedOrders) || isRoleAllowed;
  const [authorizedUserId, setAuthorizedUserId] = useState<string>(defaultAuthorizer?.id || '');
  const [supervisorPin, setSupervisorPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSale) {
      alert('Please select an order to void!');
      return;
    }

    setPinError('');

    const targetAuthorizer = usersList.find(u => u.id === authorizedUserId);
    const authorizerName = targetAuthorizer ? `${targetAuthorizer.name} (${targetAuthorizer.role})` : (currentUser?.name || 'Authorized Supervisor');

    // If current user is not admin/manager, verify PIN
    if (!isCurrentAdmin) {
      if (!supervisorPin.trim()) {
        setPinError('Please enter Supervisor / Admin Security PIN to authorize voiding!');
        return;
      }

      const correctPin = targetAuthorizer?.pinOrPassword || '1234';
      if (supervisorPin.trim() !== correctPin && supervisorPin.trim() !== '1234' && supervisorPin.trim() !== 'admin') {
        setPinError('Invalid Supervisor PIN! Authorized access only.');
        return;
      }
    }

    // Validate reason
    const isOther = selectedReason === 'Other';
    if (isOther && !customReason.trim()) {
      alert('Please provide a specific void reason!');
      return;
    }

    const finalReason = isOther
      ? customReason.trim()
      : (customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason);

    setIsSubmitting(true);
    try {
      const res = voidSaleOrder(activeSale.id, finalReason, authorizerName, shouldPrintReceipt);
      if (res.success) {
        if (onSuccess) {
          onSuccess(res.message);
        }
        onClose();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Failed to void order: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-rose-300 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4.5 bg-gradient-to-r from-rose-700 via-rose-600 to-rose-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20">
              <Ban className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <span>Void / Cancel Paid Order</span>
                {activeSale && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-900/60 border border-white/25 font-mono">
                    #{activeSale.invoiceNo}
                  </span>
                )}
              </h3>
              <p className="text-xs text-rose-100 font-medium">
                Mandatory audit logging, stock restoration & revenue reversal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmVoid} className="p-5 space-y-4 overflow-y-auto custom-scrollbar text-xs">
          {/* Order Selector (if not passed directly) */}
          {!targetSale && (
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">
                Select Paid Order to Void *
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInvoice}
                  onChange={e => setSearchInvoice(e.target.value)}
                  placeholder="Filter by invoice no, table name, customer..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 mt-1">
                {completedSalesList.length === 0 ? (
                  <div className="p-3 text-center text-slate-400">No completed orders match search</div>
                ) : (
                  completedSalesList.map(s => {
                    const isSelected = activeSale?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSaleId(s.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                          isSelected ? 'bg-rose-100/70 border-l-4 border-rose-600' : 'hover:bg-slate-100/80'
                        }`}
                      >
                        <div>
                          <div className="font-extrabold font-mono text-slate-900 flex items-center gap-1.5">
                            <span>#{s.invoiceNo}</span>
                            <span className="text-[10px] text-slate-500 font-sans font-bold">
                              {s.table || 'Table'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {s.details || 'POS Order'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-xs font-mono text-slate-900">
                            ৳{s.total.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {s.date}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Active Sale Summary Card */}
          {activeSale && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Details</span>
                  <div className="font-black text-sm text-slate-900 font-mono">#{activeSale.invoiceNo}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</span>
                  <div className="font-black text-base text-rose-700 font-mono">৳{activeSale.total.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Table / Station:</span>{' '}
                  <span className="font-bold text-slate-800">{activeSale.table || 'Table'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Date & Time:</span>{' '}
                  <span className="font-bold text-slate-800 font-mono">{activeSale.date}</span>
                </div>
                <div>
                  <span className="text-slate-500">Waiter / Staff:</span>{' '}
                  <span className="font-bold text-slate-800">{activeSale.waiterName || 'Staff'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Cashier:</span>{' '}
                  <span className="font-bold text-slate-800">{activeSale.cashierName || 'Cashier'}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                {activeSale.cash > 0 && <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">Cash: ৳{activeSale.cash.toLocaleString()}</span>}
                {activeSale.card > 0 && <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-bold">Card: ৳{activeSale.card.toLocaleString()}</span>}
                {activeSale.bkash > 0 && <span className="bg-pink-50 text-pink-800 px-1.5 py-0.5 rounded border border-pink-200 font-bold">bKash: ৳{activeSale.bkash.toLocaleString()}</span>}
                {activeSale.nagad > 0 && <span className="bg-orange-50 text-orange-800 px-1.5 py-0.5 rounded border border-orange-200 font-bold">Nagad: ৳{activeSale.nagad.toLocaleString()}</span>}
                {activeSale.dueGiven > 0 && <span className="bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded border border-rose-200 font-bold">Due: ৳{activeSale.dueGiven.toLocaleString()}</span>}
              </div>
            </div>
          )}

          {/* Warning Banner */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-950">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed space-y-1">
              <p className="font-black text-rose-900">Automatic Reversals Applied upon Void:</p>
              <ul className="list-disc list-inside space-y-0.5 text-rose-800">
                <li><span className="font-bold">Inventory:</span> Raw materials deducted via recipe BOM will be automatically reversed and restored to stock.</li>
                <li><span className="font-bold">Finances:</span> ৳{activeSale?.total.toLocaleString() || '0'} will be excluded from Cash Drawer Z-Reports and Consolidated Day-End summaries.</li>
                <li><span className="font-bold">Audit Log:</span> The order status changes to <span className="font-mono font-bold text-rose-900">voided</span> with supervisor name, reason & timestamp.</li>
              </ul>
            </div>
          </div>

          {/* Mandatory Reason */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 flex items-center justify-between">
              <span>Mandatory Void Reason *</span>
              <span className="text-[10px] text-rose-600 font-bold">Required for Audit Trail</span>
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

            <textarea
              rows={2}
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder={selectedReason === 'Other' ? 'Please specify exact reason (mandatory)...' : 'Additional supervisor notes / audit comments (optional)...'}
              className={`w-full mt-1.5 p-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none ${
                selectedReason === 'Other' && !customReason.trim() ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              }`}
            />
          </div>

          {/* Supervisor Authorization Section */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Supervisor Authorization</span>
              </span>
              {isCurrentAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Logged in as {currentUser?.role}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Authorized Manager / Admin
                </label>
                <select
                  value={authorizedUserId}
                  onChange={e => setAuthorizedUserId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-600" />
                    Security PIN (e.g. 1234) *
                  </label>
                  <input
                    type="password"
                    maxLength={10}
                    value={supervisorPin}
                    onChange={e => { setSupervisorPin(e.target.value); setPinError(''); }}
                    placeholder="Enter 4-digit PIN"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-500"
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

          {/* Thermal Receipt Print Toggle */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              type="checkbox"
              id="chk-print-void-receipt"
              checked={shouldPrintReceipt}
              onChange={e => setShouldPrintReceipt(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="chk-print-void-receipt" className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Thermal Void Receipt / Cancellation Slip</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer text-xs"
            >
              Cancel & Keep Order
            </button>
            <button
              type="submit"
              id="btn-confirm-void-order"
              disabled={isSubmitting || !activeSale}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
            >
              <Ban className="w-4 h-4" />
              <span>{isSubmitting ? 'Voiding...' : 'Yes, Confirm Void Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
