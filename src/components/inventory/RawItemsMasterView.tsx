import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RawMasterItem } from '../../types';
import { Layers, Plus, Trash2, Edit, Search, X } from 'lucide-react';

export const RawItemsMasterView: React.FC = () => {
  const { data, saveMasterItem, deleteMasterItem } = useRestaurant();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RawMasterItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState(data.purchaseCategories[0] || 'Grocery');
  const [vendor, setVendor] = useState(data.vendors[0] || 'Kader Meat Supply');
  const [uom, setUom] = useState('Kg');
  const [defaultRate, setDefaultRate] = useState<number>(0);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setCategory(data.purchaseCategories[0] || 'Grocery');
    setVendor(data.vendors[0] || 'Kader Meat Supply');
    setUom('Kg');
    setDefaultRate(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: RawMasterItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setVendor(item.vendor);
    setUom(item.uom);
    setDefaultRate(item.defaultRate);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    saveMasterItem({
      id: editingItem ? editingItem.id : undefined,
      name: name.trim(),
      category,
      vendor,
      uom,
      defaultRate: Number(defaultRate) || 0
    });

    setIsModalOpen(false);
  };

  const filteredItems = data.masterItems.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.vendor.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Raw Materials Master Catalog</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kitchen and grill raw ingredients, standard measurement units (UOM), and primary suppliers
          </p>
        </div>

        <button
          id="btn-add-raw-item"
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Raw Material</span>
        </button>
      </div>

      {/* Summary card */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Registered Raw Materials</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{data.masterItems.length} items</div>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Categories: {data.purchaseCategories.length}
        </div>
      </div>

      {/* Search */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search raw material name, category, or supplier..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="py-3 px-4 font-bold">Item Code & Name</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Default Vendor</th>
                <th className="py-3 px-4 font-bold text-center">Unit of Measure (UOM)</th>
                <th className="py-3 px-4 font-bold text-right">Standard Rate (৳)</th>
                <th className="py-3 px-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No raw materials found.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: #{item.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{item.vendor || 'N/A'}</td>
                    <td className="py-3 px-4 text-center font-extrabold text-slate-800">
                      {item.uom}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm">
                      ৳ {item.defaultRate.toLocaleString()}/{item.uom}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMasterItem(item.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingItem ? 'Edit Raw Material' : 'Add New Raw Material'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Chicken Boneless"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {data.purchaseCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Vendor</label>
                <select
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {data.vendors.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure (UOM) *</label>
                  <select
                    value={uom}
                    onChange={e => setUom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Kg">Kilogram (Kg)</option>
                    <option value="Ltr">Liter (Ltr)</option>
                    <option value="Pcs">Pieces (Pcs)</option>
                    <option value="Gm">Gram (Gm)</option>
                    <option value="Ml">Milliliter (Ml)</option>
                    <option value="Pack">Packet (Pack)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Rate (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={defaultRate === 0 ? '' : defaultRate}
                    onChange={e => setDefaultRate(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
