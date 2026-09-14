import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { JournalEntry, AccountHead } from '../../types';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  Filter, 
  Layers, 
  ArrowRight, 
  Calendar, 
  Sparkles,
  Printer,
  FileCheck,
  Scale,
  X,
  Check
} from 'lucide-react';

export const JournalEntryView: React.FC = () => {
  const { data, addJournalEntry, deleteJournalEntry, language } = useRestaurant();
  const [search, setSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const coa = data.chartOfAccounts || [];
  const journalEntries = data.journalEntries || [];

  // Form State
  const [form, setForm] = useState({
    voucherNo: `JV-${new Date().getFullYear()}-${(journalEntries.length + 1).toString().padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    debitAccountId: coa.find(c => c.type === 'EXPENSE')?.id || coa[0]?.id || '5010',
    creditAccountId: coa.find(c => c.type === 'ASSET')?.id || coa[1]?.id || '1010',
    amount: 1500,
    narration: 'Office and kitchen daily operational settlement voucher',
    referenceNo: `REF-${Date.now().toString().slice(-4)}`
  });

  const handleOpenAdd = () => {
    setForm({
      voucherNo: `JV-${new Date().getFullYear()}-${(journalEntries.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      debitAccountId: coa.find(c => c.type === 'EXPENSE')?.id || coa[0]?.id || '5010',
      creditAccountId: coa.find(c => c.type === 'ASSET')?.id || coa[1]?.id || '1010',
      amount: 1500,
      narration: 'Daily adjustment and journal voucher entry',
      referenceNo: `REF-${Date.now().toString().slice(-4)}`
    });
    setIsNewModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) {
      alert('Please enter a valid debit/credit amount greater than 0.');
      return;
    }
    const debitAcc = coa.find(c => c.id === form.debitAccountId);
    const creditAcc = coa.find(c => c.id === form.creditAccountId);

    if (!debitAcc || !creditAcc) {
      alert('Please select both Debit and Credit account heads.');
      return;
    }

    if (debitAcc.id === creditAcc.id) {
      alert('Debit and Credit account cannot be the same.');
      return;
    }

    addJournalEntry({
      voucherNo: form.voucherNo,
      date: form.date,
      debitAccountId: debitAcc.id,
      debitAccountName: `${debitAcc.code} - ${debitAcc.name}`,
      creditAccountId: creditAcc.id,
      creditAccountName: `${creditAcc.code} - ${creditAcc.name}`,
      amount: Number(form.amount),
      narration: form.narration,
      referenceNo: form.referenceNo
    });

    setIsNewModalOpen(false);
  };

  const filteredEntries = journalEntries.filter(j => 
    j.voucherNo.toLowerCase().includes(search.toLowerCase()) ||
    j.debitAccountName.toLowerCase().includes(search.toLowerCase()) ||
    j.creditAccountName.toLowerCase().includes(search.toLowerCase()) ||
    j.narration.toLowerCase().includes(search.toLowerCase())
  );

  const totalJournalDebit = journalEntries.reduce((sum, j) => sum + (j.amount || 0), 0);
  const totalJournalCredit = totalJournalDebit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Accounting Journal Entries
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                General Ledger
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Double-entry bookkeeping journal vouchers, debit/credit account adjustments, and audit ledger
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Journal Voucher
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Total Journal Vouchers</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{journalEntries.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Recorded transaction vouchers</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-emerald-700 text-xs font-bold flex items-center gap-1">
            <Scale className="w-3.5 h-3.5" /> Total Debits (Dr.)
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">৳{totalJournalDebit.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Total debited balance</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-xs">
          <div className="text-teal-700 text-xs font-bold flex items-center gap-1">
            <Scale className="w-3.5 h-3.5" /> Total Credits (Cr.)
          </div>
          <div className="text-2xl font-black text-teal-800 mt-1">৳{totalJournalCredit.toLocaleString()}</div>
          <div className="text-[11px] text-teal-600 mt-0.5">Balanced with debit total (100% matched)</div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search voucher no, account heads, narration..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <span className="text-xs text-slate-500 font-semibold">
            Showing {filteredEntries.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Voucher No & Date</th>
                <th className="py-3 px-4">Debit Account (Dr.)</th>
                <th className="py-3 px-4">Credit Account (Cr.)</th>
                <th className="py-3 px-4">Amount (৳)</th>
                <th className="py-3 px-4">Narration / Note</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No journal vouchers recorded yet. Click "New Journal Voucher" to create one.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(j => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 font-mono">{j.voucherNo}</div>
                      <div className="text-[11px] text-slate-500">{j.date} • Ref: {j.referenceNo || 'N/A'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block">
                        Dr: {j.debitAccountName}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 inline-block">
                        Cr: {j.creditAccountName}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 text-sm">
                        ৳{j.amount.toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {j.narration}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete journal entry ${j.voucherNo}?`)) {
                            deleteJournalEntry(j.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Journal Voucher Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                Create New Journal Voucher
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Voucher No *</label>
                  <input
                    type="text"
                    value={form.voucherNo}
                    onChange={e => setForm({ ...form, voucherNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-emerald-800 mb-1">Debit Account (Dr. Head) *</label>
                <select
                  value={form.debitAccountId}
                  onChange={e => setForm({ ...form, debitAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-semibold focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  required
                >
                  {coa.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-teal-800 mb-1">Credit Account (Cr. Head) *</label>
                <select
                  value={form.creditAccountId}
                  onChange={e => setForm({ ...form, creditAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-teal-50/50 border border-teal-200 rounded-xl font-semibold focus:outline-hidden focus:border-teal-500 cursor-pointer"
                  required
                >
                  {coa.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (৳) *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reference / Cheque No</label>
                  <input
                    type="text"
                    value={form.referenceNo}
                    onChange={e => setForm({ ...form, referenceNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Narration / Description *</label>
                <textarea
                  rows={2}
                  value={form.narration}
                  onChange={e => setForm({ ...form, narration: e.target.value })}
                  placeholder="Explain transaction details, purpose of debit/credit adjustment..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Journal Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
