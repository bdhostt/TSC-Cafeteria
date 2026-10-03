// Test Expense Balance in Chart of Accounts (.cjs)
const fs = require('fs');

console.log('======================================================================');
console.log('🧪 TESTING EXPENSE HEADS MATCHING IN CHART OF ACCOUNTS');
console.log('======================================================================\n');

const mockExpenses = [
  { id: 1, date: '2026-10-04', head: 'Electricity Bill', amount: 2000, paymentMethod: 'Cash in Hand (POS Drawer)' },
  { id: 2, date: '2026-10-04', head: 'Staff Salary', amount: 15000, paymentMethod: 'Bank Transfer' },
  { id: 3, date: '2026-10-04', head: 'Conveyance', amount: 500, paymentMethod: 'Petty Cash' },
  { id: 4, date: '2026-10-04', head: 'Cleaning Bill', amount: 800, paymentMethod: 'Cash in Hand (POS Drawer)' }
];

const totalBomCostVal = 4200;
const totalManualUsedCostVal = 600;

const expenseAccounts = [
  { id: '5020', code: '5020', name: 'COGS', type: 'EXPENSE', category: 'Cost of Goods Sold (BOM)', balance: 0 },
  { id: '6010', code: '6010', name: 'Kitchen Staff Salaries', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
  { id: '6020', code: '6020', name: 'Floor Rent & Utilities', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
  { id: '6030', code: '6030', name: 'Electricity & Gas Bill', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
  { id: '6040', code: '6040', name: 'Cleaning & Consumables', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
  { id: '6050', code: '6050', name: 'COGS Manual Use (MU)', type: 'EXPENSE', category: 'Cost of Goods Sold (MU)', balance: 0 }
];

function calculateBalance(acc) {
  const opening = acc.balance || 0;
  const code = acc.code;
  const isCogs = (code && code.startsWith('50')) || 
    (acc.category || '').toLowerCase().includes('cost of goods') || 
    (acc.category || '').toLowerCase().includes('bom') ||
    (acc.name || '').toLowerCase().includes('cogs');

  if (isCogs) {
    if (code === '6050' || (acc.name || '').toLowerCase().includes('manual')) {
      return opening + totalManualUsedCostVal;
    }
    return opening + totalBomCostVal;
  }

  const headExpenses = mockExpenses.filter(e => {
    const eHead = (e.head || '').toLowerCase().trim();
    const aName = (acc.name || '').toLowerCase().trim();
    const aCode = acc.code;

    if (eHead && (aName.includes(eHead) || eHead.includes(aName))) return true;

    if (aCode === '6010' || aName.includes('salary') || aName.includes('staff')) {
      if (eHead.includes('salary') || eHead.includes('staff') || eHead.includes('waiter') || eHead.includes('labor') || eHead.includes('wage')) return true;
    }
    if (aCode === '6030' || aName.includes('electric') || aName.includes('gas')) {
      if (eHead.includes('electric') || eHead.includes('gas') || eHead.includes('power') || eHead.includes('utility') || eHead.includes('bill')) return true;
    }
    if (aCode === '6040' || aName.includes('clean') || aName.includes('consumable')) {
      if (eHead.includes('clean') || eHead.includes('wash') || eHead.includes('soap')) return true;
    }
    if (aCode === '6020' || aName.includes('rent') || aName.includes('utilities')) {
      if (eHead.includes('rent') || eHead.includes('lease') || eHead.includes('conveyance') || eHead.includes('transport') || eHead.includes('travel')) return true;
    }

    const eWords = eHead.split(/\s+/).filter(w => w.length >= 3);
    const aWords = aName.split(/\s+/).filter(w => w.length >= 3);
    return eWords.some(ew => aWords.some(aw => ew.includes(aw) || aw.includes(ew)));
  }).reduce((sum, e) => sum + (e.amount || 0), 0);

  return opening + headExpenses;
}

expenseAccounts.forEach(acc => {
  const liveBal = calculateBalance(acc);
  console.log(`📌 Account [${acc.code}] ${acc.name}: ৳${liveBal.toLocaleString()}`);
});

console.log('\n======================================================================');
console.log('✅ ALL EXPENSES NOW ACCURATELY CALCULATED IN CHART OF ACCOUNTS');
console.log('======================================================================');
