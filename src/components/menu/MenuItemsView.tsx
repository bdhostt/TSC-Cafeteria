import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, RecipeIngredient, MenuItemVariation, MenuItemAddon, MenuItemPromo } from '../../types';
import { 
  ArrowLeft,
  Plus, 
  Trash2, 
  Edit, 
  BookOpen, 
  Search, 
  Layers, 
  Sparkles, 
  Percent,
  CheckCircle,
  AlertCircle,
  X,
  PieChart,
  DollarSign,
  Tag,
  Gift,
  Clock,
  Sliders,
  Check,
  Building2,
  ChefHat,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AIChefAssistantModal } from '../ai/AIChefAssistantModal';

export const MenuItemsView: React.FC = () => {
  const { data, saveMenuItem, deleteMenuItem, language, t, setActiveTab, setPosView, canAccessTab } = useRestaurant();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Modal active sub-tab
  const [modalTab, setModalTab] = useState<'basic' | 'recipe' | 'channels' | 'variations' | 'addons' | 'promo'>('basic');

  // Form State
  const [name, setName] = useState('');
  const [department, setDepartment] = useState(data.departments[0] || 'Main Kitchen');
  const [category, setCategory] = useState(data.menuCategories[0] || 'Steak & BBQ');
  const [price, setPrice] = useState<number>(0);
  const [recipe, setRecipe] = useState<RecipeIngredient[]>([]);

  // Multi-price list for Commission Agents / Channels
  const [channelPrices, setChannelPrices] = useState<Record<string, number>>({});

  // Variations & Pricing Options (Size, Weight, Portion, Custom)
  const [variations, setVariations] = useState<MenuItemVariation[]>([]);

  // Add-ons & Extras (Customizations)
  const [addons, setAddons] = useState<MenuItemAddon[]>([]);

  // Promo / Coupon / Direct Discount
  const [promo, setPromo] = useState<MenuItemPromo>({
    isActive: false,
    code: '',
    title: '',
    discountType: 'percent',
    discountVal: 10,
    startDate: '',
    endDate: '',
    timerDurationHours: 24
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setDepartment(data.departments[0] || 'Main Kitchen');
    setCategory(data.menuCategories[0] || 'Steak & BBQ');
    setPrice(0);
    setRecipe([]);
    
    // Initialize default channel prices based on commission agents
    const initialChannels: Record<string, number> = {};
    (data.commissionAgents || []).forEach(agent => {
      initialChannels[agent.id] = 0;
    });
    setChannelPrices(initialChannels);

    setVariations([]);
    setAddons([]);
    setPromo({
      isActive: false,
      code: '',
      title: '',
      discountType: 'percent',
      discountVal: 10,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      timerDurationHours: 24
    });
    setModalTab('basic');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDepartment(item.department);
    setCategory(item.category);
    setPrice(item.price);
    setRecipe(item.recipe || []);
    setChannelPrices(item.channelPrices || {});
    setVariations(item.variations || []);
    setAddons(item.addons || []);
    setPromo(item.promo || {
      isActive: false,
      code: '',
      title: '',
      discountType: 'percent',
      discountVal: 10,
      startDate: '',
      endDate: '',
      timerDurationHours: 24
    });
    setModalTab('basic');
    setIsModalOpen(true);
  };

  // Recipe helpers
  const handleAddIngredient = () => {
    if (data.masterItems.length === 0) {
      alert('No raw items found in master inventory. Please add raw materials first.');
      return;
    }
    const defaultRaw = data.masterItems[0];
    setRecipe(prev => [...prev, { rawItemId: defaultRaw.id, qty: 0.1 }]);
  };

  const handleUpdateIngredient = (index: number, rawItemId: number, qty: number) => {
    setRecipe(prev => {
      const arr = [...prev];
      arr[index] = { rawItemId, qty };
      return arr;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipe(prev => prev.filter((_, i) => i !== index));
  };

  // Variations helpers
  const handleAddVariation = () => {
    const newVar: MenuItemVariation = {
      id: 'var_' + Date.now().toString().slice(-4),
      name: variations.length === 0 ? 'Small (Single)' : variations.length === 1 ? 'Medium (1:2)' : 'Large (Full / 1:3)',
      criteria: 'Size',
      price: price > 0 ? Math.round(price * (variations.length === 0 ? 0.75 : variations.length === 1 ? 1.0 : 1.4)) : 250,
      cost: Math.round(calculatedCost * (variations.length === 0 ? 0.75 : variations.length === 1 ? 1.0 : 1.4)),
      recipeMultiplier: variations.length === 0 ? 0.75 : variations.length === 1 ? 1.0 : 1.4
    };
    setVariations(prev => [...prev, newVar]);
  };

  const handleUpdateVariation = (index: number, field: keyof MenuItemVariation, value: any) => {
    setVariations(prev => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: value };
      return arr;
    });
  };

  const handleRemoveVariation = (index: number) => {
    setVariations(prev => prev.filter((_, i) => i !== index));
  };

  // Addons helpers
  const handleAddAddon = () => {
    const newAddon: MenuItemAddon = {
      id: 'add_' + Date.now().toString().slice(-4),
      name: 'Extra Cheese Slice',
      price: 50,
      rawItemId: data.masterItems[0]?.id
    };
    setAddons(prev => [...prev, newAddon]);
  };

  const handleUpdateAddon = (index: number, field: keyof MenuItemAddon, value: any) => {
    setAddons(prev => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: value };
      return arr;
    });
  };

  const handleRemoveAddon = (index: number) => {
    setAddons(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate making cost based on recipe ingredients
  const calculatedCost = recipe.reduce((sum, ing) => {
    const raw = data.masterItems.find(m => m.id === ing.rawItemId);
    const rate = raw ? raw.defaultRate : 0;
    return sum + (rate * (Number(ing.qty) || 0));
  }, 0);

  const bomCostPct = price > 0 ? ((calculatedCost / price) * 100) : 0;
  const grossMarginPct = price > 0 ? (((price - calculatedCost) / price) * 100) : 0;

  // Auto-calculate suggested channel prices based on agent commission
  const handleAutoSuggestChannelPrices = () => {
    if (price <= 0) {
      alert('Please enter a base selling price first.');
      return;
    }
    const updated: Record<string, number> = { ...channelPrices };
    (data.commissionAgents || []).forEach(agent => {
      // E.g. If agent takes 20% commission, price might be price * (1 + comm%) or multiplier
      const multiplier = agent.priceListMultiplier || (1 + (agent.commissionPercent / 100));
      updated[agent.id] = Math.round(price * multiplier);
    });
    setChannelPrices(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    saveMenuItem({
      id: editingItem ? editingItem.id : undefined,
      name: name.trim(),
      department,
      category,
      price: Number(price) || 0,
      cost: Math.round(calculatedCost),
      recipe,
      channelPrices,
      variations: variations.filter(v => v.name.trim() !== ''),
      addons: addons.filter(a => a.name.trim() !== ''),
      promo: promo.isActive ? promo : undefined
    });

    setIsModalOpen(false);
  };

  const filteredItems = data.menuItems.filter(item => {
    if (selectedDept !== 'ALL' && item.department !== selectedDept) return false;
    if (selectedCat !== 'ALL' && item.category !== selectedCat) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchPromo = item.promo?.code?.toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchPromo) return false;
    }
    return true;
  });

  const validItemsForAvg = data.menuItems.filter(i => i.price > 0 && (i.cost || 0) > 0);
  const avgFoodCostPct = validItemsForAvg.length > 0
    ? (validItemsForAvg.reduce((sum, i) => sum + (((i.cost || 0) / i.price) * 100), 0) / validItemsForAvg.length).toFixed(1)
    : '0.0';

  const withRecipesCount = data.menuItems.filter(i => i.recipe && i.recipe.length > 0).length;
  const withVariationsCount = data.menuItems.filter(i => i.variations && i.variations.length > 0).length;
  const withPromoCount = data.menuItems.filter(i => i.promo && i.promo.isActive).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#004b9b]" />
            <span>Menu, Multi-Pricing & Variations Hub</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure Multi-Channel Delivery Prices (Foodpanda/Pathao/Foodi), Dish Variations, Add-ons & Promo Coupon Offers
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canAccessTab('pos') && (
            <button
              onClick={() => {
                setActiveTab('pos');
                setPosView('floor');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
              title="Return to POS Visual Table Floor"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Live POS</span>
            </button>
          )}

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Recipe Assistant</span>
          </button>

          <button
            id="btn-add-menu-item"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl text-[#004b9b] border border-blue-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{data.menuItems.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Menu Dishes</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-200">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-700">{avgFoodCostPct}%</div>
            <div className="text-xs text-slate-500 font-medium">Average BOM Cost %</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-200">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-blue-700">{withVariationsCount} Dishes</div>
            <div className="text-xs text-slate-500 font-medium">With Size & Add-ons</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 border border-rose-200">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-700">{withPromoCount} Active</div>
            <div className="text-xs text-slate-500 font-medium">Promo Offers & Coupons</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50/50">
          <div className="relative w-full sm:w-80 md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dish by name, category, or promo code..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Kitchen Depts</option>
              {data.departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Categories</option>
              {data.menuCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Dish & Details</th>
                <th className="py-3 px-4">Dept / Category</th>
                <th className="py-3 px-4 text-right">Cost (BOM)</th>
                <th className="py-3 px-4 text-right">Base Dine-in Price</th>
                <th className="py-3 px-4">Channel Prices (Agent)</th>
                <th className="py-3 px-4">Variations & Add-ons</th>
                <th className="py-3 px-4">Promo / Discount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No menu items found. Click "+ Add Menu Item" to create one.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const costVal = item.cost || 0;
                  const bomPercent = item.price > 0 
                    ? ((costVal / item.price) * 100)
                    : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: #{item.id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{item.department}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 font-mono text-xs">
                          ৳ {costVal.toLocaleString()}
                        </div>
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-black ${
                          bomPercent <= 32 ? 'bg-emerald-100 text-emerald-800' : bomPercent <= 42 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {bomPercent.toFixed(1)}% BOM
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-amber-600 text-sm font-mono">
                          ৳ {item.price.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">Standard</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 text-[11px]">
                          {data.commissionAgents && data.commissionAgents.length > 0 ? (
                            data.commissionAgents.map(ag => {
                              const chPrice = item.channelPrices?.[ag.id] || Math.round(item.price * (ag.priceListMultiplier || 1));
                              return (
                                <div key={ag.id} className="flex items-center justify-between gap-2">
                                  <span className="text-slate-500 font-medium">{ag.name}:</span>
                                  <span className="font-extrabold text-slate-900 font-mono">৳ {chPrice}</span>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 italic">No agents configured</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {item.variations && item.variations.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.variations.map((v, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                                  {v.name}: ৳{v.price}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Standard size</span>
                          )}

                          {item.addons && item.addons.length > 0 && (
                            <div className="text-[10px] text-slate-500">
                              +{item.addons.length} Add-ons available
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.promo && item.promo.isActive ? (
                          <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg">
                            <div className="flex items-center gap-1 font-black text-rose-700 text-[11px]">
                              <Tag className="w-3 h-3" />
                              <span>{item.promo.code}</span>
                            </div>
                            <div className="text-[10px] text-rose-600 font-semibold">
                              {item.promo.discountVal}{item.promo.discountType === 'percent' ? '%' : '৳'} OFF
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No active promo</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            title="Edit Dish, Pricing & Variations"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              deleteMenuItem(item.id);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                            title="Delete Menu Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {editingItem ? `Edit Dish: ${editingItem.name}` : 'Add New Menu Item'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure multi-channel selling prices, variations, add-ons, and promo discounts</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-tabs */}
            <div className="flex gap-2 border-b border-slate-200 pt-2 overflow-x-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => setModalTab('basic')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  modalTab === 'basic' ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>1. Basic & Price</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('channels')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  modalTab === 'channels' ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>2. Agent Channel Prices</span>
                {(data.commissionAgents || []).length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded-full text-[10px]">
                    {(data.commissionAgents || []).length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('variations')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  modalTab === 'variations' ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>3. Variations & Sizes</span>
                {variations.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 rounded-full text-[10px]">
                    {variations.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('addons')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  modalTab === 'addons' ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>4. Add-ons & Extras</span>
                {addons.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 rounded-full text-[10px]">
                    {addons.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('promo')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  modalTab === 'promo' ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>5. Promo & Coupon</span>
                {promo.isActive && (
                  <span className="px-1.5 py-0.2 bg-rose-100 text-rose-900 rounded-full text-[10px]">
                    Active
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('recipe')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  modalTab === 'recipe' ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>6. BOM Recipe Cost</span>
                {recipe.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-900 rounded-full text-[10px]">
                    {recipe.length}
                  </span>
                )}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto my-3 pr-1 space-y-4">
              {/* TAB 1: BASIC & BASE PRICE */}
              {modalTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Dish Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Mixed Grill Platter (Special)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kitchen Department *</label>
                      <select
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        {data.departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Menu Category *</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        {data.menuCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Base Selling Price (৳) (Dine-in) *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={price === 0 ? '' : price}
                          onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-extrabold text-amber-700 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Recipe BOM Making Cost (৳)</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-sm font-bold text-slate-800">
                        ৳ {Math.round(calculatedCost).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">Live Profit & Margin Metrics</div>
                      <div className="text-[11px] text-slate-500">
                        Food cost ratio relative to menu selling price
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base font-black text-blue-700">{bomCostPct.toFixed(1)}%</div>
                        <div className="text-[10px] text-slate-500 font-bold">BOM Cost %</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-emerald-700">{grossMarginPct.toFixed(1)}%</div>
                        <div className="text-[10px] text-emerald-600 font-bold">Gross Margin %</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AGENT CHANNEL PRICES */}
              {modalTab === 'channels' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                    <div>
                      <h4 className="font-extrabold text-xs text-amber-950">Multi-Channel Pricing (Delivery Portals / Agents)</h4>
                      <p className="text-[11px] text-amber-800">
                        Set higher selling prices for Foodpanda, Pathao, Foodi, etc., so you compensate for their commission fees.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoSuggestChannelPrices}
                      className="px-3 py-1.5 bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs rounded-xl transition cursor-pointer shrink-0"
                    >
                      Auto-Calculate
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(data.commissionAgents || []).length === 0 ? (
                      <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
                        No commission agents configured. Go to Master Configurations to add delivery portals.
                      </div>
                    ) : (
                      (data.commissionAgents || []).map(agent => {
                        const currentVal = channelPrices[agent.id] !== undefined ? channelPrices[agent.id] : Math.round(price * (agent.priceListMultiplier || 1));
                        return (
                          <div key={agent.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <div>
                              <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                <span>{agent.name}</span>
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-black">
                                  {agent.commissionPercent}% Commission
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Default multiplier: {agent.priceListMultiplier}x (Base price: ৳{price})
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-600">Channel Price:</span>
                              <div className="relative w-32">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">৳</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={currentVal || ''}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setChannelPrices(prev => ({ ...prev, [agent.id]: val }));
                                  }}
                                  placeholder="0"
                                  className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DISH VARIATIONS & PRICING OPTIONS */}
              {modalTab === 'variations' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                        Dish Variations & Pricing Options
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Define options based on Size (Small/Medium/Large), Weight (250g/500g/1kg), Portion (1:1, 1:2, 1:3), or custom criteria.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVariation}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variation</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {variations.length === 0 ? (
                      <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
                        No variations defined. Click "+ Add Variation" if this dish has multiple sizes or portion options.
                      </div>
                    ) : (
                      variations.map((v, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Option Name *</label>
                              <input
                                type="text"
                                value={v.name}
                                onChange={e => handleUpdateVariation(idx, 'name', e.target.value)}
                                placeholder="e.g. Half / Full / 1:2"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Criteria</label>
                              <select
                                value={v.criteria || 'Size'}
                                onChange={e => handleUpdateVariation(idx, 'criteria', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                              >
                                <option value="Size">Size (Small/Med/Large)</option>
                                <option value="Portion">Portion (1:1 / 1:2 / 1:4)</option>
                                <option value="Weight">Weight (250g / 500g)</option>
                                <option value="Custom">Custom Criteria</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Selling Price (৳) *</label>
                              <input
                                type="number"
                                min="0"
                                value={v.price}
                                onChange={e => handleUpdateVariation(idx, 'price', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-amber-700 text-right"
                              />
                            </div>

                            <div className="flex items-end gap-1">
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">BOM Factor</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={v.recipeMultiplier || 1.0}
                                  onChange={e => handleUpdateVariation(idx, 'recipeMultiplier', parseFloat(e.target.value) || 1.0)}
                                  placeholder="1.0x"
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-900"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveVariation(idx)}
                                className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ADD-ONS & EXTRAS (CUSTOMIZATIONS) */}
              {modalTab === 'addons' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                        Add-ons & Extras (Customizations)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Attach extra cheese, premium toppings, sides, extra dips, or beverages to this dish.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAddon}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Extra</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {addons.length === 0 ? (
                      <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
                        No add-ons or customizations attached. Click "+ Add Extra" to offer extra cheese, toppings, or sides.
                      </div>
                    ) : (
                      addons.map((a, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={a.name}
                              onChange={e => handleUpdateAddon(idx, 'name', e.target.value)}
                              placeholder="e.g. Extra Mozzarella Cheese"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                            />
                          </div>

                          <div className="w-28 relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">৳</span>
                            <input
                              type="number"
                              min="0"
                              value={a.price}
                              onChange={e => handleUpdateAddon(idx, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="Price"
                              className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-emerald-700"
                            />
                          </div>

                          <div className="w-40">
                            <select
                              value={a.rawItemId || ''}
                              onChange={e => handleUpdateAddon(idx, 'rawItemId', parseInt(e.target.value) || undefined)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700"
                            >
                              <option value="">No Raw Link</option>
                              {data.masterItems.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAddon(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: PROMO / COUPON / DIRECT DISCOUNT */}
              {modalTab === 'promo' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <Gift className="w-5 h-5 text-rose-600" />
                      <div>
                        <h4 className="font-extrabold text-xs text-rose-950">Special Promotion / Coupon / Direct Discount</h4>
                        <p className="text-[11px] text-rose-700">Assign promo coupon code, direct discount value, or timed discount offer</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={promo.isActive}
                        onChange={e => setPromo(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>

                  {promo.isActive && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Coupon / Promo Code *</label>
                        <input
                          type="text"
                          value={promo.code}
                          onChange={e => setPromo(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          placeholder="e.g. GRILL20 or FLAT50"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black tracking-wider text-rose-700 uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Promotion Title / Note</label>
                        <input
                          type="text"
                          value={promo.title || ''}
                          onChange={e => setPromo(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g. Weekend Flash Sale Offer"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type & Value</label>
                        <div className="flex gap-2">
                          <select
                            value={promo.discountType}
                            onChange={e => setPromo(prev => ({ ...prev, discountType: e.target.value as any }))}
                            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                          >
                            <option value="percent">% Percent Discount</option>
                            <option value="taka">৳ Direct BDT Value</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            value={promo.discountVal}
                            onChange={e => setPromo(prev => ({ ...prev, discountVal: parseFloat(e.target.value) || 0 }))}
                            className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-rose-700 text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Duration Timer (Hours)</label>
                        <div className="relative">
                          <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            min="1"
                            value={promo.timerDurationHours || 24}
                            onChange={e => setPromo(prev => ({ ...prev, timerDurationHours: parseInt(e.target.value) || 24 }))}
                            placeholder="24"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: BOM RECIPE INGREDIENTS */}
              {modalTab === 'recipe' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                        Recipe Ingredients (Bill of Materials)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Ingredients are automatically deducted from stock when this dish is sold at POS.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="px-2.5 py-1 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Ingredient</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recipe.length === 0 ? (
                      <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
                        No ingredients configured yet. Click "+ Add Ingredient" to link raw materials.
                      </div>
                    ) : (
                      recipe.map((ing, idx) => {
                        const selectedRaw = data.masterItems.find(m => m.id === ing.rawItemId);
                        const cost = (selectedRaw?.defaultRate || 0) * (Number(ing.qty) || 0);

                        return (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                            <div className="flex-1">
                              <select
                                value={ing.rawItemId}
                                onChange={e => handleUpdateIngredient(idx, parseInt(e.target.value), ing.qty)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                              >
                                {data.masterItems.map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.uom}) — ৳{m.defaultRate}/{m.uom}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="w-24">
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                required
                                value={ing.qty}
                                onChange={e => handleUpdateIngredient(idx, ing.rawItemId, parseFloat(e.target.value) || 0)}
                                placeholder="Quantity"
                                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-900"
                              />
                            </div>

                            <div className="w-16 text-slate-500 font-semibold">
                              {selectedRaw?.uom}
                            </div>

                            <div className="w-20 text-right font-bold text-slate-800">
                              ৳{cost.toFixed(1)}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="Remove ingredient"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-extrabold text-sm shadow-md transition cursor-pointer"
                >
                  Save Dish & Pricing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {isAiModalOpen && <AIChefAssistantModal onClose={() => setIsAiModalOpen(false)} />}
    </div>
  );
};
