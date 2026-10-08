/**
 * Comprehensive Dynamic Customer & Advance Auto-Adjustment Test
 */
const assert = require('assert');

console.log('======================================================================');
console.log('🧪 TESTING DYNAMIC CUSTOMER CREATION & ADVANCE AUTO-ADJUSTMENT WORKFLOW');
console.log('======================================================================\n');

// Import isSameCustomer logic
function isSameCustomer(name1, name2) {
  if (!name1 || !name2) return false;
  const n1 = name1.trim().toLowerCase();
  const n2 = name2.trim().toLowerCase();
  if (!n1 || !n2) return false;
  if (n1.includes('walk-in') || n2.includes('walk-in')) {
    return n1 === n2;
  }
  if (n1 === n2) return true;

  const clean = (s) => s
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const c1 = clean(n1);
  const c2 = clean(n2);
  if (c1 && c2 && c1 === c2) return true;
  if (c1.length >= 3 && c2.length >= 3 && (c1.includes(c2) || c2.includes(c1))) return true;

  return false;
}

// App State Simulation
let state = {
  customers: ["Walk-in Customer", "Tanvir Ahmed (VIP)", "Foodpanda Delivery"],
  customerAdvances: [
    {
      id: 101,
      date: '2026-10-08',
      customer: 'Tanvir Ahmed (VIP)',
      amount: 1100,
      adjustedAmount: 0,
      method: 'cash',
      status: 'ACTIVE'
    }
  ],
  sales: [],
  cashDrawer: 10000
};

function getCustomerAvailableAdvance(customerName) {
  if (!customerName || !state.customerAdvances) return 0;
  const norm = customerName.trim().toLowerCase();
  if (!norm || norm === 'walk-in customer' || norm === 'walk-in') return 0;
  return (state.customerAdvances || [])
    .filter(a => isSameCustomer(a.customer, customerName) && a.status !== 'REFUNDED')
    .reduce((sum, a) => sum + Math.max(0, (a.amount || 0) - (a.adjustedAmount || 0)), 0);
}

function saveCustomerAdvance(adv) {
  const custName = (adv.customer || '').trim();
  const currentCusts = state.customers || [];
  const hasCust = currentCusts.some(c => isSameCustomer(c, custName));
  const updatedCustomers = (hasCust || !custName || custName.toLowerCase().includes('walk-in'))
    ? currentCusts
    : [...currentCusts, custName];

  const newAdv = {
    id: Date.now(),
    date: adv.date || '2026-10-08',
    customer: custName,
    amount: Number(adv.amount) || 0,
    adjustedAmount: 0,
    method: adv.method || 'CASH',
    status: 'ACTIVE'
  };

  state.customers = updatedCustomers;
  state.customerAdvances = [newAdv, ...state.customerAdvances];
}

// Settlement Function with React StrictMode test (running twice!)
function simulateSettlePayment(customerName, billNetTotal, advanceInput, cashInput) {
  const invoiceNo = 'POS-' + Math.floor(100000 + Math.random() * 900000);
  const targetCustomer = (customerName || '').trim();

  // Test React StrictMode: Run the updater function twice to ensure pure idempotency!
  const updater = (prev) => {
    let unadjustedAdvanceToDeduct = advanceInput;

    const updatedCustomerAdvances = (unadjustedAdvanceToDeduct > 0 && targetCustomer && !targetCustomer.toLowerCase().includes('walk-in'))
      ? (prev.customerAdvances || []).map(adv => {
          if (unadjustedAdvanceToDeduct <= 0) return adv;
          if (!isSameCustomer(adv.customer, targetCustomer) || adv.status === 'REFUNDED') return adv;

          const remainingOnThis = Math.max(0, (adv.amount || 0) - (adv.adjustedAmount || 0));
          if (remainingOnThis <= 0) return adv;

          const toDeduct = Math.min(unadjustedAdvanceToDeduct, remainingOnThis);
          const newAdjusted = (adv.adjustedAmount || 0) + toDeduct;
          unadjustedAdvanceToDeduct -= toDeduct;

          return {
            ...adv,
            adjustedAmount: newAdjusted,
            status: newAdjusted >= adv.amount ? 'ADJUSTED' : 'ACTIVE',
            linkedInvoiceNo: invoiceNo
          };
        })
      : (prev.customerAdvances || []);

    const currentCusts = prev.customers || [];
    const hasCust = currentCusts.some(c => isSameCustomer(c, targetCustomer));
    const updatedCustomers = (hasCust || !targetCustomer || targetCustomer.toLowerCase().includes('walk-in'))
      ? currentCusts
      : [...currentCusts, targetCustomer];

    return {
      ...prev,
      customers: updatedCustomers,
      customerAdvances: updatedCustomerAdvances,
      sales: [
        ...prev.sales,
        {
          invoiceNo,
          customer: targetCustomer,
          total: billNetTotal,
          advanceAdjusted: advanceInput,
          cash: cashInput
        }
      ],
      cashDrawer: prev.cashDrawer + cashInput
    };
  };

  // Simulate Strict Mode invocation:
  const firstPass = updater(state);
  const secondPass = updater(state); // If updater is pure and has local unadjusted variable, both passes match!
  
  assert.strictEqual(
    firstPass.customerAdvances[0].adjustedAmount,
    secondPass.customerAdvances[0].adjustedAmount,
    'StrictMode idempotency check: both passes must produce identical advance deduction!'
  );

  state = secondPass;
}

// TEST 1: Deduct ৳122 from Tanvir Ahmed (VIP)'s ৳1,100 advance
console.log('--- TEST 1: Auto-Adjust Tanvir Ahmed (VIP) Bill (৳122 from ৳1,100) ---');
const initAdv = getCustomerAvailableAdvance('Tanvir Ahmed (VIP)');
console.log(`Initial Available Advance: ৳${initAdv}`);
assert.strictEqual(initAdv, 1100);

simulateSettlePayment('Tanvir Ahmed (VIP)', 122, 122, 0);

const remAdv1 = getCustomerAvailableAdvance('Tanvir Ahmed (VIP)');
console.log(`Remaining Advance after ৳122 bill: ৳${remAdv1}`);
assert.strictEqual(remAdv1, 978, 'Remaining advance must be ৳978 (1100 - 122)');
console.log('✅ [PASS] Tanvir Ahmed advance successfully decreased by ৳122 to ৳978!\n');

// Also test flexible name matching (e.g. without (VIP))
const remAdvFuzzy = getCustomerAvailableAdvance('Tanvir Ahmed');
console.log(`Fuzzy check with 'Tanvir Ahmed': ৳${remAdvFuzzy}`);
assert.strictEqual(remAdvFuzzy, 978, 'Fuzzy matching must also return ৳978');
console.log('✅ [PASS] Flexible name matching verified!\n');

// TEST 2: Dynamic Customer Creation by Admin
console.log('--- TEST 2: Admin Dynamically Creates New Customer & Receives Advance ---');
const newCustomerName = 'Meghna Corporation';
console.log(`Creating customer: "${newCustomerName}" with ৳5,000 Advance Deposit...`);
saveCustomerAdvance({
  customer: newCustomerName,
  amount: 5000,
  method: 'BANK'
});

assert(state.customers.includes('Meghna Corporation'), 'Customer must be dynamically registered in state.customers');
const meghnaAdvInit = getCustomerAvailableAdvance('Meghna Corporation');
console.log(`Available Advance for Meghna Corporation: ৳${meghnaAdvInit}`);
assert.strictEqual(meghnaAdvInit, 5000, 'Must have ৳5,000 available advance');
console.log('✅ [PASS] Dynamic customer creation & advance registration successful!\n');

// TEST 3: Settle POS Bill 1 for Meghna Corporation (৳3,200)
console.log('--- TEST 3: Meghna Corporation POS Bill 1 (৳3,200 full advance) ---');
simulateSettlePayment('Meghna Corporation', 3200, 3200, 0);
const meghnaAdvRem1 = getCustomerAvailableAdvance('Meghna Corporation');
console.log(`Remaining Advance for Meghna Corporation: ৳${meghnaAdvRem1}`);
assert.strictEqual(meghnaAdvRem1, 1800, 'Remaining advance must be ৳1,800 (5000 - 3200)');
console.log('✅ [PASS] ৳3,200 deducted, ৳1,800 remaining!\n');

// TEST 4: Settle POS Bill 2 for Meghna Corporation (৳2,000 Split: ৳1,800 Advance + ৳200 Cash)
console.log('--- TEST 4: Meghna Corporation POS Bill 2 (৳2,000 Split: ৳1,800 Adv + ৳200 Cash) ---');
simulateSettlePayment('Meghna Corporation', 2000, 1800, 200);
const meghnaAdvRem2 = getCustomerAvailableAdvance('Meghna Corporation');
console.log(`Remaining Advance for Meghna Corporation: ৳${meghnaAdvRem2}`);
assert.strictEqual(meghnaAdvRem2, 0, 'Remaining advance must be ৳0');
console.log(`Cash Drawer after ৳200 cash: ৳${state.cashDrawer}`);
assert.strictEqual(state.cashDrawer, 10200, 'Cash drawer must only increase by ৳200');
console.log('✅ [PASS] Advance fully utilized (৳0 remaining), cash drawer accurately updated!\n');

console.log('======================================================================');
console.log('🎉 ALL DYNAMIC CUSTOMER & ADVANCE TESTS PASSED WITH 100% SUCCESS!');
console.log('======================================================================');
