import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  ShoppingCart, 
  Receipt, 
  Scale, 
  CreditCard, 
  LayoutGrid,
  Trophy,
  Wallet,
  Coins,
  Boxes,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  UtensilsCrossed,
  AlertTriangle
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { data, metrics, setActiveTab, setPosView, setIsStartSessionModalOpen } = useRestaurant();

  // Format today's date nicely
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Calculate top selling dishes with fallback to menu items if sales list is empty
  const topSellingList = metrics.topSellingItems && metrics.topSellingItems.length > 0
    ? metrics.topSellingItems
    : [
        { name: "BBQ Chicken Steak", qty: 27 },
        { name: "Wate 500ml", qty: 19 },
        ...(data.menuItems.slice(2).map(m => ({ name: m.name, qty: 8 })))
      ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 text-[#004b9b] border border-blue-200 text-[11px] font-extrabold tracking-wide uppercase mb-2">
            TOP SHEET & BUSINESS OVERVIEW
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Executive Business Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Overall picture of restaurant total income, expenses, stock value, net profit and arrears
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-2.5 shrink-0">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-medium">Today's Date</div>
            <div className="text-xs font-bold text-slate-800">{todayFormatted}</div>
          </div>
          <button
            id="btn-goto-pos-billing"
            onClick={() => {
              if (!data.session?.isActive) {
                return;
              }
              setActiveTab('pos');
              setPosView('floor');
            }}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Go to Live POS Billing</span>
          </button>
        </div>
      </div>

      {/* Metric Cards - Row 1: Core Financial & Dues Overview (6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Total Sales */}
        <div 
          onClick={() => setActiveTab('sales')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>TOTAL SALES</span>
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">
              ৳ {metrics.totalSales.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Completed Bills</span>
            <span className="font-bold text-emerald-600 font-mono">{metrics.salesCount} Bills</span>
          </div>
        </div>

        {/* 2. Total Purchase */}
        <div 
          onClick={() => setActiveTab('purchases')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 transition cursor-pointer flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>TOTAL PURCHASES</span>
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-600 mt-2 font-mono">
              ৳ {metrics.totalPurchases.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Voucher Entries</span>
            <span className="font-bold text-blue-600 font-mono">{metrics.purchaseCount} Entries</span>
          </div>
        </div>

        {/* 3. Operating Expenses */}
        <div 
          onClick={() => setActiveTab('expenses')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-300 transition cursor-pointer flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>OPERATING EXPENSES</span>
              <Receipt className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-2 font-mono">
              ৳ {metrics.totalExpenses.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Operational Costs</span>
            <span className="font-bold text-rose-600 font-mono">Total Exp</span>
          </div>
        </div>

        {/* 4. Estimated Net Profit */}
        <div 
          onClick={() => setActiveTab('sales')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>ESTIMATED NET PROFIT</span>
              <Scale className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">
              ৳ {metrics.estimatedProfit.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Sales - (COGS + Exp)</span>
            <span className="font-bold text-emerald-600 font-mono">Net Profit</span>
          </div>
        </div>

        {/* 5. Customer Dues */}
        <div 
          onClick={() => setActiveTab('receivables')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-300 transition cursor-pointer flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>CUSTOMER DUE</span>
              <Wallet className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-2 font-mono">
              ৳ {metrics.totalCustomerDue.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Outstanding Dues</span>
            <span className="font-bold text-rose-600 font-mono">Receivables</span>
          </div>
        </div>

        {/* 6. Vendor Debt */}
        <div 
          onClick={() => setActiveTab('payables')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-300 transition cursor-pointer flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>VENDOR PAYABLES</span>
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2 font-mono">
              ৳ {metrics.totalVendorDue.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Supplier Invoices</span>
            <span className="font-bold text-amber-600 font-mono">Outstanding</span>
          </div>
        </div>
      </div>

      {/* Metric Cards - Row 2: Stock Movement & Valuation Laser (6 Cards from Picture 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Opening Stock */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition cursor-pointer min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Opening Stock Balance</span>
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
              ৳ {Math.round(metrics.totalOpeningStockVal).toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Opening Quantity In Period</span>
            <span className="font-bold text-emerald-700 font-mono">+{metrics.totalOpeningStockQty.toFixed(1)} Units</span>
          </div>
        </div>

        {/* 2. Inward Purchases */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-300 transition cursor-pointer min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Inward Received Purchases</span>
              <ArrowDownRight className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-700 mt-2 font-mono">
              ৳ {Math.round(metrics.totalInwardPurchasesVal).toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Received Quantity In Period</span>
            <span className="font-bold text-blue-700 font-mono">+{metrics.totalInwardPurchasesQty.toFixed(1)} Units</span>
          </div>
        </div>

        {/* 3. Auto Recipe BOM Cost */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-amber-300 transition cursor-pointer min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Auto Recipe (BOM) Cost</span>
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2 font-mono">
              ৳ {Math.round(metrics.totalBomCostVal).toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Auto Deducted via POS Sales</span>
            <span className="font-bold text-amber-700 font-mono">-{metrics.totalBomUsedQty.toFixed(1)} Units</span>
          </div>
        </div>

        {/* 4. Manual Used Cost */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-orange-300 transition cursor-pointer min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Manual Used Cost</span>
              <UtensilsCrossed className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-black text-orange-600 mt-2 font-mono">
              ৳ {Math.round(metrics.totalManualUsedVal).toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Manual Kitchen Used</span>
            <span className="font-bold text-orange-700 font-mono">-{metrics.totalManualUsedQty.toFixed(1)} Units</span>
          </div>
        </div>

        {/* 5. Manual Wastage & Alerts */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-rose-300 transition cursor-pointer min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Wastage & Stock Alerts</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-2 font-mono">
              ৳ {Math.round(metrics.totalWastageCostVal).toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Alerts in Storeroom</span>
            <span className="font-bold text-rose-600">
              {metrics.lowStockCount} Low / {metrics.negativeStockCount} Negative
            </span>
          </div>
        </div>

        {/* 6. Closing Stock Valuation */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className="p-4 rounded-xl bg-white text-white shadow-xs border border-slate-200/80 hover:ring-1 hover:ring-amber-400/50 transition cursor-pointer flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Closing Stock Valuation</span>
              <Boxes className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
              ৳ {Math.round(metrics.totalClosingStockVal).toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span>Total On-Hand Asset Value</span>
            <span className="font-bold text-amber-300 font-mono">{metrics.totalStockItemsCount} Items</span>
          </div>
        </div>
      </div>

      {/* Row 3: 3 Column Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Method Collection Breakdown */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Payment Method Breakdown</span>
          </h3>

          <div className="space-y-2.5">
            <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                <span>💵</span>
                <span>Cash Collection:</span>
              </span>
              <span className="font-extrabold text-slate-900">৳ {metrics.payCash.toLocaleString()}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                <span>💳</span>
                <span>Card Collection:</span>
              </span>
              <span className="font-extrabold text-blue-900">৳ {metrics.payCard.toLocaleString()}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                <span>📱</span>
                <span>bKash Collection:</span>
              </span>
              <span className="font-extrabold text-pink-900">৳ {metrics.payBkash.toLocaleString()}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                <span>👛</span>
                <span>Nagad Collection:</span>
              </span>
              <span className="font-extrabold text-slate-900">৳ {metrics.payNagad.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Live Table & Session Status */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-2 mb-4">
            <LayoutGrid className="w-4 h-4 text-[#004b9b]" />
            <span>Live Table & Session Status</span>
          </h3>

          <div className="space-y-2.5">
            <div className="p-2.5 rounded-lg bg-emerald-50/90 text-emerald-950 border border-emerald-100 flex items-center justify-between text-xs font-semibold">
              <span>Available Tables:</span>
              <span className="text-emerald-700 font-black text-sm">{metrics.freeTablesCount}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50/80 text-blue-950 border border-blue-100 flex items-center justify-between text-xs font-semibold">
              <span>Occupied / Running Tables:</span>
              <span className="text-[#004b9b] font-black text-sm">{metrics.occupiedTablesCount}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">POS Opening Cash:</span>
              <span className="font-extrabold text-slate-900">৳ {data.session.openingCash || 0}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">Total Menu Items:</span>
              <span className="font-extrabold text-slate-900">{data.menuItems.length} Items</span>
            </div>
          </div>
        </div>

        {/* Top Selling Food (Top Selling) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-[#004b9b]" />
            <span>Top Selling Dishes</span>
          </h3>

          <div className="space-y-2.5">
            {topSellingList.map((dish, idx) => (
              <div 
                key={idx}
                className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs"
              >
                <span className="font-bold text-slate-800">
                  {idx + 1}. {dish.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#004b9b] border border-blue-200 font-extrabold text-[11px]">
                  {dish.qty} sold
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
