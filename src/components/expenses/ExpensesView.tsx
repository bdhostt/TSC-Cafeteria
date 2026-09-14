import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Wallet, Plus, Trash2, Search, Filter } from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { data, metrics, saveExpense, deleteExpense } = useRestaurant();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [head, setHead] = useState(data.expenseHeads[0] || 'Conveyance');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    saveExpense({
      date,
      head,
      amount: Number(amount),
      note: note.trim()
    });
    setIsAddModalOpen(false);
    setAmount(0);
    setNote('');
  };

  const filteredExpenses = data.expenses.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return e.head.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q) || e.date.includes(q);
  });

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
            Staff salaries, utility bills, maintenance, casual labor, and sundry operational expenses
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

      {/* Summary card */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Operating Expenses</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">৳ {metrics.totalExpenses.toLocaleString()}</div>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total {data.expenses.length} expense records
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by expense head, date, or notes..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#004b9b] focus:outline-none"
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
                <th className="py-3 px-4 font-bold">Note / Description</th>
                <th className="py-3 px-4 font-bold text-right">Amount (৳)</th>
                <th className="py-3 px-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">{item.date}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{item.head}</td>
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-lg mb-1">Record New Expense</h3>
            <p className="text-xs text-slate-500 mb-4">Record restaurant operational or sundry expenses</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Head *</label>
                <select
                  value={head}
                  onChange={e => setHead(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                >
                  {data.expenseHeads.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-extrabold text-rose-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Cleaning materials and detergents..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
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
  
