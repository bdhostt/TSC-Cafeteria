import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { ReportFilters, DatePreset, exportCsvHelper } from './ReportFilters';
import { 
  UtensilsCrossed, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Tag, 
  Flame, 
  ChefHat, 
  ArrowUpDown, 
  Printer, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Layers, 
  SlidersHorizontal,
  Eye,
  X,
  PieChart,
  CheckCircle2
} from 'lucide-react';
import { SaleRecord, MenuItem, TableCartItem } from '../../types';

export const ItemSalesReport: React.FC = () => {
  const { data } = useRestaurant();

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [movementFilter, setMovementFilter] = useState<'ALL' | 'TOP_SELLER' | 'STEADY' | 'SLOW' | 'ZERO'>('ALL');
  const [sortField, setSortField] = useState<'revenue' | 'qty' | 'profit'>('revenue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeItemModal, setActiveItemModal] = useState<any | null>(null);

  // Categories list
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    (data.menuItems || []).forEach(m => {
      if (m.category) cats.add(m.category);
    });
    (data.categories || []).forEach(c => cats.add(c));
    return Array.from(cats);
  }, [data.menuItems, data.categories]);

  // Departments list
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

  // Aggregate item-wise sales
  const itemStats = useMemo(() => {
    const map: Record<string, {
      id?: number;
      name: string;
      category: string;
      department: string;
      basePrice: number;
      estimatedCost: number;
      totalQtySold: number;
      totalRevenue: number;
      orderFrequency: number;
      variationsSold: Record<string, number>;
      addonsSold: Record<string, number>;
      tickets: { invoiceNo: string; date: string; qty: number; price: number; total: number }[];
    }> = {};

    // 1. Initialize all existing menu items from master menu catalog
    (data.menuItems || []).forEach(m => {
      const key = m.name.trim().toLowerCase();
      map[key] = {
        id: m.id,
        name: m.name,
        category: m.category || 'General',
        department: m.department || 'Main Kitchen',
        basePrice: m.price || 0,
        estimatedCost: m.cost || (m.price * 0.35),
        totalQtySold: 0,
        totalRevenue: 0,
        orderFrequency: 0,
        variationsSold: {},
        addonsSold: {},
        tickets: []
      };
    });

    // 2. Iterate filtered sales and extract items
    filteredSales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(cartItem => {
          const key = cartItem.name.trim().toLowerCase();
          if (!map[key]) {
            // Find in menuItems
            const match = (data.menuItems || []).find(m => m.name.toLowerCase() === key || m.id === cartItem.id);
            map[key] = {
              id: cartItem.id,
              name: cartItem.name,
              category: cartItem.category || match?.category || 'Food Items',
              department: cartItem.department || match?.department || 'Main Kitchen',
              basePrice: cartItem.price || match?.price || 0,
              estimatedCost: match?.cost || (cartItem.price * 0.35),
              totalQtySold: 0,
              totalRevenue: 0,
              orderFrequency: 0,
              variationsSold: {},
              addonsSold: {},
              tickets: []
            };
          }

          const qty = Number(cartItem.qty) || 1;
          const lineTotal = Number(cartItem.price) * qty;

          map[key].totalQtySold += qty;
          map[key].totalRevenue += lineTotal;
          map[key].orderFrequency += 1;

          // Track variation
          if (cartItem.selectedVariation?.name) {
            const varName = cartItem.selectedVariation.name;
            map[key].variationsSold[varName] = (map[key].variationsSold[varName] || 0) + qty;
          }

          // Track addons
          if (cartItem.selectedAddons && cartItem.selectedAddons.length > 0) {
            cartItem.selectedAddons.forEach(ad => {
              map[key].addonsSold[ad.name] = (map[key].addonsSold[ad.name] || 0) + qty;
            });
          }

          map[key].tickets.push({
            invoiceNo: sale.invoiceNo,
            date: sale.date,
            qty,
            price: cartItem.price,
            total: lineTotal
          });
        });
      } else if (sale.details) {
        // Fallback parse from sale details e.g. "BBQ Chicken Steak (2)" or similar
        (data.menuItems || []).forEach(m => {
          if (sale.details.toLowerCase().includes(m.name.toLowerCase())) {
            const key = m.name.trim().toLowerCase();
            const qtyMatch = sale.details.match(new RegExp(`${m.name}\\s*\\((\\d+)\\)`, 'i'));
            const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            const lineTotal = m.price * qty;

            map[key].totalQtySold += qty;
            map[key].totalRevenue += lineTotal;
            map[key].orderFrequency += 1;
            map[key].tickets.push({
              invoiceNo: sale.invoiceNo,
              date: sale.date,
              qty,
              price: m.price,
              total: lineTotal
            });
          }
        });
      }
    });

    let list = Object.values(map);

    // Filter by category
    if (selectedCategory !== 'ALL') {
      list = list.filter(i => i.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by department
    if (selectedDepartment !== 'ALL') {
      list = list.filter(i => i.department.toLowerCase() === selectedDepartment.toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.category.toLowerCase().includes(q) || 
        i.department.toLowerCase().includes(q)
      );
    }

    // Movement Classification
    if (movementFilter === 'TOP_SELLER') {
      list = list.filter(i => i.totalQtySold >= 15);
    } else if (movementFilter === 'STEADY') {
      list = list.filter(i => i.totalQtySold >= 5 && i.totalQtySold < 15);
    } else if (movementFilter === 'SLOW') {
      list = list.filter(i => i.totalQtySold > 0 && i.totalQtySold < 5);
    } else if (movementFilter === 'ZERO') {
      list = list.filter(i => i.totalQtySold === 0);
    }

    // Sort list
    list.sort((a, b) => {
      let valA = a.totalRevenue;
      let valB = b.totalRevenue;
      if (sortField === 'qty') {
        valA = a.totalQtySold;
        valB = b.totalQtySold;
      } else if (sortField === 'profit') {
        valA = a.totalRevenue - (a.totalQtySold * a.estimatedCost);
        valB = b.totalRevenue - (b.totalQtySold * b.estimatedCost);
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return list;
  }, [data.menuItems, filteredSales, selectedCategory, selectedDepartment, searchQuery, movementFilter, sortField, sortOrder]);

  // Totals
  const totalItemRevenue = useMemo(() => itemStats.reduce((s, i) => s + i.totalRevenue, 0), [itemStats]);
  const totalQuantitySold = useMemo(() => itemStats.reduce((s, i) => s + i.totalQtySold, 0), [itemStats]);
  const topSellingDish = useMemo(() => {
    if (itemStats.length === 0) return null;
    const sorted = [...itemStats].sort((a, b) => b.totalQtySold - a.totalQtySold);
    return sorted[0].totalQtySold > 0 ? sorted[0] : null;
  }, [itemStats]);
  const topRevenueDish = useMemo(() => {
    if (itemStats.length === 0) return null;
    const sorted = [...itemStats].sort((a, b) => b.totalRevenue - a.totalRevenue);
    return sorted[0].totalRevenue > 0 ? sorted[0] : null;
  }, [itemStats]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Rank',
      'Dish / Item Name',
      'Category',
      'Kitchen Department',
      'Base Price (BDT)',
      'Est. Unit Cost (BDT)',
      'Qty Sold',
      'Total Sales Revenue (BDT)',
      'Est. Food Cost (BDT)',
      'Est. Gross Profit (BDT)',
      'Gross Margin (%)',
      'Revenue Share (%)'
    ];

    const rows = itemStats.map((item, idx) => {
      const estCogs = item.totalQtySold * item.estimatedCost;
      const profit = item.totalRevenue - estCogs;
      const margin = item.totalRevenue > 0 ? ((profit / item.totalRevenue) * 100).toFixed(1) + '%' : '0%';
      const share = totalItemRevenue > 0 ? ((item.totalRevenue / totalItemRevenue) * 100).toFixed(1) + '%' : '0%';

      return [
        idx + 1,
        item.name,
        item.category,
        item.department,
        item.basePrice,
        Math.round(item.estimatedCost),
        item.totalQtySold,
        item.totalRevenue,
        Math.round(estCogs),
        Math.round(profit),
        margin,
        share
      ];
    });

    exportCsvHelper('Item_Wise_Sales_Report_' + new Date().toISOString().split('T')[0] + '.csv', headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-black uppercase tracking-wider">
              POS Report #2
            </span>
            <h2 className="text-xl font-black text-slate-900">
              Item & Food Dish Wise Sales Report
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quantity sold, sales revenue ranking, category & preparation station allocation, estimated food margin, and best sellers.
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
        searchPlaceholder="Search dish name, category, kitchen..."
        totalRecords={itemStats.length}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        topRightControl={
          /* 1: Category filter (Row 2 right) */
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-72">
            <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-transparent text-slate-800 text-xs font-bold focus:outline-none truncate cursor-pointer"
            >
              <option value="ALL">All Categories ({categoryOptions.length})</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        }
        bottomControl={
          <div className="flex flex-col gap-2 w-full sm:w-72">
            {/* 3: Movement filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full">
              <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Movement:</label>
              <select
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value as any)}
                className="w-full bg-transparent text-slate-800 text-xs font-bold focus:outline-none truncate cursor-pointer"
              >
                <option value="ALL">All Items</option>
                <option value="TOP_SELLER">🔥 Top Sellers (≥15 Qty)</option>
                <option value="STEADY">⚡ Steady (5-14 Qty)</option>
                <option value="SLOW">🐢 Slow Moving (&lt;5 Qty)</option>
                <option value="ZERO">⚪ Zero Sales (0 Qty)</option>
              </select>
            </div>

            {/* 4: Sort By filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full">
              <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Sort By:</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="w-full bg-transparent text-slate-800 text-xs font-bold focus:outline-none truncate cursor-pointer"
              >
                <option value="revenue">Highest Net Revenue</option>
                <option value="qty">Highest Quantity Sold</option>
                <option value="profit">Highest Estimated Profit</option>
              </select>
            </div>
          </div>
        }
      >
        {/* Kitchen Department filter (Row 3 right, beside Filters: icon) */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-72">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Kitchen:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full bg-transparent text-slate-800 text-xs font-bold focus:outline-none truncate cursor-pointer"
          >
            <option value="ALL">All Stations ({departmentOptions.length})</option>
            {departmentOptions.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </ReportFilters>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Total Dishes Sold</span>
            <UtensilsCrossed className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {totalQuantitySold.toLocaleString()} <span className="text-xs text-slate-400 font-medium">portions</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Across {itemStats.filter(i => i.totalQtySold > 0).length} active menu items
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Total Item Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            ৳{totalItemRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Average price: ৳{totalQuantitySold > 0 ? Math.round(totalItemRevenue / totalQuantitySold) : 0} / dish
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>#1 Volume Leader</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">
            {topSellingDish ? topSellingDish.name : 'N/A'}
          </div>
          <div className="text-[11px] text-amber-700 font-bold mt-0.5 truncate">
            {topSellingDish ? `${topSellingDish.totalQtySold} portions sold (৳${topSellingDish.totalRevenue.toLocaleString()})` : 'No sales yet'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>#1 Revenue Leader</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">
            {topRevenueDish ? topRevenueDish.name : 'N/A'}
          </div>
          <div className="text-[11px] text-blue-700 font-bold mt-0.5 truncate">
            {topRevenueDish ? `৳${topRevenueDish.totalRevenue.toLocaleString()} (${topRevenueDish.totalQtySold} portions)` : 'No sales yet'}
          </div>
        </div>
      </div>

      {/* Top 6 Best Sellers Visual Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Top Best-Selling Menu Items (Volume & Revenue Distribution)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {itemStats.filter(i => i.totalQtySold > 0).length} performing items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {itemStats.filter(i => i.totalQtySold > 0).slice(0, 6).map((item, idx) => {
            const share = totalItemRevenue > 0 ? (item.totalRevenue / totalItemRevenue) * 100 : 0;
            return (
              <div 
                key={item.name} 
                onClick={() => setActiveItemModal(item)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/70 hover:bg-teal-50/30 transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800 uppercase">
                      #{idx + 1} {item.category}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-1 truncate">
                      {item.name}
                    </h4>
                  </div>
                  <span className="text-xs font-black text-slate-900 shrink-0">
                    ৳{item.basePrice}
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-600">
                    <span className="text-slate-900 font-black">{item.totalQtySold}</span> portions sold
                  </div>
                  <div className="font-black text-emerald-700">
                    ৳{item.totalRevenue.toLocaleString()} <span className="text-slate-400 font-medium text-[10px]">({share.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Item Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900 text-base">
              Itemized Sales Register & Menu Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Complete catalog of sold dishes, preparation departments, unit prices, total volume, and gross revenue contribution.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            {itemStats.length} Dishes
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-2.5 py-2.5">#</th>
                <th className="px-2.5 py-2.5">Dish & Kitchen Station</th>
                <th className="px-2.5 py-2.5 text-right">Price & Sold Qty</th>
                <th className="px-2.5 py-2.5 text-right">Revenue & Share</th>
                <th className="px-2.5 py-2.5 text-right">Cost & Margin</th>
                <th className="px-2.5 py-2.5 text-center">Movement</th>
                <th className="px-2.5 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemStats.map((item, index) => {
                const estCogs = item.totalQtySold * item.estimatedCost;
                const profit = item.totalRevenue - estCogs;
                const marginPercent = item.totalRevenue > 0 ? ((profit / item.totalRevenue) * 100).toFixed(1) : '0';
                const share = totalItemRevenue > 0 ? ((item.totalRevenue / totalItemRevenue) * 100).toFixed(1) : '0';

                return (
                  <tr key={item.name} className="hover:bg-slate-50/80 transition">
                    <td className="px-2.5 py-2.5 font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-2.5 py-2.5">
                      <div className="font-black text-slate-900 text-xs sm:text-sm">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">{item.category}</span>
                        <span>•</span>
                        <span className="text-teal-700 font-semibold">{item.department}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-right">
                      <div className="font-extrabold text-slate-900 text-xs">
                        ৳{item.basePrice}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.totalQtySold} sold ({item.orderFrequency} orders)
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-right">
                      <div className="font-black text-slate-900 text-xs sm:text-sm">
                        ৳{item.totalRevenue.toLocaleString()}
                      </div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 text-[10px] font-bold">
                        {share}% share
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 text-right">
                      <div className="text-xs font-extrabold text-emerald-700">
                        {marginPercent}% Margin
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Cost: ৳{Math.round(estCogs).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-center">
                      {item.totalQtySold >= 15 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                          Top Seller
                        </span>
                      ) : item.totalQtySold >= 5 ? (
                        <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold">
                          Steady
                        </span>
                      ) : item.totalQtySold > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                          Slow
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 text-[10px] font-medium">
                          No Sale
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 text-center">
                      <button
                        onClick={() => setActiveItemModal(item)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 mx-auto"
                        title="View Dish Details"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {itemStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No menu item records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer */}
            <tfoot className="bg-slate-900 text-white font-extrabold text-xs">
              <tr>
                <td colSpan={2} className="px-2.5 py-3 uppercase tracking-wider text-amber-400">
                  Total Items Summary
                </td>
                <td className="px-2.5 py-3 text-right text-amber-400">
                  {totalQuantitySold} sold
                </td>
                <td className="px-2.5 py-3 text-right">
                  <div className="text-amber-400 text-xs sm:text-sm font-black">
                    ৳{totalItemRevenue.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-300 font-normal">
                    100% share
                  </div>
                </td>
                <td className="px-2.5 py-3 text-right">
                  <div className="text-emerald-300 text-xs font-bold">
                    {totalItemRevenue > 0 ? (
                      ((totalItemRevenue - itemStats.reduce((s, i) => s + (i.totalQtySold * i.estimatedCost), 0)) / totalItemRevenue * 100).toFixed(1)
                    ) : 0}% Avg
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono">
                    Cost: ৳{Math.round(itemStats.reduce((s, i) => s + (i.totalQtySold * i.estimatedCost), 0)).toLocaleString()}
                  </div>
                </td>
                <td colSpan={2} className="px-2.5 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Item Drilldown Detail Modal */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-black">
                    Dish Insights
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    {activeItemModal.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Category: <span className="font-bold text-slate-800">{activeItemModal.category}</span> • Station: <span className="font-bold text-slate-800">{activeItemModal.department}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveItemModal(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 py-4 space-y-4">
              {/* Summary stat cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Qty Sold</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{activeItemModal.totalQtySold} portions</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Revenue</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">৳{activeItemModal.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Base Price</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">৳{activeItemModal.basePrice}</div>
                </div>
              </div>

              {/* Variations sold breakdown if any */}
              {Object.keys(activeItemModal.variationsSold || {}).length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    <span>Portion / Size Variations Sold</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(activeItemModal.variationsSold).map(([varName, count]) => (
                      <div key={varName} className="p-2 rounded-xl bg-white border border-amber-200 text-xs">
                        <div className="font-bold text-slate-800">{varName}</div>
                        <div className="text-slate-500 font-medium">{count as number} orders</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ticket Order history */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-slate-900">
                  Recent Invoices Containing this Dish ({activeItemModal.tickets.length})
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {activeItemModal.tickets.map((t: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900">{t.invoiceNo}</span>
                        <span className="text-slate-400 text-[10px] ml-2">{t.date}</span>
                      </div>
                      <div className="font-bold text-slate-800">
                        {t.qty} x ৳{t.price} = <span className="font-black text-emerald-700">৳{t.total}</span>
                      </div>
                    </div>
                  ))}

                  {activeItemModal.tickets.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      No order tickets recorded for this item yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setActiveItemModal(null)}
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
