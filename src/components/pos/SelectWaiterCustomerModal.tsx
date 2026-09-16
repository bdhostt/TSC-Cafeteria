import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Table } from '../../types';
import { 
  X, 
  User, 
  UserCheck, 
  MapPin, 
  ArrowRight, 
  UtensilsCrossed,
  AlertCircle
} from 'lucide-react';

interface SelectWaiterCustomerModalProps {
  table: Table;
  onClose: () => void;
  onConfirm: (waiter: string, customer: string) => void;
}

export const SelectWaiterCustomerModal: React.FC<SelectWaiterCustomerModalProps> = ({
  table,
  onClose,
  onConfirm
}) => {
  const { data } = useRestaurant();

  // Only pre-fill waiter/customer if this is an already active table being re-edited
  const isTableActive = table.status !== 'free' && !!(table.cart && table.cart.length > 0);
  const [selectedWaiter, setSelectedWaiter] = useState<string>(isTableActive ? (table.waiter || '') : '');
  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    isTableActive ? (table.customer || '') : ''
  );
  const [error, setError] = useState<string>('');

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWaiter.trim()) {
      setError('Please select a waiter');
      return;
    }
    onConfirm(selectedWaiter, selectedCustomer.trim() || 'Walk-in Customer');
  };

  const waiters = data.waiters || [];
  const commissionAgents = data.commissionAgents || [];
  const customers = (data.customers || []).filter(
    c => !commissionAgents.some(a => a.name.toLowerCase() === c.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 to-[#004b9b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {table.name}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-white font-bold text-[11px] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{table.zone || 'Floor 1'}</span>
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                Select waiter and customer before taking order
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleProceed} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Waiter Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#004b9b]" />
                <span>Select Waiter *</span>
              </label>
              {selectedWaiter && (
                <span className="text-[11px] font-bold text-[#004b9b] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {selectedWaiter}
                </span>
              )}
            </div>

            <select
              id="modal-select-waiter"
              value={selectedWaiter}
              onChange={(e) => {
                setSelectedWaiter(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#004b9b] focus:outline-none cursor-pointer"
            >
              <option value="">-- Choose Waiter --</option>
              {waiters.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {/* Selected Waiter Pill (Only appears after selecting) */}
            {selectedWaiter && (
              <div className="flex items-center gap-1.5 pt-1 animate-in fade-in duration-150">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#004b9b] text-white shadow-xs">
                  <span>👤 {selectedWaiter}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedWaiter('')}
                    className="hover:bg-white/20 rounded-md p-0.5 ml-0.5 transition cursor-pointer"
                    title="Remove selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Customer / Agent Selection */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#004b9b]" />
                <span>Customer / Agent</span>
              </label>
              {selectedCustomer && (
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {selectedCustomer}
                </span>
              )}
            </div>

            <select
              id="modal-select-customer"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#004b9b] focus:outline-none cursor-pointer"
            >
              <option value="">-- Choose Customer or Channel --</option>
              <option value="Walk-in Customer">Walk-in Customer (Dine-in)</option>

              {commissionAgents.length > 0 && (
                <optgroup label="🛵 Commission Agents & Delivery (Auto-Discount)">
                  {commissionAgents.map(agent => (
                    <option key={agent.id} value={agent.name}>
                      🛵 {agent.name} ({agent.commissionPercent}% Commission / Discount)
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="👤 Regular & VIP Customers">
                {customers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
            </select>

            {/* Selected Channel Pill (Only appears after selecting) */}
            {selectedCustomer && (
              <div className="flex items-center gap-1.5 pt-1 animate-in fade-in duration-150">
                {(() => {
                  const agent = commissionAgents.find(
                    a => a.name.toLowerCase() === selectedCustomer.toLowerCase()
                  );
                  if (agent) {
                    return (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#004b9b] text-white shadow-xs">
                        <span>🛵 {agent.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-white font-semibold">
                          {agent.commissionPercent}% Disc
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer('')}
                          className="hover:bg-white/20 rounded-md p-0.5 ml-0.5 transition cursor-pointer"
                          title="Remove selection"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }
                  if (selectedCustomer === 'Walk-in Customer') {
                    return (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-xs">
                        <span>🍽️ Walk-in Customer (Dine-in)</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer('')}
                          className="hover:bg-white/20 rounded-md p-0.5 ml-0.5 transition cursor-pointer"
                          title="Remove selection"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white shadow-xs">
                      <span>👤 {selectedCustomer}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer('')}
                        className="hover:bg-white/20 rounded-md p-0.5 ml-0.5 transition cursor-pointer"
                        title="Remove selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="modal-btn-confirm-order"
              className="px-5 py-2 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Take Order</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
