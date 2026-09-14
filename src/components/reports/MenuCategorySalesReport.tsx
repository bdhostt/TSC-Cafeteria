import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { ReportFilters, DatePreset, exportCsvHelper } from './ReportFilters';
import { 
  FolderTree, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Utensils, 
  Layers, 
  Printer, 
  FileSpreadsheet, 
  Search, 
  Flame, 
  ChefHat, 
  Eye, 
  X,
  PieChart,
  Tag
} from 'lucide-react';
import { SaleRecord, MenuItem } from '../../types';

export const MenuCategorySalesReport: React.FC = () => {
  const { data } = useRestaurant();

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'revenue' | 'qty' | 'itemCount'>('revenue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeCategoryDrilldown, setActiveCategoryDrilldown] = useState<string | null>(null);

  // Department options
  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    (data.menuItems || []).forEach(m => {
      if (m.department) depts.add(m.department);
    });
    (data.departments || []).forEach(d => depts.add(d));
    return Array.from(depts);
  }, [data.menuItems, data.departments]);

  // Filter sales based on date
  const filteredSales = useMemo(() => {
    return (data.sales || []).filter(sale => {
      if (startDate && sale.date < startDate) return false;
      if (endDate && sale.date > endDate) return false;
      return true;
    });
  }, [data.sales, startDate, endDate]);

  // Group and aggregate by Menu Category
  const categoryStats = useMemo(() => {
    const map: Record<string, {
      category: string;
      itemCount: number;
      totalQtySold: number;
      grossRevenue: number;
      orderFrequency: number;
      topItemName: string;
      topItemQty: number;
      topItemRevenue: number;
      itemsList: {
        id?: number;
        name: string;
        price: number;
        department: string;
        qtySold: number;
        revenue: number;
      }[];
    }> = {};

    // 1. Initialize from master categories
    const allCategories = new Set<string>();
    (data.categories || []).forEach(c => allCategories.add(c));
    (data.menuItems || []).forEach(m => {
      if (m.category) allCategories.add(m.category);
    });

    allCategories.forEach(cat => {
      map[cat] = {
        category: cat,
        itemCount: 0,
        totalQtySold: 0,
        grossRevenue: 0,
        orderFrequency: 0,
        topItemName: 'N/A',
        topItemQty: 0,
        topItemRevenue: 0,
        itemsList: []
      };
    });

    // Populate catalog items count
    (data.menuItems || []).forEach(m => {
      const cat = m.category || 'General';
      if (!map[cat]) {
        map[cat] = {
          category: cat,
          itemCount: 0,
          totalQtySold: 0,
          grossRevenue: 0,
          orderFrequency: 0,
          topItemName: 'N/A',
          topItemQty: 0,
          topItemRevenue: 0,
          itemsList: []
        };
      }
      map[cat].itemCount += 1;
      map[cat].itemsList.push({
        id: m.id,
        name: m.name,
        price: m.price,
        department: m.department || 'Main Kitchen',
        qtySold: 0,
        revenue: 0
      });
    });

    // 2. Aggregate sales
    filteredSales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(cartItem => {
          const match = (data.menuItems || []).find(m => m.name.toLowerCase() === cartItem.name.toLowerCase() || m.id === cartItem.id);
          const cat = cartItem.category || match?.category || 'General';

          if (!map[cat]) {
            map[cat] = {
              category: cat,
              itemCount: 1,
              totalQtySold: 0,
              grossRevenue: 0,
              orderFrequency: 0,
              topItemName: 'N/A',
              topItemQty: 0,
              topItemRevenue: 0,
              itemsList: []
            };
          }

          const qty = Number(cartItem.qty) || 1;
          const lineTotal = Number(cartItem.price) * qty;

          map[cat].totalQtySold += qty;
          map[cat].grossRevenue += lineTotal;
          map[cat].orderFrequency += 1;

          // Update item in itemsList
          let existing = map[cat].itemsList.find(i => i.name.toLowerCase() === cartItem.name.toLowerCase());
          if (!existing) {
            existing = {
              id: cartItem.id,
              name: cartItem.name,
              price: cartItem.price,
              department: cartItem.department || match?.department || 'Main Kitchen',
              qtySold: 0,
              revenue: 0
            };
            map[cat].itemsList.push(existing);
          }
          existing.qtySold += qty;
          existing.revenue += lineTotal;
        });
      } else if (sale.details) {
        // Fallback for mock/legacy sales details
        (data.menuItems || []).forEach(m => {
          if (sale.details.toLowerCase().includes(m.name.toLowerCase())) {
            const cat = m.category || 'General';
            if (map[cat]) {
              const qtyMatch = sale.details.match(new RegExp(`${m.name}\\s*\\((\\d+)\\)`, 'i'));
              const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
              const lineTotal = m.price * qty;

              map[cat].totalQtySold += qty;
              map[cat].grossRevenue += lineTotal;
              map[cat].orderFrequency += 1;

              const existing = map[cat].itemsList.find(i => i.name.toLowerCase() === m.name.toLowerCase());
              if (existing) {
                existing.qtySold += qty;
                existing.revenue += lineTotal;
              }
            }
          }
        });
      }
    });

    // Find top item per category
    Object.values(map).forEach(catObj => {
      if (catObj.itemsList.length > 0) {
        const sortedItems = [...catObj.itemsList].sort((a, b) => b.qtySold - a.qtySold);
        if (sortedItems[0].qtySold > 0) {
          catObj.topItemName = sortedItems[0].name;
          catObj.topItemQty = sortedItems[0].qtySold;
          catObj.topItemRevenue = sortedItems[0].revenue;
        }
      }
    });

    let list = Object.values(map);

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.category.toLowerCase().includes(q) || 
        c.topItemName.toLowerCase().includes(q)
      );
    }

    // Sort list
    list.sort((a, b) => {
      let valA = a.grossRevenue;
      let valB = b.grossRevenue;
      if (sortField === 'qty') {
        valA = a.totalQtySold;
        valB = b.totalQtySold;
      } else if (sortField === 'itemCount') {
        valA = a.itemCount;
        valB = b.itemCount;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return list;
  }, [data.categories, data.menuItems, filteredSales, searchQuery, sortField, sortOrder]);

  // Overall totals
  const totalRevenueAllCats = useMemo(() => categoryStats.reduce((s, c) => s + c.grossRevenue, 0), [categoryStats]);
  const totalQtyAllCats = useMemo(() => categoryStats.reduce((s, c) => s + c.totalQtySold, 0), [categoryStats]);
  const activeCategoriesCount = useMemo(() => categoryStats.filter(c => c.totalQtySold > 0).length, [categoryStats]);
  const topRevenueCat = useMemo(() => {
    if (categoryStats.length === 0) return null;
    const sorted = [...categoryStats].sort((a, b) => b.grossRevenue - a.grossRevenue);
    return sorted[0].grossRevenue > 0 ? sorted[0] : null;
  }, [categoryStats]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Rank',
      'Menu Category',
      'Active Catalog Items',
      'Total Qty Sold',
      'Gross Sales Revenue (BDT)',
      'Share of Sales (%)',
      'Avg Item Price (BDT)',
      'Top Selling Dish',
      'Top Dish Volume'
    ];

    const rows = categoryStats.map((c, idx) => {
      const share = totalRevenueAllCats > 0 ? ((c.grossRevenue / totalRevenueAllCats) * 100).toFixed(1) + '%' : '0%';
      const avgPrice = c.totalQtySold > 0 ? Math.round(c.grossRevenue / c.totalQtySold) : 0;
      return [
        idx + 1,
        c.category,
        c.itemCount,
        c.totalQtySold,
        c.grossRevenue,
        share,
        avgPrice,
        c.topItemName,
        c.topItemQty
      ];
    });

    exportCsvHelper('Category_Wise_Sales_Report_' + new Date().toISOString().split('T')[0] + '.csv', headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  // Drilldown category
  const drilldownCategory = useMemo(() => {
    if (!activeCategoryDrilldown) return null;
    return categoryStats.find(c => c.category === activeCategoryDrilldown) || null;
  }, [activeCategoryDrilldown, categoryStats]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-black uppercase tracking-wider">
              POS Report #3
            </span>
            <h2 className="text-xl font-black text-slate-900">
              Menu Category Wise Sales Report
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Category revenue distribution, volume share %, catalog item count, average ticket size, and star menu performers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <ReportFilters
        datePreset={datePreset}
        setDatePreset={setDatePreset}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search category name, top dish..."
        totalRecords={categoryStats.length}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
      >
        {/* Sort */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-72">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Sort By:</label>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="w-full bg-transparent text-slate-800 text-xs font-bold focus:outline-none truncate cursor-pointer"
          >
            <option value="revenue">Highest Revenue</option>
            <option value="qty">Highest Quantity Sold</option>
            <option value="itemCount">Most Menu Items</option>
          </select>
        </div>
      </ReportFilters>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Active Categories</span>
            <FolderTree className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {activeCategoriesCount} <span className="text-xs text-slate-400 font-medium">/ {categoryStats.length} total</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Generating live dining revenue
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Total Category Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            ৳{totalRevenueAllCats.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {totalQtyAllCats.toLocaleString()} total food portions sold
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Top Category (Revenue)</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">
            {topRevenueCat ? topRevenueCat.category : 'N/A'}
          </div>
          <div className="text-[11px] text-amber-700 font-bold mt-0.5 truncate">
            {topRevenueCat ? `৳${topRevenueCat.grossRevenue.toLocaleString()} (${topRevenueCat.totalQtySold} portions)` : 'No sales recorded'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Avg Category Yield</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ৳{activeCategoriesCount > 0 ? Math.round(totalRevenueAllCats / activeCategoriesCount).toLocaleString() : '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Average revenue per active category
          </div>
        </div>
      </div>

      {/* Category Revenue Contribution Progress Bars */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-600" />
            <span>Category Revenue Share & Distribution Overview</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Proportional revenue breakdown
          </span>
        </div>

        <div className="space-y-3">
          {categoryStats.filter(c => c.grossRevenue > 0).map((c, idx) => {
            const share = totalRevenueAllCats > 0 ? (c.grossRevenue / totalRevenueAllCats) * 100 : 0;
            const barColors = ['bg-teal-600', 'bg-amber-500', 'bg-blue-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-purple-600', 'bg-rose-500'];
            const colorClass = barColors[idx % barColors.length];

            return (
              <div key={c.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">{c.category}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({c.totalQtySold} portions)</span>
                  </div>
                  <div className="font-black text-slate-900">
                    ৳{c.grossRevenue.toLocaleString()} <span className="text-slate-400 font-medium text-[10px]">({share.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${colorClass}`}
                    style={{ width: `${Math.max(2, share)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Category Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900 text-base">
              Menu Category Sales Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Dishes cataloged, quantity sold, total sales yield, and best-selling menu dish per category.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            {categoryStats.length} Categories
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-2.5 py-2.5">#</th>
                <th className="px-2.5 py-2.5">Category & Items</th>
                <th className="px-2.5 py-2.5 text-center">Qty Sold & Top Dish</th>
                <th className="px-2.5 py-2.5 text-right">Sales & Share</th>
                <th className="px-2.5 py-2.5 text-right">Avg Item Price</th>
                <th className="px-2.5 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryStats.map((c, index) => {
                const share = totalRevenueAllCats > 0 ? ((c.grossRevenue / totalRevenueAllCats) * 100).toFixed(1) : '0';
                const avgPrice = c.totalQtySold > 0 ? Math.round(c.grossRevenue / c.totalQtySold) : 0;

                return (
                  <tr key={c.category} className="hover:bg-slate-50/80 transition">
                    <td className="px-2.5 py-2.5 font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-2.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <Tag className="w-3.5 h-3.5 text-teal-600" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-xs sm:text-sm">
                            {c.category}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {c.itemCount} catalog items
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-center">
                      <div className="font-black text-slate-900 text-xs">
                        {c.totalQtySold} sold
                      </div>
                      {c.topItemName !== 'N/A' && (
                        <div className="text-[10px] text-teal-700 font-medium line-clamp-1">
                          Top: {c.topItemName} ({c.topItemQty})
                        </div>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 text-right">
                      <div className="font-black text-slate-900 text-xs sm:text-sm">
                        ৳{c.grossRevenue.toLocaleString()}
                      </div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 text-[10px] font-bold">
                        {share}% share
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-extrabold text-slate-700 font-mono text-xs">
                      ৳{avgPrice.toLocaleString()}
                    </td>
                    <td className="px-2.5 py-2.5 text-center">
                      <button
                        onClick={() => setActiveCategoryDrilldown(c.category)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 mx-auto"
                        title="View Category Dishes"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Dishes</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {categoryStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No menu category records found.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer */}
            <tfoot className="bg-slate-900 text-white font-extrabold text-xs">
              <tr>
                <td colSpan={2} className="px-2.5 py-3 uppercase tracking-wider text-amber-400">
                  Total Categories
                </td>
                <td className="px-2.5 py-3 text-center text-amber-400">
                  {totalQtyAllCats} portions
                </td>
                <td className="px-2.5 py-3 text-right">
                  <div className="text-amber-400 text-xs sm:text-sm font-black">
                    ৳{totalRevenueAllCats.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-300 font-normal">
                    100% share
                  </div>
                </td>
                <td className="px-2.5 py-3 text-right text-white font-mono text-xs">
                  ৳{totalQtyAllCats > 0 ? Math.round(totalRevenueAllCats / totalQtyAllCats).toLocaleString() : '0'} Avg
                </td>
                <td className="px-2.5 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Category Drilldown Modal */}
      {drilldownCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-black">
                    Category Dishes
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    {drilldownCategory.category}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total {drilldownCategory.itemsList.length} items cataloged • Revenue: ৳{drilldownCategory.grossRevenue.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveCategoryDrilldown(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 py-4 space-y-2">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Dish Name</th>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2 text-right">Base Price</th>
                    <th className="px-3 py-2 text-center">Qty Sold</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drilldownCategory.itemsList.map(item => (
                    <tr key={item.name} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-extrabold text-slate-900">
                        {item.name}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {item.department}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-700">
                        ৳{item.price}
                      </td>
                      <td className="px-3 py-2.5 text-center font-black text-slate-900">
                        {item.qtySold}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-emerald-700">
                        ৳{item.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setActiveCategoryDrilldown(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
