import React, { useState, useEffect } from 'react';
import { useRestaurant, DEFAULT_USERS } from '../../context/RestaurantContext';
import { AppUser } from '../../types';

const getEligibleHandoverUsers = (
  users: AppUser[] | undefined,
  currentUser: AppUser | null
): AppUser[] => {
  // Any on-duty register operator: CASHIER, MANAGER, ADMIN
  const eligibleRoles = ['CASHIER', 'MANAGER', 'ADMIN'];
  const rawUsers = (users && users.length > 0) ? users : DEFAULT_USERS;
  const userMapByName = new Map<string, AppUser>();

  // Deduplicate by name: default users first, then customized users
  DEFAULT_USERS.forEach(u => {
    if (u && u.name) {
      userMapByName.set(u.name.trim().toLowerCase(), u);
    }
  });
  rawUsers.forEach(u => {
    if (u && u.name) {
      userMapByName.set(u.name.trim().toLowerCase(), u);
    }
  });

  const currentName = (currentUser?.name || '').trim().toLowerCase();
  const currentId = currentUser?.id || '';

  return Array.from(userMapByName.values()).filter(u => {
    if (u.isActive === false) return false;
    if (!eligibleRoles.includes(u.role)) return false;
    const uName = (u.name || '').trim().toLowerCase();
    const uId = u.id || '';
    // Exclude the currently logged in user
    if (currentId && uId && uId === currentId) return false;
    if (currentName && uName && uName === currentName) return false;
    return true;
  });
};
import { 
  X, 
  Coins, 
  Receipt, 
  CreditCard, 
  Smartphone, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Clock, 
  Printer, 
  Calculator, 
  Lock, 
  ArrowRightLeft, 
  ShieldAlert, 
  UserCheck, 
  User, 
  LogOut, 
  Moon, 
  Sun
} from 'lucide-react';

export const CloseSessionModal: React.FC = () => {
  const { 
    isCloseSessionModalOpen, 
    setIsCloseSessionModalOpen, 
    setIsWaiterShiftModalOpen,
    closeSessionWithReconciliation,
    handoverShiftWithLogout,
    performDayOffClose,
    businessDay,
    data,
    activeSessionStats,
    openTables,
    currentUser,
    language,
    t
  } = useRestaurant();

  const [actualCash, setActualCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [closedBy, setClosedBy] = useState<string>('');
  const [handoverTo, setHandoverTo] = useState<string>('');
  const [nextDrawerFloat, setNextDrawerFloat] = useState<number>(2000);
  const [cashDropToVault, setCashDropToVault] = useState<number>(0);

  const openingCash = data.session?.openingCash || 0;
  const expectedCash = openingCash + activeSessionStats.cashSales;
  const cashDifference = actualCash - expectedCash;

  useEffect(() => {
    if (isCloseSessionModalOpen) {
      // Default actual cash to expected cash for fast workflow
      setActualCash(expectedCash);
      setClosingNotes('');
      // By default, full cash in drawer is handed over to next shift, vault drop is 0 unless manually specified
      setNextDrawerFloat(expectedCash);
      setCashDropToVault(0);

      if (currentUser?.name) {
        setClosedBy(`${currentUser.name} (${currentUser.role})`);
      } else {
        setClosedBy(data.session?.openedBy || 'Cashier');
      }

      // Pre-select first eligible next user
      const eligible = getEligibleHandoverUsers(data.users, currentUser);
      if (eligible.length > 0) {
        setHandoverTo(`${eligible[0].name} (${eligible[0].role})`);
      } else {
        setHandoverTo('');
      }
    }
  }, [isCloseSessionModalOpen, expectedCash, currentUser, data.session, data.users]);

  const handleActualCashChange = (val: number) => {
    setActualCash(val);
    setNextDrawerFloat(val);
    setCashDropToVault(0);
  };

  if (!isCloseSessionModalOpen || !data.session?.isActive) return null;

  // Waiter & Chef should NOT close the restaurant's Cash Register
  if (currentUser?.role === 'WAITER' || currentUser?.role === 'CHEF') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center font-bold">
            <ShieldAlert className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">
              Permission Restricted
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed px-2">
              {currentUser?.role === 'WAITER'
                ? 'Waiter accounts cannot close the main restaurant cash drawer or POS shift. To hand over running tables and print your own sales slip at the end of your shift, use "Waiter Handover".'
                : 'Chef accounts do not need to close the cash register drawer.'}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            {currentUser?.role === 'WAITER' && (
              <button
                type="button"
                onClick={() => {
                  setIsCloseSessionModalOpen(false);
                  setIsWaiterShiftModalOpen(true);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Open Waiter Slip & Handover</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCloseSessionModalOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleHandoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTo.trim()) {
      alert('Please select or enter the next cashier/operator to handover this shift to.');
      return;
    }
    handoverShiftWithLogout(
      Number(actualCash) || 0,
      handoverTo.trim(),
      Number(nextDrawerFloat) || 0,
      Number(cashDropToVault) || 0,
      closingNotes.trim()
    );
  };

  const handleDayOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = window.confirm(
      'Are you sure you want to perform Day Off / Close Business Day? This will consolidate all shifts today, print the final Day-End report, and log out.'
    );
    if (!confirmed) return;

    performDayOffClose(
      Number(actualCash) || 0,
      Number(cashDropToVault) || 0,
      closingNotes.trim()
    );
  };

  const handleSubmit = (e: React.FormEvent, handover = false) => {
    e.preventDefault();
    if (handover) {
      handleHandoverSubmit(e);
      return;
    }
    closeSessionWithReconciliation(
      Number(actualCash) || 0, 
      closingNotes.trim(), 
      closedBy.trim(), 
      false,
      Number(cashDropToVault) || 0,
      Number(nextDrawerFloat) || 0,
      openTables.map(t => t.id)
    );
  };

  const userRole = currentUser?.role || 'CASHIER';

  // Get deduplicated eligible handover users (Cashiers, Managers, Admins) excluding current user
  const eligibleUsers = getEligibleHandoverUsers(data.users, currentUser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-lg">{t.closeSession} & Reconcile</h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider">
                  Z-REPORT
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Shift closing, drawer cash reconciliation & Z-Report generation
              </p>
            </div>
          </div>
          <button
            id="close-end-session-modal"
            onClick={() => setIsCloseSessionModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Session Meta Badge */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2.5 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Session ID:</span>
            <span className="font-bold font-mono text-slate-900">{data.session.id || 'SES-ACTIVE'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Shift Started:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {data.session.startTime || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Opened By:</span>
            <span className="font-bold text-slate-900 truncate block">
              {data.session.openedBy || 'Cashier'}
            </span>
          </div>
        </div>

        {/* Open / Running Tables Warning Banner */}
        {openTables.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-300/80 rounded-xl text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-black text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {`Notice: ${openTables.length} table(s) have running active orders / pending bills!`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-6">
              {openTables.map(t => (
                <span key={t.id} className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 font-bold text-[11px] shadow-2xs">
                  {t.name} ({t.zone || 'Floor 1'}) • ৳{t.cart.reduce((s, i) => s + (i.price * i.qty), 0).toLocaleString()}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-amber-800/90 pl-6">
              💡 You can settle these bills now, or carry them over to the incoming shift via Handover.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Shift Financial Summary Breakdown */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center justify-between">
              <span>Shift Sales & Drawer Reconciliation</span>
              <span className="text-slate-400 font-mono font-normal">
                {activeSessionStats.orderCount} Orders Settled
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">1. {t.openingCash}:</span>
                <span className="font-bold text-blue-300">৳{openingCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">2. Cash Sales:</span>
                <span className="font-bold text-emerald-400">+৳{activeSessionStats.cashSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">3. Card / POS:</span>
                <span className="font-bold text-slate-200">৳{activeSessionStats.cardSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">4. bKash / Nagad:</span>
                <span className="font-bold text-slate-200">৳{(activeSessionStats.bkashSales + activeSessionStats.nagadSales).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">5. Customer Due:</span>
                <span className="font-bold text-rose-300">৳{activeSessionStats.dueSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-bold">Total Shift Revenue:</span>
                <span className="font-black text-blue-400">৳{activeSessionStats.totalSales.toLocaleString()}</span>
              </div>
            </div>

            {/* Expected Cash in Drawer Highlight */}
            <div className="p-2.5 bg-slate-800/90 rounded-lg flex items-center justify-between border border-slate-700">
              <div className="text-xs">
                <div className="text-slate-400 font-medium">
                  Expected Drawer Cash (Float + Cash Sales)
                </div>
                <div className="text-[10px] text-slate-500 font-mono">৳{openingCash} + ৳{activeSessionStats.cashSales}</div>
              </div>
              <div className="text-lg font-black text-emerald-400 font-mono">
                ৳{expectedCash.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Actual Cash Counted by Cashier */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>
                  Actual Counted Physical Cash in Drawer (৳)
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleActualCashChange(expectedCash)}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
              >
                Auto-fill Expected (৳{expectedCash})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">৳</span>
              <input
                type="number"
                id="input-actual-closing-cash"
                min="0"
                step="1"
                required
                autoFocus
                value={actualCash === 0 ? '' : actualCash}
                onChange={e => handleActualCashChange(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-2xl font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
              />
            </div>
          </div>

          {/* Cash Variance / Difference Alert Card */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            cashDifference === 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : cashDifference < 0
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-center gap-2.5">
              {cashDifference === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className={`w-5 h-5 shrink-0 ${cashDifference < 0 ? 'text-rose-600' : 'text-amber-600'}`} />
              )}
              <div>
                <div className="text-xs font-black">
                  {cashDifference === 0 && 'Drawer Cash Matched Perfectly'}
                  {cashDifference < 0 && 'Cash Shortage Detected'}
                  {cashDifference > 0 && 'Cash Surplus / Excess'}
                </div>
                <div className="text-[11px] opacity-80">
                  Actual (৳{actualCash.toLocaleString()}) - Expected (৳{expectedCash.toLocaleString()})
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-base font-black font-mono ${
                cashDifference === 0 ? 'text-emerald-700' : cashDifference < 0 ? 'text-rose-700' : 'text-amber-700'
              }`}>
                {cashDifference > 0 ? `+৳${cashDifference.toLocaleString()}` : cashDifference < 0 ? `-৳${Math.abs(cashDifference).toLocaleString()}` : '৳0.00'}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider">
                {cashDifference === 0 ? 'Exact Match' : cashDifference < 0 ? 'Short' : 'Over'}
              </div>
            </div>
          </div>

          {/* Cash Handover Allocation: Float vs Vault Drop */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5 text-[#004b9b]">
                <Coins className="w-4 h-4" />
                <span>Cash Handover Allocation</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Total: ৳{actualCash.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  '1. Float Left in Drawer (৳)'
                </label>
                <input
                  type="number"
                  min="0"
                  max={actualCash}
                  value={nextDrawerFloat}
                  onChange={e => {
                    const fl = Math.max(0, Math.min(actualCash, parseFloat(e.target.value) || 0));
                    setNextDrawerFloat(fl);
                    setCashDropToVault(Math.max(0, actualCash - fl));
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:ring-2 focus:ring-[#004b9b]"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  'Opening float for next shift'
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  '2. Drop to Manager/Safe (৳)'
                </label>
                <input
                  type="number"
                  min="0"
                  max={actualCash}
                  value={cashDropToVault}
                  onChange={e => {
                    const drop = Math.max(0, Math.min(actualCash, parseFloat(e.target.value) || 0));
                    setCashDropToVault(drop);
                    setNextDrawerFloat(Math.max(0, actualCash - drop));
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  'Transferred to safe/vault'
                </span>
              </div>
            </div>
          </div>

          {/* Closing Cashier Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Closed By / Current Cashier Name
            </label>
            <input
              type="text"
              value={closedBy}
              onChange={e => setClosedBy(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
            />
          </div>

          {/* Handover To (Next Cashier / Operator) - Shown for Cashier & Manager */}
          {currentUser?.role !== 'ADMIN' && (
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#004b9b] uppercase tracking-wide flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#004b9b]" />
                  <span>'Handover Shift To (Next Cashier / Operator)'</span>
                </span>
                <span className="text-[10px] font-normal text-blue-700">
                  'Required for Handover'
                </span>
              </label>
              <input
                type="text"
                value={handoverTo}
                onChange={e => setHandoverTo(e.target.value)}
                placeholder='Enter incoming cashier name or select below'
                className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#004b9b] focus:border-[#004b9b] transition"
              />
              {/* Quick Select Chips for Eligible Incoming Cashiers/Managers */}
              {eligibleUsers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold mr-1">
                    'Select:'
                  </span>
                  {eligibleUsers.map(u => {
                    const label = `${u.name} (${u.role})`;
                    const isSelected = handoverTo === label || handoverTo === u.name;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setHandoverTo(label)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                          isSelected
                            ? 'bg-[#004b9b] text-white border-[#004b9b] shadow-xs'
                            : 'bg-white hover:bg-blue-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {u.name} ({u.role})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Shift Closing Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Closing Notes / Discrepancy Reason (Optional)</span>
            </label>
            <input
              type="text"
              value={closingNotes}
              onChange={e => setClosingNotes(e.target.value)}
              placeholder="e.g., Evening Shift closed, cash deposited to safe"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row items-center gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCloseSessionModalOpen(false)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-xs sm:text-sm transition cursor-pointer"
            >
              {t.cancel}
            </button>

            {/* 1. Shift Handover & Logout (Shift 1 ➔ Shift 2) */}
            <button
              type="button"
              id="confirm-close-handover-session"
              onClick={handleHandoverSubmit}
              className="flex-1 w-full py-2.5 px-3 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-900/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Close Shift 1, print Z-Report, handover float to Shift 2 cashier, and auto-logout"
            >
              <ArrowRightLeft className="w-4 h-4 shrink-0" />
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Handover & Logout (Shift 1 ➔ 2)</span>
            </button>

            {/* 2. Day End / Day Off & Logout (Close Business Day) */}
            <button
              type="button"
              id="confirm-day-off-session"
              onClick={handleDayOffSubmit}
              className="flex-1 w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-amber-300 font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer border border-amber-400/30"
              title="End entire business day, print Day-End report and shift Z-report, and logout"
            >
              <Moon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Day End (Day Off)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
