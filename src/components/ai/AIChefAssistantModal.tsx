import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Sparkles, X, Loader2, Plus, ChefHat, Check, DollarSign, PieChart } from 'lucide-react';

interface AIResult {
  suggestedPrice: number;
  estimatedCost: number;
  profitMarginPercent: number;
  chefTips: string;
  suggestedIngredients: Array<{
    rawName: string;
    qty: number;
    uom: string;
    estimatedRate: number;
    cost: number;
  }>;
}

export const AIChefAssistantModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data, saveMenuItem, saveMasterItem } = useRestaurant();
  const [dishName, setDishName] = useState('');
  const [department, setDepartment] = useState(data.departments[0] || 'Main Kitchen');
  const [category, setCategory] = useState(data.menuCategories[0] || 'Main Course');
  const [targetPrice, setTargetPrice] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);
  const [applied, setApplied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(false);

    try {
      const response = await fetch('/api/ai/recipe-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishName: dishName.trim(),
          department,
          category,
          targetSellingPrice: targetPrice ? Number(targetPrice) : undefined,
          existingRawItems: data.masterItems.map(m => ({ id: m.id, name: m.name, uom: m.uom, defaultRate: m.defaultRate })),
          language: 'en'
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Failed to generate recipe BOM');
      }

      setResult(resData.data);
    } catch (err: any) {
      setError(err?.message || 'Error occurred while contacting AI Chef');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToMenu = () => {
    if (!result) return;

    // Map ingredients to raw master items or create if not present
    const recipeList: Array<{ rawItemId: number; qty: number }> = [];

    result.suggestedIngredients.forEach(ing => {
      const matched = data.masterItems.find(m => m.name.toLowerCase().includes(ing.rawName.toLowerCase()) || ing.rawName.toLowerCase().includes(m.name.toLowerCase()));
      if (matched) {
        recipeList.push({ rawItemId: matched.id, qty: ing.qty });
      } else {
        // Create new raw item
        const newRawId = Date.now() + Math.floor(Math.random() * 1000);
        saveMasterItem({
          id: newRawId,
          name: ing.rawName,
          category: data.purchaseCategories[0] || 'Grocery',
          vendor: data.vendors[0] || 'Local Vendor',
          uom: ing.uom || 'Kg',
          defaultRate: ing.estimatedRate || 100
        });
        recipeList.push({ rawItemId: newRawId, qty: ing.qty });
      }
    });

    // Save menu item
    saveMenuItem({
      name: dishName,
      department,
      category,
      price: result.suggestedPrice || 500,
      cost: result.estimatedCost || 180,
      recipe: recipeList
    });

    setApplied(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <ChefHat className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                AI Chef & Recipe Costing Advisor
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-bold">
                  Gemini AI
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Enter dish name or concept — AI will automatically calculate BOM recipe ingredients and margin
              </p>
            </div>
          </div>
          <button
            id="close-ai-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-4">
          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dish Name or Concept *
              </label>
              <input
                type="text"
                id="input-ai-dish-name"
                required
                value={dishName}
                onChange={e => setDishName(e.target.value)}
                placeholder="e.g. Grilled Salmon with Lemon Butter Sauce, Rooftop Special Pizza..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              >
                {data.departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              >
                {data.menuCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Price (৳ Optional)</label>
              <input
                type="number"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 650"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-3 pt-1">
              <button
                type="submit"
                id="btn-ai-generate-recipe"
                disabled={loading || !dishName.trim()}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI Chef is analyzing recipe...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate AI Recipe & BOM Costing</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4 bg-white border border-violet-100 rounded-xl p-4 shadow-xs">
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 text-white">
                  <div className="text-[11px] text-slate-400 font-medium">Suggested Selling Price</div>
                  <div className="text-xl font-extrabold text-amber-400">
                    ৳{result.suggestedPrice.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Estimated BOM Cost</div>
                  <div className="text-xl font-extrabold text-slate-800">
                    ৳{result.estimatedCost.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium">Profit Margin</div>
                  <div className="text-xl font-extrabold text-emerald-800">
                    {result.profitMarginPercent}%
                  </div>
                </div>
              </div>

              {/* Chef Tips */}
              {result.chefTips && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <ChefHat className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Chef Kitchen Tips:</span> {result.chefTips}
                  </div>
                </div>
              )}

              {/* Ingredients Table */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Bill of Materials (Raw Ingredients)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {result.suggestedIngredients.length} ingredients
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Raw Ingredient</th>
                        <th className="py-2 px-3 font-semibold text-center">Quantity</th>
                        <th className="py-2 px-3 font-semibold text-right">Rate (৳)</th>
                        <th className="py-2 px-3 font-semibold text-right">Cost (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.suggestedIngredients.map((ing, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-800">{ing.rawName}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">
                            {ing.qty} {ing.uom}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">৳{ing.estimatedRate}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">৳{ing.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-apply-ai-dish"
                  onClick={handleApplyToMenu}
                  disabled={applied}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
                    applied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer'
                  }`}
                >
                  {applied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Successfully added to menu!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Save Menu Item & Ingredients</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
