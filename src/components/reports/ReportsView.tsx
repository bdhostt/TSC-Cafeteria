import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { InventoryReports } from './InventoryReports';
import { ProcurementReports } from './ProcurementReports';
import { ReceivablesRegistersReports } from './ReceivablesRegistersReports';
import { FinancialStatementsReports } from './FinancialStatementsReports';
import { PosSessionReports } from './PosSessionReports';
import { CommissionReports } from './CommissionReports';
import { UserSalesReport } from './UserSalesReport';
import { ItemSalesReport } from './ItemSalesReport';
import { MenuCategorySalesReport } from './MenuCategorySalesReport';
import { KitchenDepartmentSalesReport } from './KitchenDepartmentSalesReport';
import { 
  BarChart3, 
  Boxes, 
  ShoppingCart, 
  Users, 
  FileText, 
  Receipt, 
  TrendingUp, 
  Wallet, 
  Layers, 
  RotateCcw, 
  Scale, 
  Landmark, 
  Activity, 
  CheckCircle2, 
  BookOpen, 
  Clock, 
  Printer, 
  Search, 
  ChevronRight, 
  Lock, 
  Coins, 
  Percent,
  UtensilsCrossed,
  FolderTree,
  ChefHat,
  UserCheck,
  Flame
} from 'lucide-react';

export type MasterReportId = 
  // POS Shift Sessions, Commission & Sales Reports
  | 'pos-sessions'
  | 'commission-report'
  | 'user-sales'
  | 'item-sales'
  | 'category-sales'
  | 'department-sales'
  // Inventory (1-3)
  | 'inventory-inwards'
  | 'inventory-outward'
  | 'inventory-transactional'
  // Procurement & Vendors (4-8)
  | 'supplier-total-po'
  | 'supplier-grn'
  | 'supplier-returns'
  | 'all-purchases'
  | 'vendor-statement'
  // Receivables & Registers (9-13)
  | 'receivable-report'
  | 'ageing-schedule'
  | 'day-book'
  | 'ledger-report'
  | 'receipt-payment'
  // IFRS Financial Statements (14-17)
  | 'trial-balance'
  | 'pnl-ifrs'
  | 'balance-sheet'
  | 'cash-flow';

export type ReportSuite = 'pos' | 'inventory' | 'procurement' | 'receivables' | 'financials';

interface ReportMeta {
  id: MasterReportId;
  num: number;
  title: string;
  category: ReportSuite;
  description: string;
  icon: React.ElementType;
}

export const ALL_REPORTS_REGISTRY: ReportMeta[] = [
  // POS Shift Sessions & Sales Reports
  {
    id: 'pos-sessions',
    num: 0,
    title: 'POS Shift Session & Z-Reports',
    category: 'pos',
    description: 'Cash drawer opening/closing logs, cashier shift sales, reconciliation variance & Z-Reports',
    icon: Lock
  },
  {
    id: 'commission-report',
    num: 1,
    title: 'Commission Agents & Delivery Portals Report',
    category: 'pos',
    description: 'Gross portal sales, Foodpanda/Pathao/Foodi commissions deducted, and net restaurant payout statement',
    icon: Percent
  },
  {
    id: 'user-sales',
    num: 1,
    title: 'User & Waiter Wise Sales Report',
    category: 'pos',
    description: 'Staff sales volume, steward order count, cash vs digital collections, discounts, and performance ranking',
    icon: UserCheck
  },
  {
    id: 'item-sales',
    num: 2,
    title: 'Item & Dish Wise Sales Report',
    category: 'pos',
    description: 'Quantity sold, sales revenue ranking, category allocation, estimated food margin, and best sellers',
    icon: UtensilsCrossed
  },
  {
    id: 'category-sales',
    num: 3,
    title: 'Menu Category Wise Sales Report',
    category: 'pos',
    description: 'Category revenue distribution, volume share %, catalog item count, average ticket size, and star performers',
    icon: FolderTree
  },
  {
    id: 'department-sales',
    num: 4,
    title: 'Kitchen Department Wise Sales Report',
    category: 'pos',
    description: 'Production workload, KOT preparation stations, revenue generated per station, and top prepared dishes',
    icon: ChefHat
  },

  // 1-3 Inventory
  {
    id: 'inventory-inwards',
    num: 2,
    title: 'Inventory Inwards Report',
    category: 'inventory',
    description: 'Raw material procurement receipts, bill vouchers, inward quantities and unit values',
    icon: Boxes
  },
  {
    id: 'inventory-outward',
    num: 2,
    title: 'Inventory Outward Report',
    category: 'inventory',
    description: 'Recipe BOM consumption from POS sales & manual kitchen spoilage deductions',
    icon: Layers
  },
  {
    id: 'inventory-transactional',
    num: 3,
    title: 'Inventory Transactional Report',
    category: 'inventory',
    description: 'Continuous item-wise stock card with running quantities, unit rates and valuation',
    icon: Activity
  },

  // 4-8 Procurement & Suppliers
  {
    id: 'supplier-total-po',
    num: 4,
    title: 'Supplier Wise Total PO',
    category: 'procurement',
    description: 'Total purchase orders raised, fulfilled inward value and pending delivery per vendor',
    icon: ShoppingCart
  },
  {
    id: 'supplier-grn',
    num: 5,
    title: 'Supplier Wise GRN Report',
    category: 'procurement',
    description: 'Goods Received Note logs, verified physical receiving vouchers and bill totals',
    icon: CheckCircle2
  },
  {
    id: 'supplier-returns',
    num: 6,
    title: 'Supplier Wise Return Report',
    category: 'procurement',
    description: 'Rejected goods, damaged raw materials returns and debit note credit adjustments',
    icon: RotateCcw
  },
  {
    id: 'all-purchases',
    num: 7,
    title: 'All Reports of Purchase',
    category: 'procurement',
    description: 'Consolidated 360° purchase register with bill numbers, paid vs due and payment terms',
    icon: FileText
  },
  {
    id: 'vendor-statement',
    num: 8,
    title: 'Vendor Report (Vendor Statement)',
    category: 'procurement',
    description: 'Comprehensive supplier statement with invoice history, payments and net balance due',
    icon: Landmark
  },

  // 9-13 Receivables, Registers & Books
  {
    id: 'receivable-report',
    num: 9,
    title: 'Receivable Report',
    category: 'receivables',
    description: 'Customer credit sales, collections received, advance deposits and outstanding dues',
    icon: Users
  },
  {
    id: 'ageing-schedule',
    num: 10,
    title: 'Ageing Schedule (AR & AP)',
    category: 'receivables',
    description: '0-30, 31-60, 61-90, and 90+ days overdue analysis for customer dues and supplier payables',
    icon: Clock
  },
  {
    id: 'day-book',
    num: 11,
    title: 'Day Book',
    category: 'receivables',
    description: 'Chronological master journal of all sales, payments, purchases and operating events',
    icon: BookOpen
  },
  {
    id: 'ledger-report',
    num: 12,
    title: 'Ledger Report (General Ledger)',
    category: 'receivables',
    description: 'Head-wise interactive general ledger with opening balances, debits, credits and running total',
    icon: FileText
  },
  {
    id: 'receipt-payment',
    num: 13,
    title: 'Receipt & Payment Report',
    category: 'receivables',
    description: 'Summary of all cash and bank inflows vs disbursements with closing cash reconciliation',
    icon: Wallet
  },

  // 14-17 Financial Statements (IFRS)
  {
    id: 'trial-balance',
    num: 14,
    title: 'Trial Balance (Transactional)',
    category: 'financials',
    description: 'Standard double-entry accounting trial balance verifying total debit equals total credit',
    icon: Scale
  },
  {
    id: 'pnl-ifrs',
    num: 15,
    title: 'Profit & Loss Account (as per IFRS)',
    category: 'financials',
    description: 'Statement of profit or loss with net revenue, recipe BOM food costs, OpEx, and net margin',
    icon: TrendingUp
  },
  {
    id: 'balance-sheet',
    num: 16,
    title: 'Balance Sheet (as per IFRS)',
    category: 'financials',
    description: 'Statement of financial position with non-current & current assets, equity and liabilities',
    icon: Landmark
  },
  {
    id: 'cash-flow',
    num: 17,
    title: 'Cash Flow Statement',
    category: 'financials',
    description: 'Direct method analysis of operating, investing, and financing cash flow movements',
    icon: Receipt
  }
];

export const ReportsView: React.FC = () => {
  const { data, metrics, activeSubNav, setActiveSubNav } = useRestaurant();

  const [activeReportId, setActiveReportId] = useState<MasterReportId>(() => {
    if (activeSubNav && ALL_REPORTS_REGISTRY.some(r => r.id === activeSubNav)) {
      return activeSubNav as MasterReportId;
    }
    return 'user-sales';
  });

  // Sync when activeSubNav changes from Sidebar navigation
  React.useEffect(() => {
    if (activeSubNav && ALL_REPORTS_REGISTRY.some(r => r.id === activeSubNav)) {
      setActiveReportId(activeSubNav as MasterReportId);
    }
  }, [activeSubNav]);

  const handleSelectReport = (id: MasterReportId) => {
    setActiveReportId(id);
    if (setActiveSubNav) {
      setActiveSubNav(id);
    }
  };

  const [suiteFilter, setSuiteFilter] = useState<'all' | ReportSuite>('all');
  const [reportSearch, setReportSearch] = useState('');

  const activeReportMeta = ALL_REPORTS_REGISTRY.find(r => r.id === activeReportId) || ALL_REPORTS_REGISTRY[0];

  // Filtered reports for sidebar / quick navigator
  const filteredReportList = ALL_REPORTS_REGISTRY.filter(r => {
    if (suiteFilter !== 'all' && r.category !== suiteFilter) return false;
    if (!reportSearch) return true;
    const q = reportSearch.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      String(r.num).includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-800 text-amber-400 flex items-center justify-center shadow-md shadow-teal-900/20 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Reports & Business Intelligence
              </h1>
              <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                18 Enterprise Reports
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Comprehensive POS shift Z-reports, inventory inwards/outwards, supplier registers, day book, general ledger, and IFRS financial statements
            </p>
          </div>
        </div>

        {/* Global Quick Action */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Current Report</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Net Sales Revenue</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
            ৳{metrics.totalSales.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {data.sales.length} settled dining invoices
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Closing Inventory Asset</span>
            <Boxes className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-teal-800 mt-1">
            ৳{Math.round(metrics.totalClosingStockVal).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Physical raw material valuation
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Supplier Payables Due</span>
            <ShoppingCart className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-700 mt-1">
            ৳{metrics.totalVendorDue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Outstanding procurement balance
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Customer Receivables Due</span>
            <Users className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-700 mt-1">
            ৳{metrics.totalCustomerDue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Arrears guest credit balances
          </div>
        </div>
      </div>

      {/* Module / Suite Filter Tabs & Report Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
        {/* Suite Category Filter Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All 18 Reports' },
              { id: 'pos', label: '0. POS Shifts (Z-Report)' },
              { id: 'inventory', label: '1. Inventory (1-3)' },
              { id: 'procurement', label: '2. Procurement (4-8)' },
              { id: 'receivables', label: '3. Books & Registers (9-13)' },
              { id: 'financials', label: '4. IFRS Statements (14-17)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSuiteFilter(tab.id as 'all' | ReportSuite)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  suiteFilter === tab.id
                    ? 'bg-slate-900 text-amber-400 shadow-xs font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Report Search / Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              placeholder="Search among 18 reports..."
              className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* 18 Reports Grid / Quick Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar p-1">
          {filteredReportList.map(rep => {
            const Icon = rep.icon;
            const isSelected = activeReportId === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => handleSelectReport(rep.id)}
                className={`text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-50 border-teal-500 shadow-xs text-teal-950 ring-1 ring-teal-500'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                  isSelected ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {rep.num}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold truncate text-slate-900">
                    {rep.title}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {rep.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Report Header Title */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-800 text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
            {activeReportMeta.num}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                Report #{activeReportMeta.num} &bull; {activeReportMeta.category.toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">
              {activeReportMeta.title}
            </h2>
            <p className="text-xs text-slate-300">
              {activeReportMeta.description}
            </p>
          </div>
        </div>
      </div>

      {/* REPORT CONTENT RENDERING */}
      {/* 0. POS Shift Session & Z-Reports */}
      {activeReportId === 'pos-sessions' && (
        <PosSessionReports />
      )}

      {/* Commission Agents & Delivery Portals Report */}
      {activeReportId === 'commission-report' && (
        <CommissionReports />
      )}

      {/* 1. User Wise Sales Report */}
      {activeReportId === 'user-sales' && (
        <UserSalesReport />
      )}

      {/* 2. Item Wise Sales Report */}
      {activeReportId === 'item-sales' && (
        <ItemSalesReport />
      )}

      {/* 3. Menu Category Wise Sales Report */}
      {activeReportId === 'category-sales' && (
        <MenuCategorySalesReport />
      )}

      {/* 4. Kitchen Department Wise Sales Report */}
      {activeReportId === 'department-sales' && (
        <KitchenDepartmentSalesReport />
      )}

      {/* 1. Inventory Inwards */}
      {activeReportId === 'inventory-inwards' && (
        <InventoryReports reportType="inwards" />
      )}

      {/* 2. Inventory Outward */}
      {activeReportId === 'inventory-outward' && (
        <InventoryReports reportType="outwards" />
      )}

      {/* 3. Inventory Transactional Stock Ledger */}
      {activeReportId === 'inventory-transactional' && (
        <InventoryReports reportType="transactional" />
      )}

      {/* 4. Supplier Wise Total PO */}
      {activeReportId === 'supplier-total-po' && (
        <ProcurementReports reportType="supplier-po" />
      )}

      {/* 5. Supplier Wise GRN Report */}
      {activeReportId === 'supplier-grn' && (
        <ProcurementReports reportType="supplier-grn" />
      )}

      {/* 6. Supplier Wise Return Report */}
      {activeReportId === 'supplier-returns' && (
        <ProcurementReports reportType="supplier-returns" />
      )}

      {/* 7. All Reports of Purchase */}
      {activeReportId === 'all-purchases' && (
        <ProcurementReports reportType="all-purchases" />
      )}

      {/* 8. Vendor Report (Vendor Statement) */}
      {activeReportId === 'vendor-statement' && (
        <ProcurementReports reportType="vendor-statement" />
      )}

      {/* 9. Receivable Report */}
      {activeReportId === 'receivable-report' && (
        <ReceivablesRegistersReports reportType="receivables" />
      )}

      {/* 10. Ageing Schedule */}
      {activeReportId === 'ageing-schedule' && (
        <ReceivablesRegistersReports reportType="ageing" />
      )}

      {/* 11. Day Book */}
      {activeReportId === 'day-book' && (
        <ReceivablesRegistersReports reportType="day-book" />
      )}

      {/* 12. Ledger Report */}
      {activeReportId === 'ledger-report' && (
        <ReceivablesRegistersReports reportType="ledger" />
      )}

      {/* 13. Receipt & Payment Report */}
      {activeReportId === 'receipt-payment' && (
        <ReceivablesRegistersReports reportType="receipt-payment" />
      )}

      {/* 14. Trial Balance */}
      {activeReportId === 'trial-balance' && (
        <FinancialStatementsReports reportType="trial-balance" />
      )}

      {/* 15. Profit & Loss Account (IFRS) */}
      {activeReportId === 'pnl-ifrs' && (
        <FinancialStatementsReports reportType="pnl-ifrs" />
      )}

      {/* 16. Balance Sheet (IFRS) */}
      {activeReportId === 'balance-sheet' && (
        <FinancialStatementsReports reportType="balance-sheet" />
      )}

      {/* 17. Cash Flow Statement */}
      {activeReportId === 'cash-flow' && (
        <FinancialStatementsReports reportType="cash-flow" />
      )}
    </div>
  );
};
