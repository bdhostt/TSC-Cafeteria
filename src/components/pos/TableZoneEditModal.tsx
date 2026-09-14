import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  X,
  LayoutGrid,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
  Building2,
  Shield,
  Layers,
  Sparkles,
  Search,
  Scaling,
  AlertTriangle,
  MapPin
} from 'lucide-react';

export const TABLE_SIZE_PRESETS = {
  compact: { width: 110, height: 75 },
  medium: { width: 150, height: 100 },
  large: { width: 200, height: 135 },
  xl: { width: 260, height: 175 }
} as const;

export const TableZoneEditModal: React.FC = () => {
  const {
    data,
    currentUser,
    isTableZoneModalOpen,
    setIsTableZoneModalOpen,
    addCustomTable,
    editCustomTable,
    deleteCustomTable,
    addTableZone,
    editTableZone,
    deleteTableZone,
    updateGlobalTableDimensions
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'size' | 'tables' | 'zones'>('size');

  // Sizing State
  const [dimensions, setDimensions] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_table_global_dims');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          (parsed.width === 210 && parsed.height === 140) ||
          (parsed.width === 147 && parsed.height === 98)
        ) {
          return TABLE_SIZE_PRESETS.compact;
        }
        if (parsed.width && parsed.height) return parsed;
      }
    } catch {}
    return TABLE_SIZE_PRESETS.compact;
  });

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // New Table Form
  const [newTableName, setNewTableName] = useState('');
  const [newTableZone, setNewTableZone] = useState(() => {
    return data.tableZones && data.tableZones.length > 0 ? data.tableZones[0] : 'Floor 1';
  });

  // Table Editing State
  const [editingTableIndex, setEditingTableIndex] = useState<number | null>(null);
  const [editTableName, setEditTableName] = useState('');
  const [editTableZoneVal, setEditTableZoneVal] = useState('');
  const [tableSearch, setTableSearch] = useState('');

  // New Zone Form
  const [newZoneName, setNewZoneName] = useState('');
  const [editingZoneOldName, setEditingZoneOldName] = useState<string | null>(null);
  const [editingZoneNewName, setEditingZoneNewName] = useState('');

  if (!isTableZoneModalOpen) return null;

  // Security Check: Only Admin can access
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Admin Permission Required</h3>
          <p className="text-xs text-slate-500">
            Table & Zone configuration is strictly restricted to Executive Admin accounts.
          </p>
          <button
            type="button"
            onClick={() => setIsTableZoneModalOpen(false)}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const showSuccess = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handlePresetSelect = (presetKey: keyof typeof TABLE_SIZE_PRESETS) => {
    const preset = TABLE_SIZE_PRESETS[presetKey];
    setDimensions(preset);
  };

  const handleApplyDimensions = () => {
    try {
      localStorage.setItem('pos_table_global_dims', JSON.stringify(dimensions));
      localStorage.removeItem('pos_table_custom_dims');
      window.dispatchEvent(new CustomEvent('pos_table_dimensions_updated', { detail: dimensions }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    updateGlobalTableDimensions(dimensions);
    showSuccess(`✅ Applied size (${dimensions.width}px × ${dimensions.height}px) to all ${data.tables.length} tables!`);
  };

  const handleResetDimensions = () => {
    setDimensions(TABLE_SIZE_PRESETS.compact);
    try {
      localStorage.setItem('pos_table_global_dims', JSON.stringify(TABLE_SIZE_PRESETS.compact));
      localStorage.removeItem('pos_table_custom_dims');
      window.dispatchEvent(new CustomEvent('pos_table_dimensions_updated', { detail: TABLE_SIZE_PRESETS.compact }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    updateGlobalTableDimensions(TABLE_SIZE_PRESETS.compact);
    showSuccess('🔄 Table size reset to compact default!');
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTableName.trim();
    if (!trimmed) return;

    addCustomTable(trimmed, newTableZone);
    setNewTableName('');
    showSuccess(`✅ New table "${trimmed}" (${newTableZone}) added successfully!`);
  };

  const handleStartEditTable = (index: number) => {
    const tbl = data.tables[index];
    if (!tbl) return;
    setEditingTableIndex(index);
    setEditTableName(tbl.name);
    setEditTableZoneVal(tbl.zone || (data.tableZones[0] || 'Floor 1'));
  };

  const handleSaveEditTable = (index: number) => {
    const trimmed = editTableName.trim();
    if (!trimmed) return;

    editCustomTable(index, trimmed, editTableZoneVal);
    setEditingTableIndex(null);
    showSuccess(`✅ Table info updated!`);
  };

  const handleDeleteTable = (index: number) => {
    const tbl = data.tables[index];
    if (!tbl) return;

    if (tbl.status !== 'free' || (tbl.cart && tbl.cart.length > 0)) {
      const confirmDelete = window.confirm(
        `⚠️ Table "${tbl.name}" has running orders! Are you sure you want to delete it?`
      );
      if (!confirmDelete) return;
    } else {
      const confirmDelete = window.confirm(`Delete table "${tbl.name}"?`);
      if (!confirmDelete) return;
    }

    deleteCustomTable(index);
    showSuccess(`🗑️ Table "${tbl.name}" deleted!`);
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newZoneName.trim();
    if (!trimmed) return;

    if (data.tableZones.some(z => z.toLowerCase() === trimmed.toLowerCase())) {
      alert('A zone with this name already exists!');
      return;
    }

    addTableZone(trimmed);
    setNewZoneName('');
    showSuccess(`✅ New floor zone "${trimmed}" created!`);
  };

  const handleStartEditZone = (zone: string) => {
    setEditingZoneOldName(zone);
    setEditingZoneNewName(zone);
  };

  const handleSaveEditZone = () => {
    if (!editingZoneOldName) return;
    const trimmed = editingZoneNewName.trim();
    if (!trimmed || trimmed === editingZoneOldName) {
      setEditingZoneOldName(null);
      return;
    }

    editTableZone(editingZoneOldName, trimmed);
    setEditingZoneOldName(null);
    showSuccess(`✅ Zone "${editingZoneOldName}" updated to "${trimmed}"!`);
  };

  const handleDeleteZone = (zone: string) => {
    if (data.tableZones.length <= 1) {
      alert('At least 1 zone must remain on the floor!');
      return;
    }

    const tableCount = data.tables.filter(t => t.zone === zone).length;
    const confirmDelete = window.confirm(
      `Delete zone "${zone}"? All ${tableCount} tables in this zone will be moved to default zone.`
    );
    if (!confirmDelete) return;

    deleteTableZone(zone);
    showSuccess(`🗑️ Zone "${zone}" deleted!`);
  };

  const filteredTables = data.tables.map((t, idx) => ({ ...t, originalIndex: idx })).filter(t => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.zone || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="table-zone-edit-modal"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-[#002652] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#004b9b] text-white flex items-center justify-center font-black shadow-md shrink-0">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Table & Floor Zone Management
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Customize table card dimensions, manage tables and floor zones
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-table-zone-modal"
            onClick={() => setIsTableZoneModalOpen(false)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0 gap-2 overflow-x-auto">
          <button
            type="button"
            id="tab-table-sizing"
            onClick={() => setActiveTab('size')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'size'
                ? 'border-[#004b9b] text-[#004b9b] bg-white rounded-t-lg shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scaling className="w-4 h-4 text-[#004b9b]" />
            <span>Card Sizing & Layout</span>
          </button>

          <button
            type="button"
            id="tab-manage-tables"
            onClick={() => setActiveTab('tables')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'tables'
                ? 'border-[#004b9b] text-[#004b9b] bg-white rounded-t-lg shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-[#004b9b]" />
            <span>Manage Tables ({data.tables.length})</span>
          </button>

          <button
            type="button"
            id="tab-manage-zones"
            onClick={() => setActiveTab('zones')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'zones'
                ? 'border-[#004b9b] text-[#004b9b] bg-white rounded-t-lg shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-[#004b9b]" />
            <span>Floor Zones ({data.tableZones.length})</span>
          </button>
        </div>

        {/* Feedback alert */}
        {feedbackMsg && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{feedbackMsg}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: SIZING & LAYOUT */}
          {activeTab === 'size' && (
            <div className="space-y-6">
              {/* Presets */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                  Quick Size Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(Object.keys(TABLE_SIZE_PRESETS) as Array<keyof typeof TABLE_SIZE_PRESETS>).map((k) => {
                    const preset = TABLE_SIZE_PRESETS[k];
                    const isSelected = dimensions.width === preset.width && dimensions.height === preset.height;
                    const labels = {
                      compact: 'Small (Compact)',
                      medium: 'Medium (Standard)',
                      large: 'Large (Spacious)',
                      xl: 'Extra Large (XL)'
                    };
                    return (
                      <button
                        key={k}
                        type="button"
                        id={`btn-preset-${k}`}
                        onClick={() => handlePresetSelect(k)}
                        className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-[#004b9b] bg-blue-50/70 ring-2 ring-blue-400/30'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-black text-slate-900">{labels[k]}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          {preset.width}px × {preset.height}px
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#004b9b]" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Custom Dimension Sliders
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Width slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Card Width:</span>
                      <span className="font-mono font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                        {dimensions.width} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="360"
                      step="5"
                      value={dimensions.width}
                      onChange={(e) => setDimensions({ ...dimensions, width: Number(e.target.value) })}
                      className="w-full accent-[#004b9b] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>80px (Compact)</span>
                      <span>360px (Wide)</span>
                    </div>
                  </div>

                  {/* Height slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Card Height:</span>
                      <span className="font-mono font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                        {dimensions.height} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="55"
                      max="260"
                      step="5"
                      value={dimensions.height}
                      onChange={(e) => setDimensions({ ...dimensions, height: Number(e.target.value) })}
                      className="w-full accent-[#004b9b] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>55px (Short)</span>
                      <span>260px (Tall)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                  Live Visual Preview
                </label>
                <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-x-auto min-h-[160px]">
                  {(() => {
                    const isUltraCompact = dimensions.height < 115 || dimensions.width < 165;
                    const isCompact = dimensions.height < 155 || dimensions.width < 225;
                    const isLarge = dimensions.height >= 215 || dimensions.width >= 330;

                    const cardPadding = isUltraCompact ? 'p-2 rounded-xl' : isCompact ? 'p-3 rounded-xl' : isLarge ? 'p-6 rounded-2xl' : 'p-4 rounded-2xl';
                    const titleSize = isUltraCompact ? 'text-xs sm:text-sm font-black' : isCompact ? 'text-base font-black' : isLarge ? 'text-2xl font-black' : 'text-xl font-black';

                    return (
                      <div
                        style={{
                          width: `${dimensions.width}px`,
                          minHeight: `${dimensions.height}px`,
                          height: `${dimensions.height}px`
                        }}
                        className={`${cardPadding} bg-emerald-500 border-2 border-emerald-600 text-white rounded-2xl shadow-md flex flex-col items-center justify-center text-center transition-all duration-150 select-none overflow-hidden`}
                      >
                        <h3 className={`${titleSize} text-white tracking-tight drop-shadow-xs leading-tight`}>
                          Table 01
                        </h3>
                        <div className={`inline-flex items-center gap-1 font-bold text-emerald-100 mt-0.5 ${isUltraCompact ? 'text-[9px]' : isCompact ? 'text-[10px]' : isLarge ? 'text-xs' : 'text-[11px]'}`}>
                          <MapPin className={`${isUltraCompact ? 'w-2 h-2' : isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-200 shrink-0`} />
                          <span>Floor 1</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Save / Apply buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-reset-dimensions-modal"
                  onClick={handleResetDimensions}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Default</span>
                </button>

                <button
                  type="button"
                  id="btn-apply-all-modal"
                  onClick={handleApplyDimensions}
                  className="px-5 py-2.5 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs shadow-md flex items-center gap-2 transition cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Apply Size to All Tables</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE TABLES */}
          {activeTab === 'tables' && (
            <div className="space-y-5">
              {/* Add New Table Form */}
              <form onSubmit={handleAddTable} className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#004b9b]" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Add New Table (Add New Table)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Table Name / Number *
                    </label>
                    <input
                      type="text"
                      id="input-new-table-name"
                      placeholder="e.g. Table 08, VIP 03, Rooftop 02"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#004b9b]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Floor Zone *
                    </label>
                    <select
                      id="select-new-table-zone"
                      value={newTableZone}
                      onChange={(e) => setNewTableZone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#004b9b] cursor-pointer"
                    >
                      {data.tableZones.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    id="btn-submit-new-table"
                    className="px-4 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Table</span>
                  </button>
                </div>
              </form>

              {/* Table List & Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Existing Tables ({data.tables.length} Total)
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search table name or zone..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#004b9b]"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-[340px] overflow-y-auto">
                  {filteredTables.map((tbl) => {
                    const isEditing = editingTableIndex === tbl.originalIndex;
                    return (
                      <div
                        key={tbl.id}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                      >
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={editTableName}
                              onChange={(e) => setEditTableName(e.target.value)}
                              className="px-2.5 py-1 bg-white border border-[#004b9b] rounded-lg text-xs font-bold text-slate-900 w-36"
                              autoFocus
                            />
                            <select
                              value={editTableZoneVal}
                              onChange={(e) => setEditTableZoneVal(e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                            >
                              {data.tableZones.map((z) => (
                                <option key={z} value={z}>{z}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleSaveEditTable(tbl.originalIndex)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTableIndex(null)}
                              className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-black flex items-center justify-center text-xs shrink-0 border border-slate-200">
                              {tbl.name.replace(/[^0-9]/g, '') || tbl.name.charAt(0)}
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                                <span>{tbl.name}</span>
                                <span className="text-[10px] px-2 py-0.2 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                                  {tbl.zone || 'Floor 1'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                Status:{' '}
                                <span className={tbl.status === 'free' ? 'text-emerald-600 font-bold' : 'text-[#004b9b] font-bold'}>
                                  {tbl.status.toUpperCase()}
                                </span>
                                {tbl.cart && tbl.cart.length > 0 && ` • ${tbl.cart.length} items in cart`}
                              </div>
                            </div>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditTable(tbl.originalIndex)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit Table"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTable(tbl.originalIndex)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Table"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FLOOR ZONES */}
          {activeTab === 'zones' && (
            <div className="space-y-5">
              {/* Add Zone Form */}
              <form onSubmit={handleAddZone} className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#004b9b]" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Add New Floor Zone
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="input-new-zone-name"
                    placeholder="e.g. Ground Floor, Family Section, Garden Terrace"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#004b9b]"
                    required
                  />
                  <button
                    type="submit"
                    id="btn-submit-new-zone"
                    className="px-4 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Zone</span>
                  </button>
                </div>
              </form>

              {/* Zones List */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Configured Floor Zones ({data.tableZones.length} Zones)
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {data.tableZones.map((zone) => {
                    const isEditing = editingZoneOldName === zone;
                    const tableCount = data.tables.filter((t) => t.zone === zone).length;

                    return (
                      <div
                        key={zone}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                      >
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingZoneNewName}
                              onChange={(e) => setEditingZoneNewName(e.target.value)}
                              className="px-2.5 py-1 bg-white border border-[#004b9b] rounded-lg text-xs font-bold text-slate-900 flex-1 max-w-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleSaveEditZone}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingZoneOldName(null)}
                              className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0 border border-blue-200">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-900">{zone}</div>
                              <div className="text-[10px] text-slate-400 font-semibold">
                                {tableCount} Active {tableCount === 1 ? 'Table' : 'Tables'}
                              </div>
                            </div>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditZone(zone)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                              title="Rename Zone"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteZone(zone)}
                              disabled={data.tableZones.length <= 1}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                              title="Delete Zone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Changes are saved instantly and synchronized across the POS Floor
          </span>
          <button
            type="button"
            id="btn-close-table-zone-footer"
            onClick={() => setIsTableZoneModalOpen(false)}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer ml-auto"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
