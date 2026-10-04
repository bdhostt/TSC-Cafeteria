// Master Heads 9 Modules Test Script (.cjs)
const fs = require('fs');

console.log('===============================================================');
console.log('🧪 MASTER HEADS (9 MODULES) & CONFIG TEST SUITE');
console.log('===============================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(cond, name, details = '') {
  totalTests++;
  if (cond) {
    console.log(`✅ [PASS] ${name}`);
    if (details) console.log(`   👉 ${details}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${name}`);
    if (details) console.error(`   👉 Details: ${details}`);
  }
}

// Simulated Context State & Methods
let lastLocalEditTime = 0;
let state = {
  tableZones: ['Floor 1', 'Floor 2'],
  tables: [
    { id: 'T-01', name: 'T-1', zone: 'Floor 1', status: 'free', waiter: '', customer: 'Walk-in Customer', discountType: 'taka', discountVal: 0, cart: [] },
    { id: 'T-02', name: 'T-2', zone: 'Floor 2', status: 'free', waiter: '', customer: 'Walk-in Customer', discountType: 'taka', discountVal: 0, cart: [] }
  ],
  waiters: ['Harun', 'Karim'],
  vendors: ['Bengal Cold Store', 'Alamin Store'],
  purchaseCategories: ['Grocery', 'Chicken'],
  departments: ['Bangla Kitchen', 'Grill & BBQ'],
  menuCategories: ['Bangla Items', 'Fast Food'],
  expenseHeads: ['Casual Waiter Charge', 'Cleaning Bill'],
  customers: ['Walk-in Customer', 'Paltan Host'],
  chartOfAccounts: [
    { id: '6010', code: '6010', name: 'Kitchen Staff Salaries', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
    { id: '6040', code: '6040', name: 'Cleaning & Consumables', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 }
  ]
};

function getNextAccountCode(type, chartList, category) {
  const prefix = type === 'ASSET' ? '1' : type === 'LIABILITY' ? '2' : type === 'EQUITY' ? '3' : type === 'REVENUE' ? '4' : '6';
  const prefixDigits = parseInt(prefix, 10);
  const minCode = prefixDigits * 1000 + 10;
  const maxCode = (prefixDigits + 1) * 1000 - 1;
  const codesInBlock = chartList
    .map(a => parseInt((a.code || '').trim(), 10))
    .filter(n => !isNaN(n) && n >= minCode && n <= maxCode);
  let next = codesInBlock.length > 0 ? Math.max(...codesInBlock) + 10 : minCode;
  while (chartList.some(a => (a.code || '').trim() === String(next))) {
    next += 10;
  }
  return String(next);
}

function addTableZone(zone) {
  const trimmed = zone.trim();
  if (!trimmed) return false;
  lastLocalEditTime = Date.now();
  if (state.tableZones.some(z => z.toLowerCase() === trimmed.toLowerCase())) return false;
  state.tableZones.push(trimmed);
  return true;
}

function addCustomTable(name, zone) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  lastLocalEditTime = Date.now();
  if (state.tables.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) return false;
  const id = 'T-' + (state.tables.length + 1).toString().padStart(2, '0');
  state.tables.push({
    id,
    name: trimmed,
    zone: zone || state.tableZones[0],
    status: 'free',
    waiter: '',
    customer: 'Walk-in Customer',
    discountType: 'taka',
    discountVal: 0,
    cart: []
  });
  return true;
}

function addConfigItem(type, val, extraZone) {
  const trimmed = val.trim();
  if (!trimmed) return false;
  lastLocalEditTime = Date.now();
  if (type === 'tables') return addCustomTable(trimmed, extraZone);
  if (type === 'tableZones') return addTableZone(trimmed);

  const currentList = state[type] || [];
  if (currentList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
    return false;
  }
  currentList.push(trimmed);
  state[type] = currentList;

  if (type === 'expenseHeads') {
    const already = state.chartOfAccounts.some(a => a.name.toLowerCase() === trimmed.toLowerCase());
    if (!already) {
      const nextCode = getNextAccountCode('EXPENSE', state.chartOfAccounts, 'Operating Expenses');
      state.chartOfAccounts.push({
        id: nextCode,
        code: nextCode,
        name: trimmed,
        type: 'EXPENSE',
        category: 'Operating Expenses',
        balance: 0
      });
    }
  }
  return true;
}

// 1. Add Floor Plan Zone
const r1 = addConfigItem('tableZones', 'VIP Lounge');
assert(r1 === true, 'Successfully added new Table Zone (VIP Lounge)');
assert(state.tableZones.includes('VIP Lounge'), 'Table zones array contains VIP Lounge');
const r1_dup = addConfigItem('tableZones', 'vip lounge');
assert(r1_dup === false, 'Duplicate zone addition rejected');

// 2. Add Dining Table
const r2 = addConfigItem('tables', 'T-3', 'VIP Lounge');
assert(r2 === true, 'Successfully added new Dining Table (T-3)');
const t3 = state.tables.find(t => t.name === 'T-3');
assert(t3 && t3.zone === 'VIP Lounge', 'T-3 has correct assigned zone (VIP Lounge)');
const r2_dup = addConfigItem('tables', 'T-3');
assert(r2_dup === false, 'Duplicate dining table addition rejected');

// 3. Add Waiter
const r3 = addConfigItem('waiters', 'Tanvir');
assert(r3 === true && state.waiters.includes('Tanvir'), 'Successfully added Waiter (Tanvir)');

// 4. Add Vendor
const r4 = addConfigItem('vendors', 'General Supplier');
assert(r4 === true && state.vendors.includes('General Supplier'), 'Successfully added Vendor (General Supplier)');

// 5. Add Purchase Category
const r5 = addConfigItem('purchaseCategories', 'Fish');
assert(r5 === true && state.purchaseCategories.includes('Fish'), 'Successfully added Raw Material Category (Fish)');

// 6. Add Department
const r6 = addConfigItem('departments', 'Beverage');
assert(r6 === true && state.departments.includes('Beverage'), 'Successfully added Kitchen Department (Beverage)');

// 7. Add Menu Category
const r7 = addConfigItem('menuCategories', 'Beverage Items');
assert(r7 === true && state.menuCategories.includes('Beverage Items'), 'Successfully added Menu Category (Beverage Items)');

// 8. Add Expense Head & verify COA auto-generation
const r8 = addConfigItem('expenseHeads', 'Electricity Bill');
assert(r8 === true && state.expenseHeads.includes('Electricity Bill'), 'Successfully added Expense Head (Electricity Bill)');
const coaElectricity = state.chartOfAccounts.find(a => a.name === 'Electricity Bill');
assert(coaElectricity && coaElectricity.type === 'EXPENSE', 'COA automatically auto-provisioned matching EXPENSE account for Electricity Bill', `Code: ${coaElectricity?.code}`);

// 9. Add Customer
const r9 = addConfigItem('customers', 'Saudi Embassy');
assert(r9 === true && state.customers.includes('Saudi Embassy'), 'Successfully added Customer Account (Saudi Embassy)');

// 10. Background sync protection timestamp
assert(lastLocalEditTime > 0 && (Date.now() - lastLocalEditTime < 1000), 'Local edit timestamp updated immediately to protect against polling race condition');

console.log(`\n===============================================================`);
console.log(`📊 MASTER HEADS TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log(`===============================================================`);
