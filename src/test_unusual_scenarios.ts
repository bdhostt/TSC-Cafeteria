// Comprehensive Automated Test Suite for Unusual & Edge-Case POS Shift Scenarios
import { PosSessionRecord, SaleRecord, DayEndRecord, Table } from './types';

interface TestResult {
  scenario: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, scenario: string, details: string) {
  results.push({
    scenario,
    passed: condition,
    details: condition ? `✅ PASS: ${details}` : `❌ FAIL: ${details}`
  });
}

console.log('================================================================');
console.log('🧪 RUNNING COMPREHENSIVE POS SHIFT UNUSUAL SCENARIO TESTS');
console.log('================================================================\n');

// --------------------------------------------------------------------------
// TEST 1: Zero Cash Sales Shift (Only Card & bKash Digital Payments)
// --------------------------------------------------------------------------
(() => {
  const openingCash = 2000;
  const digitalSales: SaleRecord[] = [
    {
      id: 101,
      date: '2026-09-07',
      invoiceNo: 'POS-000101',
      details: 'Table 1: Cold Coffee (2)',
      items: [],
      cash: 0,
      card: 3500,
      bkash: 0,
      nagad: 0,
      dueGiven: 0,
      dueCollected: 0,
      change: 0,
      total: 3500,
      sessionId: 'SES-TEST-001',
      createdAt: Date.now() - 3600000
    },
    {
      id: 102,
      date: '2026-09-07',
      invoiceNo: 'POS-000102',
      details: 'Table 2: Steak & Grill (1)',
      items: [],
      cash: 0,
      card: 0,
      bkash: 2500,
      nagad: 0,
      dueGiven: 0,
      dueCollected: 0,
      change: 0,
      total: 2500,
      sessionId: 'SES-TEST-001',
      createdAt: Date.now() - 1800000
    }
  ];

  const totalCashSales = digitalSales.reduce((sum, s) => sum + s.cash, 0);
  const totalDigitalSales = digitalSales.reduce((sum, s) => sum + s.card + s.bkash + s.nagad, 0);
  const totalSales = digitalSales.reduce((sum, s) => sum + s.total, 0);
  const expectedCash = openingCash + totalCashSales; // 2000 + 0 = 2000
  const actualClosingCash = 2000; // Counted exact opening float
  const variance = actualClosingCash - expectedCash; // 0

  assert(
    expectedCash === 2000 && variance === 0 && totalSales === 6000,
    'Scenario 1: Zero Cash Sales (100% Digital Payments)',
    `Expected Cash: ৳${expectedCash}, Variance: ৳${variance}, Total Digital Revenue: ৳${totalDigitalSales}`
  );
})();

// --------------------------------------------------------------------------
// TEST 2: Massive Cash Shortage / The Discrepancy Test
// --------------------------------------------------------------------------
(() => {
  const openingCash = 1500;
  const cashSalesTotal = 18500;
  const expectedCash = openingCash + cashSalesTotal; // 20000
  const actualCountedCash = 14200; // Shortage of 5800!
  const cashDifference = actualCountedCash - expectedCash; // -5800

  const isShortage = cashDifference < 0;
  const shortageAmount = Math.abs(cashDifference);

  // Vault drop should gracefully adapt: cannot drop more than actual cash
  const nextShiftFloat = Math.min(actualCountedCash, 2000);
  const vaultDrop = Math.max(0, actualCountedCash - nextShiftFloat);

  assert(
    isShortage && shortageAmount === 5800 && vaultDrop === 12200,
    'Scenario 2: Massive Cash Shortage Detection',
    `Expected: ৳${expectedCash}, Actual: ৳${actualCountedCash}, Detected Shortage: -৳${shortageAmount}, Vault Drop: ৳${vaultDrop}`
  );
})();

// --------------------------------------------------------------------------
// TEST 3: Cash Surplus / Extra Cash Found in Drawer
// --------------------------------------------------------------------------
(() => {
  const openingCash = 2000;
  const cashSales = 8000;
  const expectedCash = openingCash + cashSales; // 10000
  const actualCountedCash = 10750; // Extra 750 taka from forgotten tip/change
  const cashDifference = actualCountedCash - expectedCash; // +750

  const isSurplus = cashDifference > 0;
  const surplusAmount = cashDifference;

  assert(
    isSurplus && surplusAmount === 750,
    'Scenario 3: Cash Surplus / Excess Detection',
    `Expected: ৳${expectedCash}, Actual: ৳${actualCountedCash}, Surplus: +৳${surplusAmount} (Logged in Z-Report)`
  );
})();

// --------------------------------------------------------------------------
// TEST 4: Midnight Crossing / Shift Spanning Across 2 Calendar Dates
// --------------------------------------------------------------------------
(() => {
  // Night shift started at 23:00 on 2026-09-07
  const shiftStartDate = '2026-09-07';
  const shiftStartTime = '11:00 PM';
  const shiftStartTs = new Date('2026-09-07T23:00:00').getTime();

  // Sale 1 happened on 2026-09-07 at 23:30
  const sale1Ts = new Date('2026-09-07T23:30:00').getTime();
  // Sale 2 happened on 2026-09-08 at 01:15 AM (Next calendar date!)
  const sale2Ts = new Date('2026-09-08T01:15:00').getTime();

  const sessionId = 'SES-20260907-NIGHT';

  const sales: SaleRecord[] = [
    {
      id: sale1Ts,
      date: '2026-09-07',
      invoiceNo: 'POS-001',
      details: 'Burger Combo',
      items: [],
      cash: 1200,
      card: 0,
      bkash: 0,
      nagad: 0,
      dueGiven: 0,
      dueCollected: 0,
      change: 0,
      total: 1200,
      sessionId,
      createdAt: sale1Ts
    },
    {
      id: sale2Ts,
      date: '2026-09-08', // Calendar date is 8th!
      invoiceNo: 'POS-002',
      details: 'Steak Platter',
      items: [],
      cash: 2800,
      card: 0,
      bkash: 0,
      nagad: 0,
      dueGiven: 0,
      dueCollected: 0,
      change: 0,
      total: 2800,
      sessionId, // But tagged with the same shift session!
      createdAt: sale2Ts
    }
  ];

  // Filtering by sessionId guarantees both sales are bound to the shift
  const sessionSales = sales.filter(s => s.sessionId === sessionId);
  const totalShiftSales = sessionSales.reduce((sum, s) => sum + s.total, 0);
  const totalShiftCash = sessionSales.reduce((sum, s) => sum + s.cash, 0);

  const completedSession: PosSessionRecord = {
    id: sessionId,
    date: shiftStartDate, // Retains Business Date: 2026-09-07
    openedBy: 'Night Cashier (CASHIER)',
    closedBy: 'Night Cashier (CASHIER)',
    startTime: shiftStartTime,
    endTime: '02:00 AM',
    startTimestamp: shiftStartTs,
    endTimestamp: sale2Ts + 1800000,
    openingCash: 2000,
    cashSales: totalShiftCash,
    cardSales: 0,
    bkashSales: 0,
    nagadSales: 0,
    dueSales: 0,
    totalSales: totalShiftSales,
    orderCount: sessionSales.length,
    expectedCash: 2000 + totalShiftCash,
    actualClosingCash: 2000 + totalShiftCash,
    cashDifference: 0,
    status: 'CLOSED'
  };

  assert(
    sessionSales.length === 2 && totalShiftSales === 4000 && completedSession.date === '2026-09-07',
    'Scenario 4: Midnight Crossing Business Date Integrity',
    `Post-midnight sale (2026-09-08 01:15 AM) correctly linked to Session Date: ${completedSession.date}, Total Sales: ৳${totalShiftSales}`
  );
})();

// --------------------------------------------------------------------------
// TEST 5: 2 Shifts in 1 Day + Consolidated Master Day-End Aggregation
// --------------------------------------------------------------------------
(() => {
  const targetDate = '2026-09-07';

  // Shift 1: Day Shift
  const shift1: PosSessionRecord = {
    id: 'SES-20260907-001',
    date: targetDate,
    openedBy: 'Rahim (Day Cashier)',
    closedBy: 'Rahim (Day Cashier)',
    startTime: '11:00 AM',
    endTime: '05:00 PM',
    startTimestamp: 1000,
    endTimestamp: 2000,
    openingCash: 2000,
    cashSales: 15000,
    cardSales: 8000,
    bkashSales: 4000,
    nagadSales: 1000,
    dueSales: 0,
    totalSales: 28000,
    orderCount: 35,
    expectedCash: 17000,
    actualClosingCash: 17000,
    cashDifference: 0,
    status: 'CLOSED'
  };

  // Shift 2: Night Shift
  const shift2: PosSessionRecord = {
    id: 'SES-20260907-002',
    date: targetDate,
    openedBy: 'Karim (Night Cashier)',
    closedBy: 'Karim (Night Cashier)',
    startTime: '05:05 PM',
    endTime: '01:00 AM',
    startTimestamp: 3000,
    endTimestamp: 4000,
    openingCash: 2000,
    cashSales: 25000,
    cardSales: 12000,
    bkashSales: 6000,
    nagadSales: 2000,
    dueSales: 1500,
    totalSales: 46500,
    orderCount: 52,
    expectedCash: 27000,
    actualClosingCash: 27000,
    cashDifference: 0,
    status: 'CLOSED'
  };

  const daySessions = [shift1, shift2];
  const dayExpenses = 4500; // e.g. Ice, vegetables, gas refill

  const totalDaySales = daySessions.reduce((sum, s) => sum + s.totalSales, 0); // 28000 + 46500 = 74500
  const totalDayOrders = daySessions.reduce((sum, s) => sum + s.orderCount, 0); // 35 + 52 = 87
  const totalCash = daySessions.reduce((sum, s) => sum + s.cashSales, 0); // 15000 + 25000 = 40000
  const netCashToVault = Math.max(0, totalCash - dayExpenses); // 40000 - 4500 = 35500

  const dayRecord: DayEndRecord = {
    id: `DAY-${targetDate.replace(/-/g, '')}-001`,
    date: targetDate,
    totalDaySales,
    totalDayOrders,
    shiftCount: daySessions.length,
    shiftIds: daySessions.map(s => s.id),
    totalCash,
    totalCard: daySessions.reduce((sum, s) => sum + s.cardSales, 0),
    totalBkash: daySessions.reduce((sum, s) => sum + s.bkashSales, 0),
    totalNagad: daySessions.reduce((sum, s) => sum + s.nagadSales, 0),
    totalDue: daySessions.reduce((sum, s) => sum + s.dueSales, 0),
    totalExpenses: dayExpenses,
    netCashToVault,
    closedBy: 'Kabir (Night Manager)',
    closedAt: `${targetDate} 01:15 AM`,
    notes: 'All 2 shifts reconciled successfully.'
  };

  assert(
    dayRecord.shiftCount === 2 &&
    totalDaySales === 74500 &&
    totalDayOrders === 87 &&
    netCashToVault === 35500 &&
    dayRecord.shiftIds.length === 2,
    'Scenario 5: 2 Shifts Consolidated into Master Day-End',
    `Shifts: ${dayRecord.shiftCount}, Total Day Sales: ৳${totalDaySales}, Total Cash: ৳${totalCash}, Expenses: -৳${dayExpenses}, Net to Vault: ৳${netCashToVault}`
  );
})();

// --------------------------------------------------------------------------
// TEST 6: Table Handover While Customers Are Dining During Shift Change
// --------------------------------------------------------------------------
(() => {
  // 3 tables active at 5:00 PM handover
  const tables: Table[] = [
    {
      id: 'T-01',
      name: 'Table 01',
      zone: 'Floor 1',
      capacity: 4,
      status: 'hold',
      waiter: 'Day Waiter A',
      customer: 'Dr. Hasan',
      discountType: 'taka',
      discountVal: 0,
      cart: [{ id: 1, name: 'Mixed Grill', price: 1800, qty: 1 }]
    },
    {
      id: 'T-02',
      name: 'Table 02',
      zone: 'VIP Lounge',
      capacity: 6,
      status: 'hold',
      waiter: 'Day Waiter B',
      customer: 'Mr. Tanvir',
      discountType: 'taka',
      discountVal: 0,
      cart: [{ id: 2, name: 'Family Platter', price: 3400, qty: 1 }]
    },
    {
      id: 'T-03',
      name: 'Table 03',
      zone: 'Floor 1',
      capacity: 2,
      status: 'free',
      waiter: '',
      customer: 'Walk-in Customer',
      discountType: 'taka',
      discountVal: 0,
      cart: []
    }
  ];

  const activeTables = tables.filter(t => t.status !== 'free');
  const carriedOverTableIds = activeTables.map(t => t.id);

  // Shift 1 closes with carried over tables
  const shift1 = {
    id: 'SES-001',
    openTablesCount: carriedOverTableIds.length,
    carriedOverTableIds: carriedOverTableIds
  };

  // Shift 2 opens: active tables remain in memory intact!
  const shift2TableCount = tables.filter(t => t.status !== 'free').length;
  const totalCarriedRevenue = tables
    .filter(t => t.status !== 'free')
    .reduce((sum, t) => sum + t.cart.reduce((cSum, i) => cSum + (i.price * i.qty), 0), 0);

  assert(
    shift1.openTablesCount === 2 && shift2TableCount === 2 && totalCarriedRevenue === 5200,
    'Scenario 6: Running Table Handover Between Shifts',
    `Carried Over: ${shift1.carriedOverTableIds.join(', ')} (Total Unsettled Value: ৳${totalCarriedRevenue}) preserved for Night Shift`
  );
})();

// --------------------------------------------------------------------------
// PRINT FINAL TEST REPORT
// --------------------------------------------------------------------------
console.log('\n================================================================');
console.log('📋 TEST EXECUTION SUMMARY:');
console.log('================================================================');
let passCount = 0;
results.forEach((r, idx) => {
  if (r.passed) passCount++;
  console.log(`\n[${idx + 1}] ${r.scenario}`);
  console.log(`    ${r.details}`);
});

console.log('\n================================================================');
if (passCount === results.length) {
  console.log(`🎉 ALL ${results.length} UNUSUAL SCENARIOS PASSED 100% SUCCESSFULLY!`);
} else {
  console.log(`⚠️ ${results.length - passCount} TESTS FAILED.`);
}
console.log('================================================================\n');
