import React, { useState, useEffect } from 'react';
import { useRestaurant, DEFAULT_USERS } from '../../context/RestaurantContext';
import { AppUser } from '../../types';
import { Play, X, Coins, User, FileText, CheckCircle2, ShieldAlert, Sun, Moon } from 'lucide-react';

export const StartSessionModal: React.FC = () => {
  const { 
    isStartSessionModalOpen, 
    setIsStartSessionModalOpen, 
    pendingHandoverCashier,
    setPendingHandoverCashier,
    pendingHandoverFloat,
    setPendingHandoverFloat,
    pendingHandoverFrom,
    setPendingHandoverFrom,
    businessDay,
    startBusinessDay,
    startSession, 
    currentUser,
    data,
    language,
    t
  } = useRestaurant();

  const isDayStart = !businessDay?.isOpen;
  const latestClosedSession = (data.posSessions && data.posSessions.length > 0) ? data.posSessions[0] : null;

  const effectiveHandoverCashier = 
    pendingHandoverCashier || 
    businessDay?.pendingHandoverCashier || 
    latestClosedSession?.handoverToCashier || 
    null;

  const effectiveHandoverFloat = 
    (pendingHandoverFloat !== null && pendingHandoverFloat !== undefined)
      ? Number(pendingHandoverFloat)
      : (businessDay?.pendingHandoverFloat !== null && businessDay?.pendingHandoverFloat !== undefined)
        ? Number(businessDay.pendingHandoverFloat)
        : (latestClosedSession?.nextShiftDrawerFloat !== null && latestClosedSession?.nextShiftDrawerFloat !== undefined)
          ? Number(latestClosedSession.nextShiftDrawerFloat)
          : null;

  const effectiveHandoverFrom = 
    pendingHandoverFrom || 
    businessDay?.pendingHandoverFrom || 
    latestClosedSession?.closedBy || 
    null;

  const [openingCash, setOpeningCash] = useState<number>(() => {
    if (effectiveHandoverFloat !== null && effectiveHandoverFloat !== undefined && !isNaN(effectiveHandoverFloat)) {
      return effectiveHandoverFloat;
    }
    return 2000;
  });
  const [cashierName, setCashierName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isStartSessionModalOpen) {
      if (currentUser?.name) {
        setCashierName(`${currentUser.name} (${currentUser.role})`);
      } else if (effectiveHandoverCashier) {
        setCashierName(effectiveHandoverCashier);
      } else {
        setCashierName('Cashier 01');
      }
      if (effectiveHandoverFloat !== null && effectiveHandoverFloat !== undefined && !isNaN(effectiveHandoverFloat)) {
        setOpeningCash(effectiveHandoverFloat);
      } else if (!isDayStart && latestClosedSession?.nextShiftDrawerFloat !== undefined) {
        setOpeningCash(Number(latestClosedSession.nextShiftDrawerFloat));
      } else {
        setOpeningCash(2000);
      }
      setNotes(
        isDayStart 
          ? 'Business Day Start - Shift 1 float verified' 
          : effectiveHandoverFrom
            ? `Shift 2 - Handover float ৳${effectiveHandoverFloat ?? 0} verified from ${effectiveHandoverFrom}`
            : 'Shift 2 - Handover float verified'
      );
    }
  }, [isStartSessionModalOpen, effectiveHandoverCashier, effectiveHandoverFloat, effectiveHandoverFrom, isDayStart, currentUser, latestClosedSession]);

  const handleClose = () => {
    setIsStartSessionModalOpen(false);
    setPendingHandoverCashier(null);
    setPendingHandoverFloat(null);
    setPendingHandoverFrom(null);
  };

  if (!isStartSessionModalOpen) return null;

  // Waiter & Chef should NOT see or manage Opening Cash
  if (currentUser?.role === 'WAITER' || currentUser?.role === 'CHEF') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center font-bold">
            <ShieldAlert className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">
              'Cash Drawer & Day Start (Shift) Not Open'
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed px-2">
              {language === 'bn'
                ? 'POS sales cannot be operated until Cash Drawer / Day Start (Shift) is opened. Please request Cashier or Manager to open Day Start.'
                : 'Cash register / Day Start (Shift) has not been opened yet. Access to Sales & POS is restricted until the shift is opened. Please ask an on-duty Cashier, Manager, or Admin to open the day/shift first.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              'Got it (Close)'
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDayStart) {
      startBusinessDay(Number(openingCash) || 0, cashierName.trim(), notes.trim());
    } else {
      startSession(Number(openingCash) || 0, notes.trim(), cashierName.trim(), 'Shift 2');
    }
    setPendingHandoverCashier(null);
    setPendingHandoverFloat(null);
    setPendingHandoverFrom(null);
  };

  // Role-based visibility of eligible operators when opening a shift:
  // - ADMIN: can see and assign all register users (ADMIN, MANAGER, CASHIER)
  // - MANAGER: can see themselves (currentUser) + all CASHIERS (cannot see Admin or other Managers)
  // - CASHIER: can ONLY see themselves (currentUser)
  const eligibleUsers: AppUser[] = (() => {
    const userList = (data.users && data.users.length > 0) ? data.users : DEFAULT_USERS;
    const activeUsers = userList.filter(u => u.isActive !== false);

    if (currentUser?.role === 'ADMIN') {
      return activeUsers.filter(u => ['ADMIN', 'MANAGER', 'CASHIER'].includes(u.role));
    }

    if (currentUser?.role === 'MANAGER') {
      // Manager sees themselves + all cashiers
      const cashiers = activeUsers.filter(u => 
        u.role === 'CASHIER' && 
        u.id !== currentUser?.id && 
        u.name?.toLowerCase() !== currentUser?.name?.toLowerCase()
      );
      return currentUser ? [currentUser, ...cashiers] : cashiers;
    }

    // CASHIER: only themselves
    if (currentUser) {
      return [currentUser];
    }

    return [];
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
              isDayStart 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-blue-100 text-[#004b9b]'
            }`}>
              {isDayStart ? <Sun className="w-5 h-5 text-amber-600" /> : <Moon className="w-5 h-5 text-[#004b9b]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  {isDayStart 
                    ? 'Day Start - Shift 1' 
                    : 'Start Shift 2'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isDayStart 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-blue-100 text-[#004b9b]'
                }`}>
                  {isDayStart ? 'SHIFT 1' : 'SHIFT 2'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {isDayStart 
                  ? 'Start business day with initial opening cash drawer float for Shift 1'
                  : 'Verify drawer handover float and begin Shift 2'}
              </p>
            </div>
          </div>
          <button
            id="close-start-session-modal"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Handover Incoming Banner if received from previous cashier */}
        {effectiveHandoverCashier && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  'Shift Handover Received'
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {effectiveHandoverFrom ? `${effectiveHandoverFrom} ➔ ` : ''}
                  <span className="font-bold">{effectiveHandoverCashier}</span>
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              Drawer Float: ৳{(effectiveHandoverFloat || 0).toLocaleString()}
            </span>
          </div>
        )}

        {/* Informative Warning Callout */}
        <div className="mt-3 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-[#004b9b] shrink-0 mt-0.5" />
          <div className="text-[11px] text-blue-950 leading-snug">
            <span className="font-bold">POS Shift Requirement: </span> 
            {language === 'bn'
              ? 'All table orders, KOT tickets and bills are recorded in this shift session.'
              : 'All table orders, KOT generation, and billing operations are securely logged against this shift session for daily reconciliation.'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5">

          {/* Cashier / Operator Selection (Filtered to ADMIN, MANAGER, CASHIER) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.cashier} / Operator (Role-Based)</span>
              </span>
              {currentUser?.role && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#004b9b] text-[10px] font-black uppercase">
                  Current Role: {currentUser.role}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={cashierName}
                onChange={e => setCashierName(e.target.value)}
                placeholder="Enter Cashier Name or Select"
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004b9b] focus:border-[#004b9b] transition"
              />
            </div>
            {/* Quick Operator Chips - Strictly ADMIN, MANAGER, CASHIER only */}
            {eligibleUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {eligibleUsers.map(u => {
                  const isSelected = cashierName.includes(u.name);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setCashierName(`${u.name} (${u.role})`)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-100 text-[#004b9b] border-blue-300 ring-1 ring-[#004b9b]/30' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {u.name} ({u.role})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drawer Opening Cash */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[#004b9b]" />
                <span>{t.openingCash}</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">Change & Reserve</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">৳</span>
              <input
                type="number"
                id="input-opening-cash"
                min="0"
                step="1"
                required
                autoFocus
                value={isNaN(openingCash) ? '' : openingCash}
                onChange={e => {
                  const val = e.target.value;
                  setOpeningCash(val === '' ? 0 : (parseFloat(val) || 0));
                }}
                onWheel={e => e.currentTarget.blur()}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg sm:text-xl font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004b9b] focus:border-[#004b9b] transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {language === 'bn'
                ? 'Enter initial cash drawer balance before taking orders.'
                : 'Enter the initial drawer float & cash reserve for giving change.'}
            </p>
          </div>

          {/* Quick preset cash buttons */}
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 500, 1000, 2000, 5000].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => setOpeningCash(amt)}
                className={`py-1.5 px-2 rounded-lg text-xs font-black transition border cursor-pointer ${
                  Number(openingCash) === amt 
                    ? 'bg-[#004b9b] text-white border-[#004b9b] shadow-xs' 
                    : 'bg-slate-100 hover:bg-blue-50 hover:text-[#004b9b] text-slate-700 border-slate-200'
                }`}
              >
                ৳{amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Shift Opening Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Shift Notes / Remarks (Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., Morning Shift - Cash float verified"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004b9b] focus:border-[#004b9b] transition"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2.5 flex items-center gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-xs sm:text-sm transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              id="submit-start-session"
              className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                isDayStart 
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20' 
                  : 'bg-[#004b9b] hover:bg-[#005bb8] shadow-blue-900/20'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>
                {isDayStart 
                  ? 'Start Day & Shift 1'
                  : 'Start Shift 2'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
