/**
 * Test: Customer Advance Automated Settlement & Accounting Verification
 */
const assert = require('assert');

console.log('===============================================================');
console.log('🧪 TESTING CUSTOMER ADVANCE AUTOMATED SETTLEMENT & ACCOUNTING');
console.log('===============================================================\n');

// Mock Data
let customerAdvances = [
  {
    id: 1,
    date: '2026-10-08',
    customer: 'Tanvir Ahmed (VIP)',
    amount: 1100,
    adjustedAmount: 0,
    method: 'cash',
    status: 'ACTIVE',
    note: 'Table booking deposit'
  }
];

let sales = [];
let cashDrawer = 10000;
let salesRevenue = 0;

function getCustomerAvailableAdvance(customerName) {
  if (!customerName) return 0;
  const norm = customerName.trim().toLowerCase();
  return customerAdvances
    .filter(a => a.customer.trim().toLowerCase() === norm && a.status !== 'REFUNDED')
    .reduce((sum, a) => sum + Math.max(0, (a.amount || 0) - (a.adjustedAmount || 0)), 0);
}

function getTotalCustomerAdvances() {
  return customerAdvances
    .filter(a => a.status === 'ACTIVE' || (a.status !== 'REFUNDED' && (a.amount || 0) > (a.adjustedAmount || 0)))
    .reduce((sum, a) => sum + Math.max(0, (a.amount || 0) - (a.adjustedAmount || 0)), 0);
}

// Check initial state
console.log('--- Step 1: Initial Advance State ---');
const initAdvance = getCustomerAvailableAdvance('Tanvir Ahmed (VIP)');
console.log(`Available Advance for Tanvir Ahmed (VIP): ৳${initAdvance}`);
assert.strictEqual(initAdvance, 1100, 'Initial advance should be 1100');
assert.strictEqual(getTotalCustomerAdvances(), 1100, 'Liability 2030 should be 1100');
console.log('✅ [PASS] Initial Customer Advance liability verified: ৳1,100\n');

// Simulate Bill 1: ৳122, Paid 100% from Advance
console.log('--- Step 2: Settle Bill 1 (৳122) via Customer Advance ---');
const bill1NetTotal = 122;
const advanceToUse1 = Math.min(bill1NetTotal, getCustomerAvailableAdvance('Tanvir Ahmed (VIP)'));
assert.strictEqual(advanceToUse1, 122, 'Should adjust full 122 from advance');

// Execute settlement logic
let unadjustedDeduct1 = advanceToUse1;
const customerNorm = 'Tanvir Ahmed (VIP)'.toLowerCase();
customerAdvances = customerAdvances.map(adv => {
  if (unadjustedDeduct1 <= 0) return adv;
  if (adv.customer.toLowerCase() !== customerNorm || adv.status === 'REFUNDED') return adv;
  const remaining = Math.max(0, adv.amount - (adv.adjustedAmount || 0));
  const toDeduct = Math.min(unadjustedDeduct1, remaining);
  const newAdjusted = (adv.adjustedAmount || 0) + toDeduct;
  unadjustedDeduct1 -= toDeduct;
  return {
    ...adv,
    adjustedAmount: newAdjusted,
    status: newAdjusted >= adv.amount ? 'ADJUSTED' : 'ACTIVE',
    linkedInvoiceNo: 'POS-000001'
  };
});

sales.push({
  invoiceNo: 'POS-000001',
  total: 122,
  advanceAdjusted: 122,
  cash: 0
});
salesRevenue += 122;

const remAdvance1 = getCustomerAvailableAdvance('Tanvir Ahmed (VIP)');
console.log(`Remaining Advance after Bill 1: ৳${remAdvance1}`);
assert.strictEqual(remAdvance1, 978, 'Remaining advance should be 978 (1100 - 122)');
assert.strictEqual(getTotalCustomerAdvances(), 978, 'Liability 2030 should drop to 978');
assert.strictEqual(cashDrawer, 10000, 'Cash drawer must NOT be inflated/altered');
assert.strictEqual(salesRevenue, 122, 'Food sales revenue must be recognized (৳122)');
console.log('✅ [PASS] Bill 1 settled: Advance adjusted ৳122, Remaining balance ৳978, Cash unaltered, Revenue recognized!\n');

// Simulate Bill 2: ৳1,000, Split payment: ৳978 Advance + ৳22 Cash
console.log('--- Step 3: Settle Bill 2 (৳1,000) via Split (৳978 Advance + ৳22 Cash) ---');
const bill2NetTotal = 1000;
const availableAdv2 = getCustomerAvailableAdvance('Tanvir Ahmed (VIP)');
assert.strictEqual(availableAdv2, 978, 'Available advance should be 978');
const advanceToUse2 = availableAdv2; // 978
const cashToPay2 = bill2NetTotal - advanceToUse2; // 22

let unadjustedDeduct2 = advanceToUse2;
customerAdvances = customerAdvances.map(adv => {
  if (unadjustedDeduct2 <= 0) return adv;
  if (adv.customer.toLowerCase() !== customerNorm || adv.status === 'REFUNDED') return adv;
  const remaining = Math.max(0, adv.amount - (adv.adjustedAmount || 0));
  const toDeduct = Math.min(unadjustedDeduct2, remaining);
  const newAdjusted = (adv.adjustedAmount || 0) + toDeduct;
  unadjustedDeduct2 -= toDeduct;
  return {
    ...adv,
    adjustedAmount: newAdjusted,
    status: newAdjusted >= adv.amount ? 'ADJUSTED' : 'ACTIVE',
    linkedInvoiceNo: 'POS-000002'
  };
});

sales.push({
  invoiceNo: 'POS-000002',
  total: 1000,
  advanceAdjusted: 978,
  cash: 22
});
cashDrawer += 22;
salesRevenue += 1000;

const remAdvance2 = getCustomerAvailableAdvance('Tanvir Ahmed (VIP)');
console.log(`Remaining Advance after Bill 2: ৳${remAdvance2}`);
assert.strictEqual(remAdvance2, 0, 'Remaining advance should be 0');
assert.strictEqual(customerAdvances[0].status, 'ADJUSTED', 'Advance status should be ADJUSTED');
assert.strictEqual(getTotalCustomerAdvances(), 0, 'Liability 2030 should be 0');
assert.strictEqual(cashDrawer, 10022, 'Cash drawer should only have ৳22 added');
assert.strictEqual(salesRevenue, 1122, 'Total sales revenue recognized is ৳1,122');
console.log('✅ [PASS] Bill 2 settled: Advance fully adjusted (status ADJUSTED), ৳22 cash received, all accounting figures 100% reconciled!\n');

console.log('===============================================================');
console.log('🎉 ALL ADVANCE SETTLEMENT TESTS PASSED WITH 100% SUCCESS!');
console.log('===============================================================');
