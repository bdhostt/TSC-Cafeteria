import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { CustomerAdvance } from '../../types';
import { 
  UserCheck, 
  Search, 
  Coins, 
  Plus, 
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Wallet
} from 'lucide-react';

export const ReceivablesView: React.FC = () => {
  const { 
    data, 
    metrics, 
    saveDirectDueCollection, 
    saveCustomerAdvance, 
    deleteCustomerAdvance 
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'receivables' | 'advances'>('receivables');
  const [search, setSearch] = useState('');

  // Due Collection Modal State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState(data.customers[0] || 'Walk-in Customer');
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState('CASH');
  const [collectDate, setCollectDate] = useState(new Date().toISOString().split('T')[0]);

  // Customer Advance Modal State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceCustomer, setAdvanceCustomer] = useState(data.customers[0] || 'Walk-in Customer');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceMethod, setAdvanceMethod] = useState('BKASH');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [advanceNote, setAdvanceNote] = useState('');

  // Compute Customer Due & Advance Ledger
  const customerMap: Record<string, { due: number; coll: number; advance: number }> = {};
  
  data.customers.forEach(c => {
    customerMap[c] = { due: 0, coll: 0, advance: 0 };
  });

  data.sales.forEach(s => {
    if (s.dueGiven > 0 && s.dueCustomer) {
      if (!customerMap[s.dueCustomer]) customerMap[s.dueCustomer] = { due: 0, coll: 0, advance: 0 };
      customerMap[s.dueCustomer].due += s.dueGiven;
    }
    const colCust = s.dueCollectedFrom || s.dueCustomer;
    if (s.dueCollected > 0 && colCust) {
      if (!customerMap[colCust]) customerMap[colCust] = { due: 0, coll: 0, advance: 0 };
      customerMap[colCust].coll += s.dueCollected;
    }
  });

  const advancesList = data.customerAdvances || [];
  advancesList.forEach(adv => {
    if (adv.status === 'ACTIVE') {
      if (!customerMap[adv.customer]) {
        customerMap[adv.customer] = { due: 0, coll: 0, advance: 0 };
      }
      customerMap[adv.customer].advance += (adv.amount || 0);
    }
  });

  const customerList = Object.keys(customerMap).map(c => {
    const due = customerMap[c].due;
    const coll = customerMap[c].coll;
    const advance = customerMap[c].advance;
    const netReceivable = due - coll;
    const netPosition = netReceivable - advance; // positive: customer owes us; negative: we hold advance
    return { name: c, due, coll, advance, netReceivable, netPosition };
  });

  const handleOpenCollect = (custName?: string) => {
    if (custName) setSelectedCust(custName);
    setCollectDate(new Date().toISOString().split('T')[0]);
    setCollectAmount(0);
    setCollectMethod('CASH');
    setIsCollectModalOpen(true);
  };

  const handleSubmitCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (collectAmount <= 0) return;

    saveDirectDueCollection(collectDate, selectedCust, Number(collectAmount), collectMethod);
    setIsCollectModalOpen(false);
  };

  const handleOpenAdvance = (custName?: string) => {
    if (custName) setAdvanceCustomer(custName);
    setAdvanceDate(new Date().toISOString().split('T')[0]);
    setAdvanceAmount(0);
    setAdvanceMethod('BKASH');
    setAdvanceNote('');
    setIsAdvanceModalOpen(true);
  };

  const handleSubmitAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (advanceAmount <= 0 || !advanceCustomer.trim()) {
      alert('Please select a customer and enter a valid advance amount.');
      return;
    }

    saveCustomerAdvance({
      date: advanceDate,
      customer: advanceCustomer.trim(),
      amount: Number(advanceAmount),
      method: advanceMethod,
      note: advanceNote.trim(),
      status: 'ACTIVE'
    });

    setIsAdvanceModalOpen(false);
  };

  const handleDeleteAdvance = (id: number) => {
    deleteCustomerAdvance(id);
  };

  const filteredCustomers = customerList.filter(c => {
    if (!search.trim()) return true;
    return c.name.toLowerCase().includes(search.toLowerCase().trim());
  });

  const filteredAdvances = advancesList.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return a.customer.toLowerCase().includes(q) || (a.note || '').toLowerCase().includes(q) || a.method.toLowerCase().includes(q);
  });

  const totalAdvanceHeld = metrics.totalCustomerAdvances || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Customer Receivables & Advance Management
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track customer credit dues, receive advance table/party bookings, and reconcile ledger accounts
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAdvance()}
            className="px-3.5 py-2 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Receive Customer Advance</span>
          </button>

          <button
            onClick={() => handleOpenCollect()}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>Record Due Collection</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Receivables */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Total Outstanding Dues
            </div>
            <div className="text-2xl font-black text-rose-700">
              ৳ {metrics.totalCustomerDue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Unpaid customer credit balances</div>
          </div>
        </div>

        {/* Customer Advances */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Customer Advances Held
            </div>
            <div className="text-2xl font-black text-amber-600">
              ৳ {totalAdvanceHeld.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-700 font-medium">{advancesList.filter(a => a.status === 'ACTIVE').length} active deposits & booking advances</div>
          </div>
        </div>

        {/* Net Balance */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-cyan-50 border border-cyan-200 text-cyan-600 rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Net Receivable Exposure
            </div>
            <div className="text-2xl font-black text-cyan-900">
              ৳ {Math.max(0, metrics.totalCustomerDue - totalAdvanceHeld).toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold">Protected against advance deposits</div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('receivables')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'receivables'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Customer Ledger ({customerList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advances')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'advances'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Advance Deposits ({advancesList.length})</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer name or note..."
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#004b9b] focus:outline-none w-64"
          />
        </div>
      </div>

      {/* View 1: Receivables Ledger */}
      {activeTab === 'receivables' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="py-3 px-4 font-bold">Customer Name</th>
                  <th className="py-3 px-4 font-bold text-right">Total Due Taken (৳)</th>
                  <th className="py-3 px-4 font-bold text-right">Total Repaid (৳)</th>
                  <th className="py-3 px-4 font-bold text-right">Advance Held (৳)</th>
                  <th className="py-3 px-4 font-bold text-right">Net Receivable (৳)</th>
                  <th className="py-3 px-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No customer records found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">{cust.name}</div>
                        <div className="text-[10px] text-slate-400">Registered Client</div>
                      </td>
                      <td className="py-3 px-4 text-right text-rose-700 font-bold font-mono">
                        ৳ {cust.due.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-bold font-mono">
                        ৳ {cust.coll.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-amber-700">
                        {cust.advance > 0 ? `৳ ${cust.advance.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-cyan-900 text-sm font-mono">
                        ৳ {cust.netReceivable.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenCollect(cust.name)}
                            className="px-2.5 py-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-900 rounded-lg font-bold text-xs transition cursor-pointer"
                          >
                            Collect Due
                          </button>
                          <button
                            onClick={() => handleOpenAdvance(cust.name)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-lg font-bold text-xs transition cursor-pointer"
                          >
                            + Advance
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Customer Advance Deposits Ledger */}
      {activeTab === 'advances' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="py-3 px-4 font-bold">Voucher # / Date</th>
                  <th className="py-3 px-4 font-bold">Customer Name</th>
                  <th className="py-3 px-4 font-bold text-right">Advance Amount (৳)</th>
                  <th className="py-3 px-4 font-bold">Payment Method</th>
                  <th className="py-3 px-4 font-bold">Booking / Party Note</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No customer advance records recorded yet. Click "+ Receive Customer Advance" to register party/table booking deposits.
                    </td>
                  </tr>
                ) : (
                  filteredAdvances.map(adv => (
                    <tr key={adv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{adv.date}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ADV-{adv.id}</div>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 text-sm">
                        {adv.customer}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-amber-700 text-sm font-mono">
                        ৳ {adv.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px]">
                          {adv.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium max-w-xs truncate">
                        {adv.note || <span className="text-slate-400 italic">No notes</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-300">
                          {adv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteAdvance(adv.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Refund / Delete Advance"
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

      {/* Due Collection Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-lg mb-1">Customer Due Collection</h3>
            <p className="text-xs text-slate-500 mb-4">Receive customer credit repayment into cash drawer</p>

            <form onSubmit={handleSubmitCollect} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Collection Date</label>
                <input
                  type="date"
                  required
                  value={collectDate}
                  onChange={e => setCollectDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Name</label>
                <select
                  value={selectedCust}
                  onChange={e => setSelectedCust(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                >
                  {data.customers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Collected Amount (৳) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={collectAmount === 0 ? '' : collectAmount}
                    onChange={e => setCollectAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-emerald-700 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={collectMethod}
                  onChange={e => setCollectMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                >
                  <option value="CASH">Cash (Cash Drawer)</option>
                  <option value="CARD">Card</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md transition cursor-pointer"
                >
                  Complete Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Advance Modal */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Receive Customer Advance</h3>
                <p className="text-xs text-slate-500">Record advance booking deposit for party or table reservation</p>
              </div>
            </div>

            <form onSubmit={handleSubmitAdvance} className="space-y-3.5 text-xs mt-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deposit Date</label>
                <input
                  type="date"
                  required
                  value={advanceDate}
                  onChange={e => setAdvanceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer *</label>
                <select
                  value={advanceCustomer}
                  onChange={e => setAdvanceCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                >
                  {data.customers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Advance Amount (৳) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={advanceAmount === 0 ? '' : advanceAmount}
                    onChange={e => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-amber-700 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={advanceMethod}
                  onChange={e => setAdvanceMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                >
                  <option value="BKASH">bKash (Merchant / Personal)</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="CASH">Cash (Cash Drawer)</option>
                  <option value="CARD">Bank Card / POS</option>
                  <option value="BANK">Direct Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Booking Note / Purpose</label>
                <input
                  type="text"
                  value={advanceNote}
                  onChange={e => setAdvanceNote(e.target.value)}
                  placeholder="e.g. Birthday Party on VIP Lounge (15 Guests)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-black shadow-md transition cursor-pointer"
                >
                  Save Advance Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
