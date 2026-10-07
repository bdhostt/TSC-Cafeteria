import React, { useState, useEffect } from 'react';
import { useRestaurant, DEFAULT_PAYMENT_METHODS } from '../../context/RestaurantContext';
import { PaymentMethodConfig, PaymentMethodType } from '../../types';
import {
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  Smartphone,
  Banknote,
  Building,
  UserCheck,
  Zap,
  Search,
  AlertTriangle,
  Star,
  Sliders,
  DollarSign,
  QrCode
} from 'lucide-react';

export interface PaymentTypeOption {
  type: PaymentMethodType;
  label: string;
  bnLabel: string;
  subTitle: string;
  bnSubTitle: string;
  defaultProvider: string;
  defaultLedgerCode: string;
  badgeClass: string;
  borderClass: string;
  activeBorderClass: string;
}

export const PAYMENT_TYPE_OPTIONS: PaymentTypeOption[] = [
  {
    type: 'CASH',
    label: 'Cash in Hand',
    bnLabel: 'ক্যাশ ইন হ্যান্ড',
    subTitle: 'Physical cash drawer currency',
    bnSubTitle: 'কাউন্টারে নগদ ক্যাশ লেনদেন',
    defaultProvider: 'Drawer Cash',
    defaultLedgerCode: '1010',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderClass: 'border-slate-200 hover:border-emerald-300',
    activeBorderClass: 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50/70 text-emerald-950'
  },
  {
    type: 'MFS',
    label: 'Mobile Banking (MFS)',
    bnLabel: 'মোবাইল ব্যাংকিং (MFS)',
    subTitle: 'bKash, Nagad, Rocket, Upay QR & App',
    bnSubTitle: 'বিকাশ, নগদ, রকেট কিউআর ও ওয়ালেট',
    defaultProvider: 'bKash',
    defaultLedgerCode: '1040',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-300',
    borderClass: 'border-slate-200 hover:border-pink-300',
    activeBorderClass: 'border-pink-500 ring-2 ring-pink-400 bg-pink-50/70 text-pink-950'
  },
  {
    type: 'CARD',
    label: 'Bank Card / POS',
    bnLabel: 'ব্যাংক কার্ড / পিওএস',
    subTitle: 'Visa, Mastercard, Amex POS swipe terminal',
    bnSubTitle: 'ভিসা, মাস্টারকার্ড, পিওএস মেশিন সোয়াইপ',
    defaultProvider: 'POS Terminal',
    defaultLedgerCode: '1030',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    borderClass: 'border-slate-200 hover:border-blue-300',
    activeBorderClass: 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/70 text-blue-950'
  },
  {
    type: 'BANK',
    label: 'Bank Wire Transfer',
    bnLabel: 'ব্যাংক ওয়্যার ট্রান্সফার',
    subTitle: 'Direct BEFTN / NPSB / RTGS account transfer',
    bnSubTitle: 'সরাসরি ব্যাংক একাউন্টে ট্রান্সফার ও চেক',
    defaultProvider: 'Bank Transfer',
    defaultLedgerCode: '1030',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    borderClass: 'border-slate-200 hover:border-indigo-300',
    activeBorderClass: 'border-indigo-500 ring-2 ring-indigo-400 bg-indigo-50/70 text-indigo-950'
  },
  {
    type: 'CREDIT',
    label: 'Customer Due / Credit',
    bnLabel: 'কাস্টমার বাকি / ডিউ',
    subTitle: 'Dining billed to customer account ledger',
    bnSubTitle: 'কাস্টমারের নামে বাকি বা ক্রেডিট ব্যালেন্স',
    defaultProvider: 'Accounts Receivable',
    defaultLedgerCode: '1050',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    borderClass: 'border-slate-200 hover:border-amber-300',
    activeBorderClass: 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/70 text-amber-950'
  },
  {
    type: 'BANGLA_QR',
    label: 'Bangla QR (Universal QR)',
    bnLabel: 'বাংলা কিউআর (সর্বজনীন কিউআর)',
    subTitle: 'bKash, Nagad, Rocket, Cards & All Bank Apps',
    bnSubTitle: 'বিকাশ, নগদ, রকেট, কার্ড ও সকল ব্যাংক অ্যাপ কিউআর',
    defaultProvider: 'Bangla QR',
    defaultLedgerCode: '1030',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    borderClass: 'border-slate-200 hover:border-purple-300',
    activeBorderClass: 'border-purple-500 ring-2 ring-purple-400 bg-purple-50/70 text-purple-950'
  },
  {
    type: 'OTHER',
    label: 'Other Digital Gateway',
    bnLabel: 'অন্যান্য গেটওয়ে',
    subTitle: 'Custom digital payment or voucher gateway',
    bnSubTitle: 'অন্যান্য ডিজিটাল বা গিফট ভাউচার গেটওয়ে',
    defaultProvider: 'Custom Gateway',
    defaultLedgerCode: '1040',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    borderClass: 'border-slate-200 hover:border-slate-400',
    activeBorderClass: 'border-slate-600 ring-2 ring-slate-400 bg-slate-100 text-slate-900'
  }
];

export const PaymentMethodsConfigView: React.FC = () => {
  const {
    data,
    metrics,
    getLiveAccountBalance,
    getMethodLiveBalance,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    language
  } = useRestaurant();

  const paymentMethods: PaymentMethodConfig[] =
    data.paymentMethods && data.paymentMethods.length > 0
      ? data.paymentMethods
      : DEFAULT_PAYMENT_METHODS;

  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodConfig | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PaymentMethodConfig | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<PaymentMethodType>('MFS');
  const [formProvider, setFormProvider] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formChargePercent, setFormChargePercent] = useState<number>(0);
  const [formLedgerAccountId, setFormLedgerAccountId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Type Counts for dynamic filtering tabs
  const typeCounts: Record<string, number> = {
    ALL: paymentMethods.length,
    CASH: paymentMethods.filter(m => m.type === 'CASH').length,
    BANGLA_QR: paymentMethods.filter(m => m.type === 'BANGLA_QR').length,
    MFS: paymentMethods.filter(m => m.type === 'MFS').length,
    CARD: paymentMethods.filter(m => m.type === 'CARD').length,
    BANK: paymentMethods.filter(m => m.type === 'BANK').length,
    CREDIT: paymentMethods.filter(m => m.type === 'CREDIT').length,
    OTHER: paymentMethods.filter(m => m.type === 'OTHER').length,
  };

  // If active filter type no longer has any methods, reset to 'ALL'
  useEffect(() => {
    if (filterType !== 'ALL' && (typeCounts[filterType] || 0) === 0) {
      setFilterType('ALL');
    }
  }, [filterType, paymentMethods]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingMethod(null);
    // Inherit the active filter type if filtered by a specific type
    const initialType: PaymentMethodType =
      filterType !== 'ALL' && PAYMENT_TYPE_OPTIONS.some(o => o.type === filterType)
        ? (filterType as PaymentMethodType)
        : 'MFS';

    const defaultOpt = PAYMENT_TYPE_OPTIONS.find(o => o.type === initialType);
    setFormName('');
    setFormType(initialType);
    setFormProvider(defaultOpt?.defaultProvider || 'bKash');
    setFormAccountNumber('');
    setFormChargePercent(0);
    setFormLedgerAccountId(defaultOpt?.defaultLedgerCode || '1040');
    setFormNotes('');
    setFormIsActive(true);
    setFormIsDefault(false);
    setIsModalOpen(true);
  };

  const handleSelectType = (selectedType: PaymentMethodType) => {
    setFormType(selectedType);
    const opt = PAYMENT_TYPE_OPTIONS.find(o => o.type === selectedType);
    if (!opt) return;

    // When creating a new method, auto-fill suggested default provider & ledger code if empty or previous defaults
    if (!editingMethod) {
      const isProviderEmptyOrDefault =
        !formProvider || PAYMENT_TYPE_OPTIONS.some(o => o.defaultProvider === formProvider);
      if (isProviderEmptyOrDefault) {
        setFormProvider(opt.defaultProvider);
      }

      const isLedgerEmptyOrDefault =
        !formLedgerAccountId || PAYMENT_TYPE_OPTIONS.some(o => o.defaultLedgerCode === formLedgerAccountId);
      if (isLedgerEmptyOrDefault) {
        setFormLedgerAccountId(opt.defaultLedgerCode);
      }
    }
  };

  const handleOpenEdit = (m: PaymentMethodConfig) => {
    setEditingMethod(m);
    setFormName(m.name);
    setFormType(m.type);
    setFormProvider(m.providerName || '');
    setFormAccountNumber(m.accountNumber || '');
    setFormChargePercent(m.chargePercent || 0);
    setFormLedgerAccountId(m.ledgerAccountId || '');
    setFormNotes(m.notes || '');
    setFormIsActive(m.isActive !== false);
    setFormIsDefault(Boolean(m.isDefault));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter a payment method name');
      return;
    }

    const payload: Omit<PaymentMethodConfig, 'id'> = {
      name: formName.trim(),
      type: formType,
      providerName: formProvider.trim(),
      accountNumber: formAccountNumber.trim(),
      chargePercent: Number(formChargePercent) || 0,
      ledgerAccountId: formLedgerAccountId.trim() || undefined,
      notes: formNotes.trim(),
      isActive: formIsActive,
      isDefault: formIsDefault
    };

    if (editingMethod) {
      updatePaymentMethod(editingMethod.id, payload);
      showToast(language === 'bn' ? '✓ পেমেন্ট মেথড সফলভাবে আপডেট হয়েছে!' : '✓ Payment method updated successfully!');
    } else {
      addPaymentMethod(payload);
      showToast(language === 'bn' ? '✓ নতুন পেমেন্ট মেথড যোগ করা হয়েছে!' : '✓ New payment method added successfully!');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (m: PaymentMethodConfig) => {
    if (m.isDefault) {
      alert('Cannot delete the primary default payment method. Please set another method as default first.');
      return;
    }
    deletePaymentMethod(m.id);
    setDeleteConfirm(null);
    showToast(language === 'bn' ? 'পেমেন্ট মেথড মুছে ফেলা হয়েছে' : 'Payment method deleted');
  };

  const getTypeIcon = (type: PaymentMethodType, className?: string) => {
    const iconClass = className || 'w-4 h-4';
    switch (type) {
      case 'CASH':
        return <Banknote className={`${iconClass} text-emerald-600`} />;
      case 'BANGLA_QR':
        return <QrCode className={`${iconClass} text-purple-600`} />;
      case 'MFS':
        return <Smartphone className={`${iconClass} text-pink-600`} />;
      case 'CARD':
        return <CreditCard className={`${iconClass} text-blue-600`} />;
      case 'BANK':
        return <Building className={`${iconClass} text-indigo-600`} />;
      case 'CREDIT':
        return <UserCheck className={`${iconClass} text-amber-600`} />;
      default:
        return <Zap className={`${iconClass} text-slate-600`} />;
    }
  };

  const getTypeBadge = (type: PaymentMethodType) => {
    const opt = PAYMENT_TYPE_OPTIONS.find(o => o.type === type);
    const badgeClass = opt?.badgeClass || 'bg-slate-100 text-slate-800 border-slate-200';
    switch (type) {
      case 'CASH':
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeClass}`}>Cash</span>;
      case 'BANGLA_QR':
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeClass}`}>Bangla QR</span>;
      case 'MFS':
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeClass}`}>MFS / Mobile</span>;
      case 'CARD':
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeClass}`}>Card / POS</span>;
      case 'BANK':
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeClass}`}>Bank Transfer</span>;
      case 'CREDIT':
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeClass}`}>Credit / Due</span>;
      default:
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeClass}`}>Other</span>;
    }
  };

  // Metrics
  const totalCount = paymentMethods.length;
  const activeCount = paymentMethods.filter(m => m.isActive).length;
  const defaultMethod = paymentMethods.find(m => m.isDefault);
  const mfsCardCount = paymentMethods.filter(m => m.type === 'MFS' || m.type === 'CARD').length;

  // Filtered List
  const filteredMethods = paymentMethods.filter(m => {
    const matchesType = filterType === 'ALL' || m.type === filterType;
    const matchesSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.providerName && m.providerName.toLowerCase().includes(search.toLowerCase())) ||
      (m.accountNumber && m.accountNumber.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const chartAccounts = data.chartOfAccounts || [];

  const getMethodLiveAmount = (m: PaymentMethodConfig): number => {
    return getMethodLiveBalance(m);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-900 font-bold text-xs shadow-xs animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded-md">Live Update</span>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Payment Methods & Digital Channels
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? 'ক্যাশ, মোবাইল ব্যাংকিং (bKash/Nagad/Rocket), কার্ড সোয়াইপ মেশিন এবং ব্যাংক ট্রান্সফার চ্যানেল কনফিগার করুন'
                  : 'Configure Cash drawer, Mobile Financial Services (MFS), Bank POS swipe terminals, and ledger mapping'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Payment Method</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Methods</div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">{activeCount} Active in POS Checkout</div>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Cash Drawer (Live)</div>
          <div className="text-2xl font-black text-emerald-800">৳ {metrics.paymentAccountBalances.cashDrawer.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 mt-1">Available in register cash drawer</div>
        </div>

        <div className="p-4 bg-pink-50/70 border border-pink-200 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-pink-700 uppercase tracking-wider mb-1">MFS Inflow (bKash/Nagad)</div>
          <div className="text-2xl font-black text-pink-900">৳ {(metrics.paymentAccountBalances.bkashMerchant + metrics.paymentAccountBalances.nagadMerchant).toLocaleString()}</div>
          <div className="text-[10px] text-pink-600 mt-1">bKash ৳{metrics.paymentAccountBalances.bkashMerchant.toLocaleString()} | Nagad ৳{metrics.paymentAccountBalances.nagadMerchant.toLocaleString()}</div>
        </div>

        {(typeCounts.CARD > 0 || typeCounts.BANK > 0 || typeCounts.CREDIT === 0) ? (
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl shadow-xs">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">Bank & POS Card Sales</div>
            <div className="text-2xl font-black text-blue-900">৳ {(metrics.paymentAccountBalances.bankTransfer + metrics.payCard).toLocaleString()}</div>
            <div className="text-[10px] text-blue-600 mt-1">Bank ৳{metrics.paymentAccountBalances.bankTransfer.toLocaleString()} | Card ৳{metrics.payCard.toLocaleString()}</div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-xs">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">Customer Credit / Due</div>
            <div className="text-2xl font-black text-amber-900">৳ {(metrics.totalCustomerDue || 0).toLocaleString()}</div>
            <div className="text-[10px] text-amber-600 mt-1">Active customer credit balance</div>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            {[
              { id: 'ALL', label: language === 'bn' ? 'সব মেথড' : 'All Methods', icon: <Sliders className="w-3.5 h-3.5" /> },
              ...PAYMENT_TYPE_OPTIONS
                .filter(opt => (typeCounts[opt.type] || 0) > 0)
                .map(opt => ({
                  id: opt.type,
                  label: language === 'bn' ? opt.bnLabel : opt.label,
                  icon: getTypeIcon(opt.type, 'w-3.5 h-3.5')
                }))
            ].map(tab => {
              const isSelected = filterType === tab.id;
              const count = typeCounts[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#004b9b] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span className={isSelected ? 'text-white' : ''}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search method or account..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
            />
          </div>
        </div>

        {/* Active Filter Strip */}
        {(filterType !== 'ALL' || search) && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-slate-800 animate-in fade-in">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">
                {language === 'bn' ? 'ফিল্টার ভিত্তিক প্রদর্শিত:' : 'Filtered by:'}
              </span>
              {filterType !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white border border-blue-300 font-black text-[#004b9b] shadow-2xs">
                  {getTypeIcon(filterType as PaymentMethodType, 'w-3.5 h-3.5')}
                  <span>
                    {language === 'bn'
                      ? PAYMENT_TYPE_OPTIONS.find(o => o.type === filterType)?.bnLabel || filterType
                      : PAYMENT_TYPE_OPTIONS.find(o => o.type === filterType)?.label || filterType}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterType('ALL')}
                    className="hover:text-rose-600 font-bold ml-1 cursor-pointer text-slate-400 hover:bg-slate-100 rounded px-1"
                    title="Remove type filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-800 shadow-2xs">
                  <span>Search: "{search}"</span>
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="hover:text-rose-600 font-bold ml-1 cursor-pointer text-slate-400 hover:bg-slate-100 rounded px-1"
                    title="Clear search"
                  >
                    ✕
                  </button>
                </span>
              )}
              <span className="text-[11px] text-slate-500 font-semibold">
                ({filteredMethods.length} {language === 'bn' ? 'টি মেথড পাওয়া গেছে' : 'found'})
              </span>
            </div>

            <button
              type="button"
              onClick={() => { setFilterType('ALL'); setSearch(''); }}
              className="text-xs font-bold text-[#004b9b] hover:text-[#00356e] underline cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'সব মেথড দেখুন (Clear Filter)' : 'Show All Methods'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Methods Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold">Payment Method</th>
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Provider / Terminal</th>
                <th className="py-3 px-4 font-bold">Account / Mobile No.</th>
                <th className="py-3 px-4 font-bold">Ledger Link</th>
                <th className="py-3 px-4 font-bold text-right">Live Balance / Collected (৳)</th>
                <th className="py-3 px-4 font-bold text-center">Service Fee</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-center">Default</th>
                <th className="py-3 px-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMethods.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                        <Sliders className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-xs text-slate-600">
                        {language === 'bn'
                          ? 'নির্বাচিত ফিল্টারে কোনো পেমেন্ট মেথড পাওয়া যায়নি'
                          : 'No payment methods found matching the selected filter'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {filterType !== 'ALL'
                          ? language === 'bn'
                            ? `এই ক্যাটাগরিতে (${filterType}) নতুন মেথড যোগ করতে "+ Add" বাটনে ক্লিক করুন`
                            : `Click "+ Add Payment Method" to create a new method for ${filterType}`
                          : language === 'bn'
                          ? 'অন্য কোনো শব্দ দিয়ে সার্চ করুন'
                          : 'Try a different search query or clear filters'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {(filterType !== 'ALL' || search) && (
                          <button
                            type="button"
                            onClick={() => { setFilterType('ALL'); setSearch(''); }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            {language === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Clear Filters'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="px-3 py-1.5 bg-[#004b9b] hover:bg-[#005bb8] text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          + {language === 'bn' ? 'নতুন মেথড যোগ করুন' : 'Add Payment Method'}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMethods.map(m => {
                  const liveAmt = getMethodLiveAmount(m);
                  const linkedHead = m.ledgerAccountId ? chartAccounts.find(a => a.code === m.ledgerAccountId) : null;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50 transition cursor-pointer select-none"
                      onDoubleClick={() => handleOpenEdit(m)}
                    >
                      {/* Name & Icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
                            {getTypeIcon(m.type)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{m.name}</span>
                              {m.isDefault && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                  ★ Primary
                                </span>
                              )}
                            </div>
                            {m.notes && (
                              <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs">
                                {m.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setFilterType(m.type)}
                          className="group inline-flex items-center gap-1 cursor-pointer transition hover:scale-105 active:scale-95"
                          title={language === 'bn' ? `ক্লিক করে শুধুমাত্র ${m.type} মেথড ফিল্টার করুন` : `Click to filter by ${m.type}`}
                        >
                          {getTypeBadge(m.type)}
                          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition">
                            🔍
                          </span>
                        </button>
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {m.providerName || '—'}
                      </td>

                      {/* Account / Mobile No */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {m.accountNumber ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {m.accountNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">N/A</span>
                        )}
                      </td>

                      {/* Linked COA Ledger */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {linkedHead ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200" title={linkedHead.name}>
                            {linkedHead.code} - {linkedHead.name.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">—</span>
                        )}
                      </td>

                      {/* Live Balance / Collected */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-black">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          liveAmt > 0
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : liveAmt < 0
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          ৳ {liveAmt.toLocaleString()}
                        </span>
                      </td>

                      {/* Service Fee */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-slate-700">
                        {m.chargePercent && m.chargePercent > 0 ? (
                          <span className="text-amber-700 font-bold">{m.chargePercent}%</span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => updatePaymentMethod(m.id, { isActive: !m.isActive })}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border shadow-2xs ${
                            m.isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                              : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200 hover:border-slate-400'
                          }`}
                          title={m.isActive ? (language === 'bn' ? 'ক্লিক করে মেথডটি বন্ধ (Inactive) করুন' : 'Click to deactivate (Hide from POS)') : (language === 'bn' ? 'ক্লিক করে মেথডটি চালু (Active) করুন' : 'Click to activate (Show in POS)')}
                        >
                          <span className={`w-2 h-2 rounded-full transition-transform ${
                            m.isActive ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-slate-400'
                          }`} />
                          <span>{m.isActive ? (language === 'bn' ? 'সক্রিয় (Active)' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive')}</span>
                        </button>
                      </td>

                      {/* Default Toggle */}
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {m.isDefault ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center gap-1 w-fit mx-auto">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>Default</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDefaultPaymentMethod(m.id)}
                            className="text-[10px] text-slate-500 hover:text-amber-700 font-bold hover:underline cursor-pointer"
                          >
                            Set Default
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition cursor-pointer"
                            title="Edit payment method details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(m)}
                            disabled={m.isDefault}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              m.isDefault
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'hover:bg-rose-50 text-rose-600'
                            }`}
                            title={m.isDefault ? "Cannot delete default method" : "Delete payment method"}
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure payment gateway, provider, and account properties
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Payment Method Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Method Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. bKash Merchant (Counter 1)"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                />
              </div>

              {/* Payment Type Selection (Standard Dropdown Select) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {language === 'bn' ? 'পেমেন্ট টাইপ (Payment Type) *' : 'Payment Type *'}
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {language === 'bn' ? 'টাইপ ভিত্তিক ফিল্টারিং ও লেজার সংযোগ' : 'Type-based POS filtering & ledger mapping'}
                  </span>
                </div>
                <select
                  value={formType}
                  onChange={e => handleSelectType(e.target.value as PaymentMethodType)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#004b9b] font-medium text-slate-800 cursor-pointer"
                >
                  {PAYMENT_TYPE_OPTIONS.map(opt => (
                    <option key={opt.type} value={opt.type}>
                      {language === 'bn' ? opt.bnLabel : opt.label} ({opt.subTitle})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  {language === 'bn'
                    ? 'টাইপ পরিবর্তন করলে ডিফল্ট প্রোভাইডার ও লেজার হেড স্বয়ংক্রিয়ভাবে আপডেট হবে'
                    : 'Changing type auto-fills suggested provider and linked ledger head'}
                </p>
              </div>

              {/* Provider Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Provider / Channel / Machine Name
                </label>
                <input
                  type="text"
                  value={formProvider}
                  onChange={e => setFormProvider(e.target.value)}
                  placeholder="e.g. bKash, DBBL, City Bank, Drawer Cash"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account / Mobile / POS No.
                  </label>
                  <input
                    type="text"
                    value={formAccountNumber}
                    onChange={e => setFormAccountNumber(e.target.value)}
                    placeholder="e.g. 01846100900"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Service Charge (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formChargePercent}
                    onChange={e => setFormChargePercent(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                  />
                </div>
              </div>

              {chartAccounts.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Linked Chart of Accounts (Ledger Head)
                  </label>
                  <select
                    value={formLedgerAccountId}
                    onChange={e => setFormLedgerAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                  >
                    <option value="">-- No Ledger Link --</option>
                    {chartAccounts
                      .filter(a => a.type === 'ASSET' || a.type === 'LIABILITY')
                      .map(a => (
                        <option key={a.id} value={a.code}>
                          {a.code} - {a.name} ({a.category})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Cashier Instructions
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g. Scan QR code or enter transaction ID"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#004b9b]"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={e => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#004b9b] rounded border-slate-300 focus:ring-[#004b9b]"
                  />
                  <span className="text-xs font-bold text-slate-800">Active in POS Settlement</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={e => setFormIsDefault(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Set as Primary Default</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingMethod ? 'Save Changes' : 'Create Payment Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900 mb-1">
              Delete Payment Method?
            </h4>
            <p className="text-xs text-slate-500 mb-5">
              Are you sure you want to remove <strong>"{deleteConfirm.name}"</strong>? This will remove it from the payment options in POS settlement.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
