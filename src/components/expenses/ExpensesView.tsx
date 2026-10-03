import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Search, 
  Banknote, 
  Coins, 
  Smartphone, 
  Building, 
  CreditCard 
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { data, metrics, saveExpense, deleteExpense } = useRestaurant();
  const [search, setSearch] = useState('');
  const [filterMedium, setFilterMedium] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [head, setHead] = useState(data.expenseHeads[0] || 'Conveyance');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash in Hand (POS Drawer)');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    saveExpense({
      date,
      head,
      amount: Number(amount),
      paymentMethod,
      note: note.trim()
    });
    setIsAddModalOpen(false);
    setAmount(0);
    setNote('');
  };

  const getMediumBadge = (method?: string) => {
    const norm = (method || 'Cash in Hand (POS Drawer)').toLowerCase();
    if (norm.includes('petty')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Coins className="w-3 h-3 text-amber-600" />
          <span>Petty Cash</span>
        </span>
      );
    }
    if (norm.includes('bkash')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-50 text-pink-800 border border-pink-200">
          <Smartphone className="w-3 h-3 text-pink-600" />
          <span>bKash</span>
        </span>
      );
    }
    if (norm.includes('nagad')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
          <Smartphone className="w-3 h-3 text-orange-600" />
          <span>Nagad</span>
        </span>
      );
    }
    if (norm.includes('bank')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <Building className="w-3 h-3 text-indigo-600" />
          <span>Bank Transfer</span>
        </span>
      );
    }
    if (norm.includes('card')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <CreditCard className="w-3 h-3 text-blue-600" />
          <span>Card</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Banknote className="w-3 h-3 text-emerald-600" />
        <span>Cash Drawer</span>
      </span>
    );
  };

  // Metrics breakdown
  const totalExp = metrics.totalExpenses;
  const cashExp = data.expenses
    .filter(e => !e.paymentMethod || e.paymentMethod.toLowerCase().includes('cash') || e.paymentMethod.toLowerCase().includes('drawer'))
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const pettyExp = data.expenses
    .filter(e => e.paymentMethod && e.paymentMethod.toLowerCase().includes('petty'))
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const digitalExp = totalExp - cashExp - pettyExp;

  const filteredExpenses = data.expenses.filter(e => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || e.head.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q) || e.date.includes(q) || (e.paymentMethod || '').toLowerCase().includes(q);
    
    if (filterMedium === 'ALL') return matchesSearch;
    const m = (e.paymentMethod || 'cash').toLowerCase();
    if (filterMedium === 'CASH') return matchesSearch && (m.includes('cash') || m.includes('drawer'));
    if (filterMedium === 'PETTY') return matchesSearch && m.includes('petty');
    if (filterMedium === 'MFS') return matchesSearch && (m.includes('bkash') || m.includes('nagad'));
    if (filterMedium === 'BANK') return matchesSearch && (m.includes('bank') || m.includes('card'));
    return matchesSearch;
  });

  const paymentMediumOptions = [
    {
      id: 'cash',
      value: 'Cash in Hand (POS Drawer)',
      label: 'Cash in Hand (POS Drawer)',
      shortName: 'Cash Drawer',
      balance: metrics.paymentAccountBalances?.cashDrawer ?? 0,
      icon: Banknote
    },
    {
      id: 'petty',
      value: 'Petty Cash Fund',
      label: 'Petty Cash Fund',
      shortName: 'Petty Cash',
      balance: metrics.paymentAccountBalances?.pettyCash ?? 0,
      icon: Coins
    },
    {
      id: 'bkash',
      value: 'bKash Merchant',
      label: 'bKash Merchant',
      shortName: 'bKash',
      balance: metrics.paymentAccountBalances?.bkashMerchant ?? 0,
      icon: Smartphone
    },
    {
      id: 'nagad',
      value: 'Nagad Merchant',
      label: 'Nagad Merchant',
      shortName: 'Nagad',
      balance: metrics.paymentAccountBalances?.nagadMerchant ?? 0,
      icon: Smartphone
    },
    {
      id: 'bank',
      value: 'Bank - City Bank A/C',
      label: 'Bank Account (City Bank A/C)',
      shortName: 'Bank A/C',
      balance: metrics.paymentAccountBalances?.bankTransfer ?? 0,
      icon: Building
    },
    {
      id: 'card',
      value: 'Card (Company Card)',
      label: 'Card (Company Debit/Credit)',
      shortName: 'Company Card',
      balance: metrics.payCard ?? 0,
      icon: CreditCard
    }
  ];

  const selectedMediumObj = paymentMediumOptions.find(o => 
    o.value.toLowerCase() === paymentMethod.toLowerCase() || 
    paymentMethod.toLowerCase().includes(o.id)
  ) || paymentMediumOptions[0];
  const selectedBalance = selectedMediumObj.balance;
  const isInsufficient = amount > 0 && selectedBalance < amount;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-rose-600" />
            <span>Operating Expenses Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Staff salaries, utility bills, maintenance, casual labor, and sundry operational expenses with payment medium tracking
          </p>
        </div>

        <button
          id="btn-add-expense"
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Expenses</div>
          <div className="text-2xl font-black text-rose-700 mt-1">৳ {totalExp.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{data.expenses.length} records</div>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Cash Drawer Paid</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">৳ {cashExp.toLocaleString()}</div>
          <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
            Drawer Balance: ৳ {(metrics.paymentAccountBalances?.cashDrawer ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Petty Cash Paid</div>
          <div className="text-2xl font-black text-amber-900 mt-1">৳ {pettyExp.toLocaleString()}</div>
          <div className="text-[10px] font-semibold text-amber-700 mt-0.5">
            Petty Fund: ৳ {(metrics.paymentAccountBalances?.pettyCash ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">Bank & MFS Paid</div>
          <div className="text-2xl font-black text-blue-900 mt-1">৳ {digitalExp.toLocaleString()}</div>
          <div className="text-[10px] font-semibold text-blue-700 mt-0.5">
            MFS & Bank Funds: ৳ {((metrics.paymentAccountBalances?.bkashMerchant ?? 0) + (metrics.paymentAccountBalances?.nagadMerchant ?? 0) + (metrics.paymentAccountBalances?.bankTransfer ?? 0)).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {[
            { id: 'ALL', label: 'All Expenses' },
            { id: 'CASH', label: 'Cash Drawer' },
            { id: 'PETTY', label: 'Petty Cash' },
            { id: 'MFS', label: 'bKash / Nagad' },
            { id: 'BANK', label: 'Bank / Card' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterMedium(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterMedium === tab.id
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search expense head, date, note..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#004b9b] focus:outline-none"
          />
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Expense Head</th>
                <th className="py-3 px-4 font-bold">Paid From / Medium</th>
                <th className="py-3 px-4 font-bold">Note / Description</th>
                <th className="py-3 px-4 font-bold text-right">Amount (৳)</th>
                <th className="py-3 px-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">{item.date}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{item.head}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getMediumBadge(item.paymentMethod)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.note || '-'}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-rose-700 text-sm whitespace-nowrap">
                      ৳ {item.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => deleteExpense(item.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
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

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-lg mb-1">Record New Expense</h3>
            <p className="text-xs text-slate-500 mb-4">Record restaurant operational or sundry expenses with payment medium</p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Head *</label>
                <select
                  value={head}
                  onChange={e => setHead(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                >
                  {data.expenseHeads.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Payment Medium / Paid From (টাকা পরিশোধের মাধ্যম) *
                  </label>
                  <span className="text-[11px] font-bold text-slate-500">
                    উপলব্ধ ব্যালেন্স: <span className="font-mono font-black text-emerald-700">৳ {selectedBalance.toLocaleString()}</span>
                  </span>
                </div>

                {/* Quick Selection Medium Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2.5">
                  {paymentMediumOptions.map(opt => {
                    const isSelected = paymentMethod === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.value)}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/90 border-[#004b9b] ring-2 ring-[#004b9b]/25 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#004b9b]' : 'text-slate-500'}`} />
                          <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-[#004b9b]' : 'text-slate-700'}`}>
                            {opt.shortName}
                          </span>
                        </div>
                        <div className="font-mono font-black text-xs text-slate-900">
                          ৳ {opt.balance.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown Select with amounts */}
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                >
                  {paymentMediumOptions.map(opt => (
                    <option key={opt.id} value={opt.value}>
                      {opt.label} — (ব্যালেন্স: ৳ {opt.balance.toLocaleString()})
                    </option>
                  ))}
                </select>

                {/* Selected Balance & Impact Banner */}
                <div className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                  isInsufficient
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : amount > 0
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 shrink-0 text-slate-600" />
                    <div>
                      <span className="font-bold">বর্তমান তহবিল ব্যালেন্স:</span>
                      <span className="text-[10px] block opacity-85 font-medium">{selectedMediumObj.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm block">
                      ৳ {selectedBalance.toLocaleString()}
                    </span>
                    {amount > 0 && (
                      <span className="text-[10px] font-bold block">
                        {selectedBalance >= amount
                          ? `খরচের পর থাকবে: ৳ ${(selectedBalance - amount).toLocaleString()}`
                          : `⚠️ ঘাটতি: ৳ ${(amount - selectedBalance).toLocaleString()}`
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (৳) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount === 0 ? '' : amount}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-extrabold text-rose-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Cleaning materials and detergents..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >  
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
