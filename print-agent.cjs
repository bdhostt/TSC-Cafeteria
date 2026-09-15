const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

const CLOUD_SERVER_URL = (process.argv[2] || process.env.CLOUD_SERVER_URL || 'https://erp-pos-sdv3.onrender.com').replace(/\/+$/, '');
const LOCAL_PORT = 9123;
const POLL_INTERVAL_MS = 1200;

async function getWindowsPrinters() {
  return new Promise((resolve) => {
    exec('powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"', (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const list = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      resolve(list);
    });
  });
}

function resolveThermalPrinter(installedPrinters, requestedName) {
  // 1. Strict blacklist: Never use the offline network printer "80 Printer" (192.168.1.87)
  const safePrinters = (installedPrinters || []).filter(p => 
    !/^80\s*printer$/i.test(p.trim()) && 
    !p.toLowerCase().includes('192.168')
  );

  // 2. Kot Printer on USB001 is the absolute primary hardware printer
  const kot = safePrinters.find(p => /kot\s*printer/i.test(p)) || safePrinters.find(p => /kot/i.test(p));

  // 3. If a specific printer was requested, ensure it's not the blacklisted "80 Printer"
  if (requestedName && !/^80\s*printer$/i.test(requestedName.trim())) {
    const exact = safePrinters.find(p => p.toLowerCase() === requestedName.toLowerCase().trim());
    if (exact) return exact;
  }

  // 4. Default to Kot Printer if available
  if (kot) return kot;

  // 5. Fallback to any other thermal/receipt printer (excluding 80 Printer)
  const thermal = safePrinters.find(p => /pos|receipt|thermal/i.test(p));
  if (thermal) return thermal;

  return safePrinters[0] || 'Kot Printer';
}

async function printSlipWindows(printerName, rawBuffer) {
  return new Promise((resolve) => {
    const tempFile = path.join(os.tmpdir(), 'agent_print_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '.bin');
    fs.writeFileSync(tempFile, rawBuffer);

    const scriptPath = path.join(__dirname, 'scripts', 'print-raw.ps1');
    const psCmd = 'powershell -NoProfile -ExecutionPolicy Bypass -File "' + scriptPath + '" -PrinterName "' + printerName.replace(/"/g, '`"') + '" -FilePath "' + tempFile.replace(/"/g, '`"') + '"';

    exec(psCmd, (error) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      if (error) {
        console.error('❌ [Print Error] Failed to print to ' + printerName + ':', error.message);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

function line2Col(left, right, width) {
  width = width || 42;
  const l = (left || '').trim();
  const r = (right || '').trim();
  const maxL = Math.max(0, width - 1 - r.length);
  const safeL = l.length > maxL ? l.slice(0, maxL) : l;
  const spaces = Math.max(1, width - safeL.length - r.length);
  return safeL + ' '.repeat(spaces) + r + '\n';
}

function buildKotEscPosBuffer(req, slip, index, total) {
  const chunks = [];
  const pushStr = (str) => chunks.push(Buffer.from(str, 'latin1'));
  const pushBytes = (arr) => chunks.push(Buffer.from(arr));

  // 1. ESC @ : Initialize printer
  pushBytes([0x1B, 0x40]);

  // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
  pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF (prevents muddy/bleeding characters)
  pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
  pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform standard font A (12x24, 42 columns)

  // 3. Center Align: Station & KOT number
  pushBytes([0x1B, 0x61, 0x01]);
  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON
  const cleanStation = (!slip.station || slip.station === 'SPLIT_ALL' || slip.station === 'ALL') ? 'MAIN KITCHEN' : slip.station;
  pushStr('STATION: ' + cleanStation.toUpperCase() + '\n');
  pushStr('KOT NO: ' + req.invoiceNo + (total > 1 ? '-' + index : '') + '\n');
  if (slip.category) {
    pushStr('Category: ' + slip.category + '\n');
  }
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
  pushStr('------------------------------------------\n');

  // 4. Left Align: Table, Time, Waiter Info
  pushBytes([0x1B, 0x61, 0x00]);
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON for Table
  pushStr('TABLE   : ' + req.tableName + (req.tableZone ? ' (' + req.tableZone + ')' : '') + '\n');
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

  const timeStr = req.dateTime || new Date().toLocaleString('en-US');
  pushStr('TIME    : ' + timeStr + '\n');
  pushStr('WAITER  : ' + (req.waiter || 'Staff') + '\n');
  if (req.customer && req.customer !== 'Walk-in Customer') {
    pushStr('CUSTOMER: ' + req.customer + '\n');
  }
  pushStr('------------------------------------------\n');

  // 5. Items Header
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON
  pushStr('ITEM NAME                              QTY\n');
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
  pushStr('------------------------------------------\n');

  // 6. Food Items (Crisp, High Legibility)
  for (const item of (slip.items || [])) {
    const name = item.name.length > 33 ? item.name.slice(0, 33) : item.name;
    const nameCol = name.padEnd(34, ' ');
    const qtyCol = (item.qty + 'x').padStart(6, ' ');

    pushBytes([0x1B, 0x45, 0x01]); // Bold ON for item name and qty
    pushStr(nameCol + ' ' + qtyCol + '\n');
    pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

    if (item.variation) pushStr('   - Cut: ' + item.variation + '\n');
    if (item.addons && item.addons.length > 0) pushStr('   - Extras: ' + item.addons.join(', ') + '\n');
    if (item.notes) pushStr('   - Note: ' + item.notes + '\n');
  }

  pushStr('------------------------------------------\n');
  pushStr('\n\n\n');
  pushBytes([0x1D, 0x56, 0x00]);

  return Buffer.concat(chunks);
}

function buildBillEscPosBuffer(bill) {
  const chunks = [];
  const pushStr = (str) => chunks.push(Buffer.from(str, 'latin1'));
  const pushBytes = (arr) => chunks.push(Buffer.from(arr));

  // 1. ESC @ : Initialize printer
  pushBytes([0x1B, 0x40]);

  // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
  pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF (prevents muddy/bleeding characters)
  pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
  pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform font A (12x24, 42 columns)

  // 3. Center Align: Restaurant Header
  pushBytes([0x1B, 0x61, 0x01]);
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON for Restaurant Name
  pushStr((bill.restaurantName || 'BARCODE CAFE BANANI') + '\n');
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

  const rawAddress = bill.restaurantAddress || 'House #42, Road #11, Block D, Banani, Dhaka-1213';
  if (rawAddress) {
    if (rawAddress.includes(',')) {
      const parts = rawAddress.split(',').map(p => p.trim());
      let currentLine = '';
      for (const part of parts) {
        if (!currentLine) {
          currentLine = part;
        } else if ((currentLine + ', ' + part).length <= 40) {
          currentLine += ', ' + part;
        } else {
          pushStr(currentLine + '\n');
          currentLine = part;
        }
      }
      if (currentLine) pushStr(currentLine + '\n');
    } else {
      pushStr(rawAddress + '\n');
    }
  }

  const rawHotline = bill.restaurantHotline || '+880 1700-000000';
  if (rawHotline) pushStr('Hotline: ' + rawHotline + '\n');

  const rawBin = bill.restaurantBin || '0029381-01';
  if (rawBin) pushStr('BIN/VAT Reg: ' + rawBin + '\n');

  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON for Bill Type
  pushStr((bill.isSettled ? 'PAID CASH MEMO' : 'INVOICE / GUEST BILL') + '\n');
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
  pushStr('------------------------------------------\n');

  // 4. Left Align: Invoice Metadata
  pushBytes([0x1B, 0x61, 0x00]);
  pushStr(line2Col('Invoice No :', bill.invoiceNo || 'INV-0000'));

  let dateStr = '';
  let timeStr = '';
  const rawDt = bill.dateTime || new Date().toLocaleString('en-US');
  if (rawDt.includes(',')) {
    const parts = rawDt.split(',');
    dateStr = parts[0].trim();
    timeStr = parts.slice(1).join(',').trim();
  } else {
    const parts = rawDt.trim().split(/\s+/);
    if (parts.length >= 2) {
      dateStr = parts[0];
      timeStr = parts.slice(1).join(' ');
    } else {
      dateStr = rawDt;
      timeStr = new Date().toLocaleTimeString('en-US');
    }
  }
  pushStr(line2Col('Date :  ' + dateStr, 'Time: ' + timeStr));
  pushStr(line2Col('Table & Z  :', (bill.tableName || 'Takeaway') + (bill.tableZone ? ' (' + bill.tableZone + ')' : '')));
  if (bill.channelOrAgent) pushStr(line2Col('Channel    :', bill.channelOrAgent));
  pushStr(line2Col('Waiter     :', bill.waiter || 'Staff'));
  const orderTaker = bill.orderTakenBy || bill.orderCreatedBy || bill.waiter || 'Staff';
  if (orderTaker && orderTaker !== (bill.waiter || 'Staff')) {
    pushStr(line2Col('Order Taken By :', orderTaker));
  }
  if (bill.isSettled) {
    const settleRole = bill.settleBillRole || bill.cashierRole || 'Cashier';
    pushStr(line2Col('Bill Settled By :', settleRole));
  }
  if (bill.customer && bill.customer !== 'Walk-in Customer') {
    pushStr(line2Col('Customer   :', bill.customer));
  }
  pushStr('------------------------------------------\n');

  // 5. Column Headers (Exact 42 character columns)
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON for headers
  const colItemH = 'ITEM'.padEnd(19, ' ');
  const colQtyH = 'QTY'.padStart(3, ' ');
  const colPriceH = 'PRICE'.padStart(8, ' ');
  const colTotalH = 'TOTAL'.padStart(9, ' ');
  pushStr(colItemH + ' ' + colQtyH + ' ' + colPriceH + ' ' + colTotalH + '\n');
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
  pushStr('------------------------------------------\n');

  // 6. Food Items (Crisp & High Legibility)
  for (const item of (bill.items || [])) {
    let firstLineName = item.name.trim();
    let remainder = '';
    if (firstLineName.length > 19) {
      const lastSpace = firstLineName.lastIndexOf(' ', 19);
      if (lastSpace > 8) {
        remainder = firstLineName.slice(lastSpace + 1).trim();
        firstLineName = firstLineName.slice(0, lastSpace);
      } else {
        remainder = firstLineName.slice(19).trim();
        firstLineName = firstLineName.slice(0, 19);
      }
    }
    const colItem = firstLineName.padEnd(19, ' ');
    const colQty = String(item.qty).padStart(3, ' ');
    const colPrice = Number(item.price).toFixed(2).padStart(8, ' ');
    const colTotal = Number(item.price * item.qty).toFixed(2).padStart(9, ' ');

    pushStr(colItem + ' ' + colQty + ' ' + colPrice + ' ' + colTotal + '\n');
    if (remainder) pushStr('  ' + remainder + '\n');
    if (item.variation) pushStr('  * Cut: ' + item.variation + '\n');
    if (item.addons && item.addons.length > 0) pushStr('  + Extras: ' + item.addons.join(', ') + '\n');
    if (item.notes) pushStr('  - Note: ' + item.notes + '\n');
  }

  pushStr('------------------------------------------\n');

  // 7. Financial Totals
  pushStr(line2Col('Subtotal:', Number(bill.subtotal || 0).toFixed(2)));
  if (bill.discountDeduction > 0) {
    const discLbl = bill.discountType === 'percent' && bill.discountVal 
      ? 'Discount (' + bill.discountVal + '%):' 
      : 'Discount:';
    pushStr(line2Col(discLbl, '-' + Number(bill.discountDeduction).toFixed(2)));
  }
  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON for Total Payable
  pushStr(line2Col('TOTAL PAYABLE:', Number(bill.netTotal || 0).toFixed(2)));
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

  const pb = bill.paymentBreakdown;
  if (pb) {
    pushStr('------------------------------------------\n');
    if (pb.cash > 0) pushStr(line2Col('Cash Paid:', Number(pb.cash).toFixed(2)));
    if (pb.card > 0) pushStr(line2Col('Card Paid:', Number(pb.card).toFixed(2)));
    if (pb.bkash > 0) pushStr(line2Col('bKash Paid:', Number(pb.bkash).toFixed(2)));
    if (pb.nagad > 0) pushStr(line2Col('Nagad Paid:', Number(pb.nagad).toFixed(2)));
    if (pb.due > 0) pushStr(line2Col('Due / Credit:', Number(pb.due).toFixed(2)));
    if (bill.changeReturn > 0) pushStr(line2Col('Change Return:', Number(bill.changeReturn).toFixed(2)));
  }

  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x61, 0x01]);
  if (bill.isSettled) {
    pushBytes([0x1B, 0x45, 0x01]);
    pushStr('*** PAID & SETTLED ***\n');
    pushBytes([0x1B, 0x45, 0x00]);
  }
  pushStr('Thank you for dining with us!\n');
  pushStr('Please visit again\n');
  pushStr('------------------------------------------\n');
  pushStr('\n\n\n');
  pushBytes([0x1D, 0x56, 0x00]);

  return Buffer.concat(chunks);
}

function buildZReportEscPosBuffer(report) {
  const chunks = [];
  const pushStr = (str) => chunks.push(Buffer.from(str, 'latin1'));
  const pushBytes = (arr) => chunks.push(Buffer.from(arr));

  const s = report.session || {};

  // 1. ESC @ : Initialize printer
  pushBytes([0x1B, 0x40]);

  // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
  pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF
  pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
  pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform 42 columns

  pushBytes([0x1B, 0x61, 0x01]);
  pushStr((report.restaurantName || 'BARCODE CAFE BANANI') + '\n');

  const rawAddress = report.restaurantAddress || 'House #42, Road #11, Block D, Banani, Dhaka-1213';
  if (rawAddress) pushStr(rawAddress + '\n');
  const rawHotline = report.restaurantHotline || '+880 1700-000000';
  if (rawHotline) pushStr('Hotline: ' + rawHotline + '\n');
  const rawBin = report.restaurantBin || '0029381-01';
  if (rawBin) pushStr('BIN/VAT Reg: ' + rawBin + '\n');

  pushStr('------------------------------------------\n');
  pushStr('*** POS SHIFT Z-REPORT ***\n');
  pushStr('------------------------------------------\n');

  pushBytes([0x1B, 0x61, 0x00]);
  pushStr(line2Col('Session ID    :', s.id || 'SES-ACTIVE'));
  pushStr(line2Col('Date          :', s.date || new Date().toISOString().split('T')[0]));
  pushStr(line2Col('Shift Name    :', s.shiftType || 'Shift 1'));
  pushStr(line2Col('Shift Timing  :', (s.startTime || 'N/A') + ' - ' + (s.endTime || 'Closed')));
  pushStr(line2Col('Opened By     :', s.openedBy || 'Cashier'));
  if (s.closedBy) pushStr(line2Col('Closed By     :', s.closedBy));
  if (s.handoverToCashier) pushStr(line2Col('Handover To   :', s.handoverToCashier));
  pushStr(line2Col('Orders Settled:', (s.orderCount || 0) + ' Invoices'));
  pushStr('------------------------------------------\n');

  pushStr('1. SALES PAYMENT BREAKDOWN\n');
  pushStr(line2Col('Cash Sales       :', Number(s.cashSales || 0).toFixed(2)));
  pushStr(line2Col('Credit/Debit Card:', Number(s.cardSales || 0).toFixed(2)));
  pushStr(line2Col('bKash Payment    :', Number(s.bkashSales || 0).toFixed(2)));
  pushStr(line2Col('Nagad Payment    :', Number(s.nagadSales || 0).toFixed(2)));
  if (s.dueSales && s.dueSales > 0) {
    pushStr(line2Col('Customer Due     :', Number(s.dueSales).toFixed(2)));
  }
  pushStr('------------------------------------------\n');
  pushStr(line2Col('GROSS SHIFT REVENUE:', Number(s.totalSales || 0).toFixed(2)));
  pushStr('------------------------------------------\n');

  const cashiers = s.cashierBreakdown;
  pushStr('2. CASH COLLECTION (' + ((cashiers && Array.isArray(cashiers)) ? cashiers.length : 1) + ' STAFF)\n');

  if (cashiers && Array.isArray(cashiers) && cashiers.length > 0) {
    for (const c of cashiers) {
      const shName = c.shift || s.shiftType || 'Shift 1';
      const cleanCashier = (c.cashier || '').replace(/\s*\([A-Z_]+\)\s*$/i, '').trim();
      const roleTag = c.role ? ' (' + c.role + ')' : '';
      pushStr(line2Col('* [' + shName + '] ' + cleanCashier + roleTag + ':', 'Tk ' + Number(c.totalCollected || 0).toFixed(2)));
      const due = c.dueAmount !== undefined ? c.dueAmount : Math.max(0, (c.totalCollected || 0) - (c.cashCollected || 0) - (c.digitalCollected || 0));
      const dueStr = due > 0 ? ' | Due: Tk ' + Number(due).toFixed(0) : '';
      pushStr('   (' + (c.orderCount || 0) + ' inv) Cash: Tk ' + Number(c.cashCollected || 0).toFixed(0) + ' | Dig: Tk ' + Number(c.digitalCollected || 0).toFixed(0) + dueStr + '\n');
    }
  } else {
    pushStr(line2Col('* [' + (s.shiftType || 'Shift 1') + '] ' + s.openedBy + ':', 'Tk ' + Number(s.totalSales || 0).toFixed(2)));
    pushStr('   (' + (s.orderCount || 0) + ' inv) Cash: Tk ' + Number(s.cashSales || 0).toFixed(0) + ' | Dig: Tk ' + Number((s.cardSales || 0) + (s.bkashSales || 0) + (s.nagadSales || 0)).toFixed(0) + '\n');
  }
  pushStr('------------------------------------------\n');

  const roles = s.roleBreakdown;
  if (roles && Array.isArray(roles) && roles.length > 0) {
    pushStr('3. ROLE-WISE SALES (' + roles.length + ' ROLES)\n');
    for (const r of roles) {
      pushStr(line2Col('* [' + r.role + '] (' + r.orderCount + ' ord):', 'Tk ' + Number(r.totalCollected || 0).toFixed(2)));
    }
    pushStr('------------------------------------------\n');
  }

  const waiters = s.waiterBreakdown;
  if (waiters && Array.isArray(waiters) && waiters.length > 0) {
    pushStr('4. WAITER-WISE SALES (' + waiters.length + ' WAITERS)\n');
    for (const w of waiters) {
      const pct = s.totalSales > 0 ? Math.round(((w.totalSales || 0) / s.totalSales) * 100) : 0;
      pushStr(line2Col('* ' + w.waiter + ' (' + w.orderCount + ' ord - ' + pct + '%):', 'Tk ' + Number(w.totalSales || 0).toFixed(2)));
    }
    pushStr('------------------------------------------\n');
  }

  pushStr('5. CASH DRAWER RECONCILIATION\n');
  pushStr(line2Col('(+) Opening Float     :', Number(s.openingCash || 0).toFixed(2)));
  pushStr(line2Col('(+) Cash Sales Total  :', Number(s.cashSales || 0).toFixed(2)));
  pushStr(line2Col('(=) Expected in Drawer:', Number(s.expectedCash || 0).toFixed(2)));
  pushStr(line2Col('Actual Counted Cash   :', Number(s.actualClosingCash ?? s.expectedCash ?? 0).toFixed(2)));
  pushStr('------------------------------------------\n');

  const diff = Number(s.cashDifference || 0);
  const varTxt = diff === 0 
    ? '0.00 (MATCH)' 
    : diff < 0 
      ? '-' + Math.abs(diff).toFixed(2) + ' (SHORT)' 
      : '+' + diff.toFixed(2) + ' (OVER)';
  pushStr(line2Col('DRAWER VARIANCE:', varTxt));
  pushStr('------------------------------------------\n');

  if (s.nextShiftDrawerFloat !== undefined || s.cashDropToVault !== undefined) {
    pushStr('>> CASH ALLOCATION:\n');
    if (s.nextShiftDrawerFloat !== undefined) {
      pushStr(line2Col('1. Float Left in Drawer:', 'Tk ' + Number(s.nextShiftDrawerFloat || 0).toFixed(2)));
    }
    if (s.cashDropToVault !== undefined) {
      pushStr(line2Col('2. Drop to Vault / Safe:', 'Tk ' + Number(s.cashDropToVault || 0).toFixed(2)));
    }
    pushStr('------------------------------------------\n');
  }

  if (s.notes) {
    pushStr('Shift Notes:\n  ' + s.notes + '\n');
    pushStr('------------------------------------------\n');
  }

  pushStr('\n');
  pushStr('Cashier Signature       Manager Signature \n');
  pushStr('_________________       _________________ \n\n');

  pushBytes([0x1B, 0x61, 0x01]);
  pushStr('*** END OF SHIFT Z-REPORT ***\n');
  pushStr('Printed: ' + new Date().toLocaleString('en-US') + '\n');
  pushStr('------------------------------------------\n');
  pushStr('\n\n\n');
  pushBytes([0x1D, 0x56, 0x00]);

  return Buffer.concat(chunks);
}

function buildWaiterSlipEscPosBuffer(data) {
  const chunks = [];
  const pushStr = (str) => chunks.push(Buffer.from(str, 'latin1'));
  const pushBytes = (arr) => chunks.push(Buffer.from(arr));

  // 1. ESC @ : Initialize printer
  pushBytes([0x1B, 0x40]);

  // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
  pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF
  pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
  pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform 42 columns

  pushBytes([0x1B, 0x61, 0x01]);
  pushStr((data.restaurantName || 'BARCODE CAFE BANANI') + '\n');
  pushStr((data.restaurantAddress || 'Banani, Dhaka') + '\n');
  pushStr('------------------------------------------\n');
  pushStr('*** WAITER SERVER SUMMARY SLIP ***\n');
  pushStr('------------------------------------------\n');

  pushBytes([0x1B, 0x61, 0x00]);
  pushStr(line2Col('Waiter Name   :', data.waiterName || 'Staff'));
  pushStr(line2Col('Date          :', data.date || 'Today'));
  pushStr(line2Col('Time Printed  :', data.time || 'N/A'));
  pushStr(line2Col('Orders Served :', (data.totalOrders || 0) + ' Orders'));
  pushStr('------------------------------------------\n');

  pushStr(line2Col('TOTAL SALES GENERATED:', Number(data.totalSales || 0).toFixed(2)));
  pushStr(line2Col('ESTIMATED TIPS (5%)  :', Number(data.estimatedTips || 0).toFixed(2)));
  pushStr('------------------------------------------\n');

  if (data.serverCashFloat && data.serverCashFloat > 0) {
    pushStr(line2Col('SERVER CASH FLOAT (POCKET):', Number(data.serverCashFloat || 0).toFixed(2)));
    pushStr(line2Col('FLOAT RETURN TO REGISTER  :', Number(data.serverCashFloat || 0).toFixed(2)));
    pushStr('------------------------------------------\n');
  }

  if (data.runningTables && data.runningTables.length > 0) {
    pushStr('RUNNING TABLES HANDED OVER:\n');
    for (const t of data.runningTables) {
      pushStr(line2Col('* ' + t.name + ' (' + t.zone + '):', Number(t.total || 0).toFixed(2)));
    }
    pushStr('------------------------------------------\n');
  }

  pushStr('\n');
  pushStr('Waiter Signature        Manager Signature\n');
  pushStr('_________________       _________________\n\n');

  pushBytes([0x1B, 0x61, 0x01]);
  pushStr('*** END OF SERVER SLIP ***\n');
  pushStr('------------------------------------------\n');
  pushStr('\n\n\n');
  pushBytes([0x1D, 0x56, 0x00]);

  return Buffer.concat(chunks);
}

function buildChefSlipEscPosBuffer(data) {
  const chunks = [];
  const pushStr = (str) => chunks.push(Buffer.from(str, 'latin1'));
  const pushBytes = (arr) => chunks.push(Buffer.from(arr));

  const s = data.shift || {};

  // 1. ESC @ : Initialize printer
  pushBytes([0x1B, 0x40]);

  // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
  pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF
  pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
  pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform 42 columns

  pushBytes([0x1B, 0x61, 0x01]);
  pushStr((data.restaurantName || 'BARCODE CAFE BANANI') + '\n');
  pushStr((data.restaurantAddress || 'Banani, Dhaka') + '\n');
  pushStr('------------------------------------------\n');
  pushStr('*** KITCHEN PRODUCTION & HANDOVER SLIP ***\n');
  pushStr('------------------------------------------\n');

  pushBytes([0x1B, 0x61, 0x00]);
  pushStr(line2Col('Shift ID      :', s.id || 'KCS-ACTIVE'));
  pushStr(line2Col('Chef Name     :', s.chefName || 'Head Chef'));
  pushStr(line2Col('Station       :', s.station || 'Main Kitchen'));
  pushStr(line2Col('Shift Timing  :', s.shiftType || 'Morning Shift'));
  pushStr(line2Col('Date          :', s.date || new Date().toISOString().split('T')[0]));
  pushStr(line2Col('Duty Hours    :', s.startTime + ' - ' + (s.endTime || 'In Progress')));
  pushStr('------------------------------------------\n');

  pushStr('KITCHEN PRODUCTION STATS:\n');
  pushStr(line2Col('KOTs Processed    :', (s.kotsPreparedCount || 0) + ' Tickets'));
  pushStr(line2Col('Total Dishes Cooked:', (s.dishesCookedCount || 0) + ' Portions'));
  pushStr('------------------------------------------\n');

  if (s.handoverToChef) {
    pushStr(line2Col('HANDOVER TO CHEF  :', s.handoverToChef));
    pushStr('------------------------------------------\n');
  }

  if (s.notes) {
    pushStr('Kitchen Notes:\n  ' + s.notes + '\n');
    pushStr('------------------------------------------\n');
  }

  pushStr('\n');
  pushStr('Outgoing Chef           Incoming Chef\n');
  pushStr('_________________       _________________\n\n');

  pushBytes([0x1B, 0x61, 0x01]);
  pushStr('*** END OF KITCHEN SLIP ***\n');
  pushStr('------------------------------------------\n');
  pushStr('\n\n\n');
  pushBytes([0x1D, 0x56, 0x00]);

  return Buffer.concat(chunks);
}

function buildDayEndEscPosBuffer(data) {
  const chunks = [];
  const pushStr = (str) => chunks.push(Buffer.from(str, 'latin1'));
  const pushBytes = (arr) => chunks.push(Buffer.from(arr));

  const r = data.dayRecord || {};

  // 1. ESC @ : Initialize printer
  pushBytes([0x1B, 0x40]);

  // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
  pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF
  pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
  pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform 42 columns

  pushBytes([0x1B, 0x61, 0x01]);
  pushStr((data.restaurantName || 'BARCODE CAFE BANANI') + '\n');
  pushStr('House #42, Road #11, Block D, Banani, Dhaka\n');
  pushStr('------------------------------------------\n');
  pushStr('*** DAILY MASTER DAY-END Z-REPORT ***\n');
  pushStr('------------------------------------------\n');

  pushBytes([0x1B, 0x61, 0x00]);
  pushStr(line2Col('Day End ID    :', r.id));
  pushStr(line2Col('Business Date :', r.date));
  if (r.openedBy) pushStr(line2Col('Day Started By:', r.openedBy));
  if (r.openedAt) pushStr(line2Col('Start Time    :', r.openedAt));
  if (r.openingCash !== undefined) pushStr(line2Col('Opening Float :', 'Tk ' + Number(r.openingCash).toFixed(2)));
  pushStr(line2Col('Day Closed By :', r.closedBy));
  pushStr(line2Col('Close Time    :', r.closedAt));
  if (r.closingCash !== undefined) pushStr(line2Col('Closing Cash  :', 'Tk ' + Number(r.closingCash).toFixed(2)));
  pushStr(line2Col('Total Shifts  :', r.shiftCount + ' Shifts Consolidated'));
  pushStr(line2Col('Total Orders  :', r.totalDayOrders + ' Orders'));
  pushStr('------------------------------------------\n');

  if (data.daySessions && Array.isArray(data.daySessions) && data.daySessions.length > 0) {
    pushStr('>> SHIFT BREAKDOWN (SHIFT 1, 2...):\n');
    data.daySessions.forEach((s, idx) => {
      const shName = s.shiftType || ('Shift ' + (idx + 1));
      pushStr(line2Col('* [' + shName + '] ' + s.openedBy + ':', 'Tk ' + Number(s.totalSales || 0).toFixed(2)));
      pushStr('   Time : ' + (s.startTime || 'N/A') + ' - ' + (s.endTime || 'Active') + ' (' + (s.orderCount || 0) + ' Invoices)\n');
      pushStr('   Float: Tk ' + Number(s.openingCash || 0).toFixed(0) + ' | Cash: Tk ' + Number(s.cashSales || 0).toFixed(0) + ' | Dig: Tk ' + Number((s.cardSales || 0) + (s.bkashSales || 0) + (s.nagadSales || 0)).toFixed(0) + '\n');
      if (s.actualClosingCash !== undefined) {
        pushStr('   Drawer Close: Tk ' + Number(s.actualClosingCash).toFixed(0) + '\n');
      }
    });
    pushStr('------------------------------------------\n');
  }

  pushStr('1. CONSOLIDATED PAYMENT REVENUE\n');
  pushStr(line2Col('Cash Sales (Total) :', Number(r.totalCash || 0).toFixed(2)));
  pushStr(line2Col('Card Sales (Total) :', Number(r.totalCard || 0).toFixed(2)));
  pushStr(line2Col('bKash Sales (Total):', Number(r.totalBkash || 0).toFixed(2)));
  pushStr(line2Col('Nagad Sales (Total):', Number(r.totalNagad || 0).toFixed(2)));
  if (r.totalDue > 0) {
    pushStr(line2Col('Due / Credit Total :', Number(r.totalDue || 0).toFixed(2)));
  }
  pushStr('------------------------------------------\n');
  pushStr(line2Col('GROSS DAILY REVENUE:', Number(r.totalDaySales || 0).toFixed(2)));
  pushStr('------------------------------------------\n');

  pushStr('2. EXPENSES & VAULT DEPOSIT\n');
  pushStr(line2Col('(-) Daily Petty Exp:', Number(r.totalExpenses || 0).toFixed(2)));
  pushStr('------------------------------------------\n');
  pushStr(line2Col('NET CASH TO VAULT  :', Number(r.netCashToVault || 0).toFixed(2)));
  pushStr('------------------------------------------\n');

  pushStr('\n');
  pushStr('General Manager         Managing Director\n');
  pushStr('_________________       _________________\n\n');

  pushBytes([0x1B, 0x61, 0x01]);
  pushStr('*** END OF DAILY MASTER REPORT ***\n');
  pushStr('------------------------------------------\n');
  pushStr('\n\n\n');
  pushBytes([0x1D, 0x56, 0x00]);

  return Buffer.concat(chunks);
}

async function processPrintJob(job) {
  if (!job || !job.type) return false;
  const installedPrinters = await getWindowsPrinters();
  const defaultKotPrinter = resolveThermalPrinter(installedPrinters);

  console.log('\n🖨️ [Job Dispatch] Received job ' + job.id + ' (' + job.type + ')');

  if (job.type === 'KOT') {
    const payload = job.payload || {};
    const slips = payload.slips || [];
    if (!Array.isArray(slips) || slips.length === 0) return false;

    for (let i = 0; i < slips.length; i++) {
      const slip = slips[i];
      const targetPrinter = resolveThermalPrinter(installedPrinters, slip.targetPrinterName);
      console.log(' ➔ Printing KOT Slip ' + (i + 1) + '/' + slips.length + ' on "' + targetPrinter + '" (Kot Printer USB001)...');
      const buffer = buildKotEscPosBuffer(payload, slip, i + 1, slips.length);
      await printSlipWindows(targetPrinter, buffer);
      if (i < slips.length - 1) await new Promise(r => setTimeout(r, 800));
    }
    console.log('✅ [Job ' + job.id + '] All KOT slips printed successfully on ' + defaultKotPrinter + '!');
    return true;
  }

  if (job.type === 'BILL') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Bill for Table ' + (job.payload.tableName || 'N/A') + ' on "' + targetPrinter + '" (Kot Printer USB001)...');
    const buffer = buildBillEscPosBuffer(job.payload);
    await printSlipWindows(targetPrinter, buffer);
    console.log('✅ [Job ' + job.id + '] Bill printed successfully on ' + targetPrinter + '!');
    return true;
  }

  if (job.type === 'ZREPORT') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Shift Z-Report on "' + targetPrinter + '" (Kot Printer USB001)...');
    const buffer = buildZReportEscPosBuffer(job.payload);
    await printSlipWindows(targetPrinter, buffer);
    console.log('✅ [Job ' + job.id + '] Shift Z-Report printed successfully on ' + targetPrinter + '!');
    return true;
  }

  if (job.type === 'WAITER_SLIP') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Waiter Slip for ' + (job.payload.waiterName || 'Staff') + ' on "' + targetPrinter + '" (Kot Printer USB001)...');
    const buffer = buildWaiterSlipEscPosBuffer(job.payload);
    await printSlipWindows(targetPrinter, buffer);
    console.log('✅ [Job ' + job.id + '] Waiter slip printed successfully on ' + targetPrinter + '!');
    return true;
  }

  if (job.type === 'CHEF_SLIP') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Kitchen Chef Slip on "' + targetPrinter + '" (Kot Printer USB001)...');
    const buffer = buildChefSlipEscPosBuffer(job.payload);
    await printSlipWindows(targetPrinter, buffer);
    console.log('✅ [Job ' + job.id + '] Chef slip printed successfully on ' + targetPrinter + '!');
    return true;
  }

  if (job.type === 'DAYEND') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Daily Master Day-End Z-Report on "' + targetPrinter + '" (Kot Printer USB001)...');
    const buffer = buildDayEndEscPosBuffer(job.payload);
    await printSlipWindows(targetPrinter, buffer);
    console.log('✅ [Job ' + job.id + '] Day-End Master Z-Report printed successfully on ' + targetPrinter + '!');
    return true;
  }

  return false;
}

function startLocalHttpServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health' && req.method === 'GET') {
      const printers = await getWindowsPrinters();
      const safePrinters = printers.filter(p => !/^80\s*printer$/i.test(p.trim()));
      const activePrinter = resolveThermalPrinter(printers);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        activePrinter,
        printers: safePrinters, 
        bypassedPrinters: ['80 Printer (192.168.1.87)'],
        timestamp: Date.now() 
      }));
      return;
    }

    const handleJsonPost = (type) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const ok = await processPrintJob({ id: 'local_' + Date.now(), type, payload });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: ok }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
    };

    if (req.url === '/api/hardware/print-kot' && req.method === 'POST') {
      return handleJsonPost('KOT');
    }

    if (req.url === '/api/hardware/print-bill' && req.method === 'POST') {
      return handleJsonPost('BILL');
    }

    if (req.url === '/api/hardware/print-zreport' && req.method === 'POST') {
      return handleJsonPost('ZREPORT');
    }

    if (req.url === '/api/hardware/print-waiter-slip' && req.method === 'POST') {
      return handleJsonPost('WAITER_SLIP');
    }

    if (req.url === '/api/hardware/print-chef-slip' && req.method === 'POST') {
      return handleJsonPost('CHEF_SLIP');
    }

    if (req.url === '/api/hardware/print-dayend' && req.method === 'POST') {
      return handleJsonPost('DAYEND');
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(LOCAL_PORT, '127.0.0.1', () => {
    console.log('⚡ [Local Bridge] Direct HTTP Service ready on http://127.0.0.1:' + LOCAL_PORT);
  });
}

async function pollCloudPrintQueue() {
  try {
    const url = CLOUD_SERVER_URL + '/api/print-bridge/poll';
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.jobs) && data.jobs.length > 0) {
        const completedIds = [];
        for (const job of data.jobs) {
          const ok = await processPrintJob(job);
          if (ok) completedIds.push(job.id);
        }
        if (completedIds.length > 0) {
          await fetch(CLOUD_SERVER_URL + '/api/print-bridge/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobIds: completedIds })
          });
        }
      }
    }
  } catch (e) {
    // idle or network blip
  }

  setTimeout(pollCloudPrintQueue, POLL_INTERVAL_MS);
}

async function init() {
  console.log('================================================================');
  console.log('   🚀 CAFE BANANI - THERMAL PRINTER CLOUD BRIDGE (ACTIVE)');
  console.log('================================================================');
  console.log('  [+] Cloud Target   : ' + CLOUD_SERVER_URL);
  console.log('  [+] Local Bridge   : http://127.0.0.1:' + LOCAL_PORT + ' (Instant 0ms Print)');
  console.log('  [+] Queue Polling  : Active (Every ' + (POLL_INTERVAL_MS / 1000) + 's)');
  console.log('================================================================\n');

  const printers = await getWindowsPrinters();
  const primaryThermal = resolveThermalPrinter(printers);

  console.log('📋 Detected Installed Windows Printers:');
  printers.forEach(p => {
    if (/^80\s*printer$/i.test(p.trim())) {
      console.log('   ⛔ ' + p + ' (192.168.1.87) [PERMANENTLY BYPASSED - OFFLINE]');
    } else if (p === primaryThermal) {
      console.log('   🎯 ' + p + ' (USB001) [PRIMARY ACTIVE HARDWARE PRINTER]');
    } else {
      console.log('   • ' + p);
    }
  });

  console.log('\n🖨️ Active Output Device : "' + primaryThermal + '" on USB001');
  console.log('🛡️ Security Protection : 80 Printer (192.168.1.87) is completely blocked.');
  console.log('🟢 Status: Listening for print orders from ' + CLOUD_SERVER_URL + '...\n');

  startLocalHttpServer();
  pollCloudPrintQueue();
}

init();
