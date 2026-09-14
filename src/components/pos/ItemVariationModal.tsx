import React, { useState } from 'react';
import { MenuItem, MenuItemVariation, MenuItemAddon } from '../../types';
import { 
  X, 
  Plus, 
  Minus, 
  ChefHat, 
  Check, 
  Layers, 
  Sparkles, 
  Tag, 
  ShoppingCart,
  Percent
} from 'lucide-react';

interface ItemVariationModalProps {
  item: MenuItem;
  tableName: string;
  channelOrAgentName?: string;
  channelMultiplier?: number;
  channelPrice?: number;
  onAddToCart: (
    item: MenuItem, 
    variation?: MenuItemVariation, 
    addons?: MenuItemAddon[], 
    qty?: number, 
    notes?: string
  ) => void;
  onClose: () => void;
}

export const ItemVariationModal: React.FC<ItemVariationModalProps> = ({
  item,
  tableName,
  channelOrAgentName,
  channelMultiplier = 1,
  channelPrice,
  onAddToCart,
  onClose
}) => {
  const variations = item.variations || [];
  const availableAddons = item.addons || [];

  // Selected state
  const [selectedVariation, setSelectedVariation] = useState<MenuItemVariation | undefined>(
    variations.length > 0 ? variations[0] : undefined
  );
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);
  const [qty, setQty] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  // Calculate base price taking channel into account
  let basePrice = item.price;
  if (channelPrice && channelPrice > 0) {
    basePrice = channelPrice;
  } else if (channelMultiplier && channelMultiplier > 1) {
    basePrice = Math.round(item.price * channelMultiplier);
  }

  // Current unit price calculation
  let unitPrice = basePrice;
  if (selectedVariation) {
    unitPrice = selectedVariation.price;
    if (channelMultiplier && channelMultiplier > 1 && (!channelPrice || channelPrice <= 0)) {
      unitPrice = Math.round(selectedVariation.price * channelMultiplier);
    }
  }

  // Addons total
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalUnitPrice = unitPrice + addonsTotal;
  const totalPrice = totalUnitPrice * qty;

  const toggleAddon = (addon: MenuItemAddon) => {
    setSelectedAddons(prev => {
      const exists = prev.some(a => a.id === addon.id || a.name === addon.name);
      if (exists) {
        return prev.filter(a => a.id !== addon.id && a.name !== addon.name);
      }
      return [...prev, addon];
    });
  };

  const handleConfirm = () => {
    onAddToCart(item, selectedVariation, selectedAddons, qty, notes.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#004b9b] text-white font-black text-xs">
                {tableName}
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {item.category}
              </span>
              {channelOrAgentName && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold text-[10px]">
                  🛵 {channelOrAgentName}
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg mt-1">
              {item.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-5 custom-scrollbar">
          {/* 1. Variations / Portion / Size selector */}
          {variations.length > 0 && (
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#004b9b]" />
                <span>Select Portion / Size *</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variations.map(v => {
                  const isSelected = selectedVariation?.id === v.id || selectedVariation?.name === v.name;
                  const vPrice = (channelMultiplier && channelMultiplier > 1) 
                    ? Math.round(v.price * channelMultiplier) 
                    : v.price;

                  return (
                    <button
                      key={v.id || v.name}
                      type="button"
                      onClick={() => setSelectedVariation(v)}
                      className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#004b9b] bg-blue-50/80 shadow-xs ring-2 ring-blue-400/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">{v.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#004b9b] shrink-0" />}
                      </div>
                      <div className="mt-2 text-xs font-extrabold text-slate-900">
                        ৳ {vPrice.toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Add-ons & Extra Customizations */}
          {availableAddons.length > 0 && (
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Add-ons & Extras (Optional)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableAddons.map(a => {
                  const isChecked = selectedAddons.some(sel => sel.id === a.id || sel.name === a.name);

                  return (
                    <button
                      key={a.id || a.name}
                      type="button"
                      onClick={() => toggleAddon(a)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-xs">{a.name}</span>
                      </div>
                      <span className="text-xs font-extrabold text-indigo-950">+৳{a.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Special Instructions / Kitchen Note */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-rose-500" />
              <span>Kitchen Cooking Note</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Less spicy, Extra sauce on side, No onions..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004b9b]"
            />
          </div>

          {/* 4. Quantity Adjuster */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-xs font-extrabold text-slate-700">Order Quantity:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center font-black text-sm text-slate-900">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="w-8 h-8 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white flex items-center justify-center font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer with Total Price & Add Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Total Item Amount</div>
            <div className="text-xl font-black text-slate-900">
              ৳ {totalPrice.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-confirm-add-variation-cart"
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Add to Order (৳{totalPrice.toLocaleString()})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
