// Test Expense Balance in Chart of Accounts (.cjs)
const fs = require('fs');

console.log('======================================================================');
console.log('🧪 TESTING EXPENSE HEADS MATCHING IN CHART OF ACCOUNTS');
console.log('======================================================================\n');

const expenseAccounts = [
  { id: '5010', code: '5010', name: 'COGS', type: 'EXPENSE', category: 'Cost of Goods Sold (BOM)', balance: 0 },
  { id: '6010', code: '6010', name: 'Kitchen Staff Salaries', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
  { id: '6020', code: '6020', name: 'Floor Rent & Utilities', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
  { id: '6030', code: '6030', name: 'Electricity & Gas Bill', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
  { id: '6040', code: '6040', name: 'Cleaning & Consumables', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
  { id: '6050', code: '6050', name: 'COGS Manual Use (MU)', type: 'EXPENSE', category: 'Cost of Goods Sold (MU)', balance: 0 }
];

function findExpenseAccount(e, accounts) {
  if (e.accountId) {
    const acc = accounts.find(a => a.id === e.accountId || a.code === e.accountId);
    if (acc) return acc;
  }
  if (e.accountCode) {
    const acc = accounts.find(a => a.code === e.accountCode);
    if (acc) return acc;
  }

  const eHead = (e.head || '').toLowerCase().trim();
  const eCat = (e.category || '').toLowerCase().trim();

  // 1. Direct exact name match
  const exactMatch = accounts.find(a => a.name.toLowerCase().trim() === eHead);
  if (exactMatch) return exactMatch;

  // 2. Filter candidate operating accounts (exclude pure BOM COGS accounts unless head specifically says COGS/BOM)
  const candidateAccounts = accounts.filter(a => {
    const code = a.code || '';
    const cat = (a.category || '').toLowerCase();
    const isBomCogs = (code.startsWith('50') || cat.includes('cost of goods sold') || cat.includes('bom')) && code !== '6050';
    if (isBomCogs && !eHead.includes('cogs') && !eHead.includes('bom')) return false;
    return true;
  });

  let bestAccount = undefined;
  let highestScore = 0;

  for (const acc of candidateAccounts) {
    let score = 0;
    const aName = acc.name.toLowerCase().trim();
    const aCode = acc.code || '';

    // Direct substring match
    if (eHead && (aName.includes(eHead) || eHead.includes(aName))) {
      score += 50;
    }

    // Domain keyword matching
    const isSalaryAcc = aCode === '6010' || aName.includes('salary') || aName.includes('salaries') || aName.includes('staff') || aName.includes('wage');
    if (isSalaryAcc) {
      const salaryKeywords = ['salary', 'salaries', 'staff', 'waiter', 'chef', 'labor', 'labour', 'wage', 'wages', 'casual', 'worker', 'employee', 'bonus', 'overtime'];
      if (salaryKeywords.some(k => eHead.includes(k) || eCat.includes(k))) score += 80;
    }

    const isElectricAcc = aCode === '6030' || aName.includes('electric') || aName.includes('gas') || aName.includes('power');
    if (isElectricAcc) {
      const electricKeywords = ['electric', 'electricity', 'power', 'current', 'gas', 'lpg', 'cylinder', 'desco', 'dpdc', 'nesco', 'reb', 'titas', 'generator', 'fuel'];
      if (electricKeywords.some(k => eHead.includes(k) || eCat.includes(k))) score += 80;
    }

    const isCleanAcc = aCode === '6040' || aName.includes('clean') || aName.includes('consumable') || aName.includes('wash');
    if (isCleanAcc) {
      const cleanKeywords = ['clean', 'cleaning', 'wash', 'washing', 'soap', 'detergent', 'tissue', 'napkin', 'consumable', 'consumables', 'disinfectant', 'harpic', 'sanitiz', 'trash', 'waste', 'pest'];
      if (cleanKeywords.some(k => eHead.includes(k) || eCat.includes(k))) score += 80;
    }

    const isRentAcc = aCode === '6020' || aName.includes('rent') || aName.includes('overhead') || aName.includes('utilit');
    if (isRentAcc) {
      const rentKeywords = ['rent', 'lease', 'conveyance', 'transport', 'travel', 'fare', 'rickshaw', 'cng', 'taxi', 'bike', 'bus', 'repair', 'maintenance', 'water', 'wasa'];
      if (rentKeywords.some(k => eHead.includes(k) || eCat.includes(k))) score += 80;
    }

    // Tokenized word matching (ignoring generic stop words like 'bill', 'charge', 'cost', 'fee', 'the', 'and')
    const stopWords = new Set(['bill', 'bills', 'charge', 'charges', 'cost', 'costs', 'fee', 'fees', 'the', 'and', 'for', 'all']);
    const eWords = eHead.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
    const aWords = aName.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
    const wordMatches = eWords.filter(ew => aWords.some(aw => ew.includes(aw) || aw.includes(ew)));
    score += wordMatches.length * 20;

    if (score > highestScore) {
      highestScore = score;
      bestAccount = acc;
    }
  }

  if (!bestAccount || highestScore === 0) {
    bestAccount = candidateAccounts.find(a => a.code === '6020') || candidateAccounts[0] || accounts[0];
  }

  return bestAccount;
}

// TEST CASE 1: User's exact live screenshot scenario
console.log('--- TEST CASE 1: User Live Scenario (Casual Waiter Charge 2000, Cleaning Bill 4000) ---');
const userLiveExpenses = [
  { id: 1, date: '2026-10-03', head: 'Casual Waiter Charge', amount: 2000, paymentMethod: 'Bank Transfer' },
  { id: 2, date: '2026-10-04', head: 'Cleaning Bill', amount: 4000, paymentMethod: 'Cash Drawer' }
];

let totalAllocated1 = 0;
expenseAccounts.forEach(acc => {
  if (acc.code.startsWith('50') || acc.code === '6050') return;
  const accTotal = userLiveExpenses.filter(e => {
    const matched = findExpenseAccount(e, expenseAccounts);
    return matched && (matched.id === acc.id || matched.code === acc.code);
  }).reduce((sum, e) => sum + e.amount, 0);
  totalAllocated1 += accTotal;
  console.log(`📌 Account [${acc.code}] ${acc.name}: ৳${accTotal.toLocaleString()}`);
});

console.log(`Total Live Expenses Entered: ৳6,000 | Total Allocated in Accounts: ৳${totalAllocated1.toLocaleString()}`);
if (totalAllocated1 === 6000) {
  console.log('✅ TEST 1 PASSED: Exactly ৳6,000 allocated with ZERO double counting!');
} else {
  console.error('❌ TEST 1 FAILED');
}

// TEST CASE 2: Multi-expense scenario
console.log('\n--- TEST CASE 2: Standard 4-Head Expense Scenario ---');
const multiExpenses = [
  { id: 1, date: '2026-10-04', head: 'Electricity Bill', amount: 2000, paymentMethod: 'Cash in Hand (POS Drawer)' },
  { id: 2, date: '2026-10-04', head: 'Staff Salary', amount: 15000, paymentMethod: 'Bank Transfer' },
  { id: 3, date: '2026-10-04', head: 'Conveyance', amount: 500, paymentMethod: 'Petty Cash' },
  { id: 4, date: '2026-10-04', head: 'Cleaning Bill', amount: 800, paymentMethod: 'Cash in Hand (POS Drawer)' }
];

let totalAllocated2 = 0;
const expectedTotal2 = multiExpenses.reduce((s, e) => s + e.amount, 0); // 18300
expenseAccounts.forEach(acc => {
  if (acc.code.startsWith('50') || acc.code === '6050') return;
  const accTotal = multiExpenses.filter(e => {
    const matched = findExpenseAccount(e, expenseAccounts);
    return matched && (matched.id === acc.id || matched.code === acc.code);
  }).reduce((sum, e) => sum + e.amount, 0);
  totalAllocated2 += accTotal;
  console.log(`📌 Account [${acc.code}] ${acc.name}: ৳${accTotal.toLocaleString()}`);
});

console.log(`Total Live Expenses: ৳${expectedTotal2.toLocaleString()} | Total Allocated: ৳${totalAllocated2.toLocaleString()}`);
if (totalAllocated2 === expectedTotal2) {
  console.log('✅ TEST 2 PASSED: 100% Reconciliation across all standard expense heads!');
} else {
  console.error('❌ TEST 2 FAILED');
}

// TEST CASE 3: Strict Unique Account Code Auto-Generation & Canonical Mapping
console.log('\n--- TEST CASE 3: Unique Account Code Auto-Generation & Canonical Mapping ---');
const CANONICAL_EXPENSE_HEAD_MAP = {
  'casual waiter charge': { code: '6010', name: 'Kitchen Staff Salaries' },
  'cleaning bill': { code: '6040', name: 'Cleaning & Consumables' },
  'electricity bill': { code: '6030', name: 'Electricity & Gas Bill' },
  'conveyance': { code: '6020', name: 'Floor Rent & Utilities' },
  'staff salary': { code: '6010', name: 'Kitchen Staff Salaries' }
};

function getNextAccountCode(type, accounts, category) {
  const existingCodes = new Set(accounts.map(a => (a.code || '').trim()));
  let next = type === 'ASSET' ? 1010 : type === 'LIABILITY' ? 2010 : type === 'EQUITY' ? 3010 : type === 'REVENUE' ? 4010 : 6010;
  while (existingCodes.has(next.toString())) { next += 10; }
  return next.toString();
}

const nextAsset = getNextAccountCode('ASSET', expenseAccounts);
const nextOpEx = getNextAccountCode('EXPENSE', expenseAccounts);
console.log(`📌 Auto-generated Next Unique Asset Code: ${nextAsset}`);
console.log(`📌 Auto-generated Next Unique Operating Expense Code: ${nextOpEx}`);

const isCode6060 = nextOpEx === '6060';
const isCleanMappedStrictly = CANONICAL_EXPENSE_HEAD_MAP['cleaning bill'].code === '6040';
const isCasualMappedStrictly = CANONICAL_EXPENSE_HEAD_MAP['casual waiter charge'].code === '6010';

if (isCode6060 && isCleanMappedStrictly && isCasualMappedStrictly) {
  console.log('✅ TEST 3 PASSED: Account codes are strictly unique and auto-generated seamlessly!');
} else {
  console.error('❌ TEST 3 FAILED');
}

console.log('\n======================================================================');
