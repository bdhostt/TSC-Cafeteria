const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL || 'https://erp-pos-sdv3.onrender.com';
const LOCAL_PORT = 9123;
const POLL_INTERVAL_MS = 1500;

async function getWindowsPrinters() {
  return new Promise((resolve) => {
    exec('powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"', (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const list = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      resolve(list);
    });
  });
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

  pushBytes([0x1B, 0x40]);
  pushBytes([0x1B, 0x21, 0x00]);

  pushBytes([0x1B, 0x61, 0x01]);
  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x01]);
  pushStr('STATION: ' + (slip.station || 'MAIN KITCHEN').toUpperCase() + '\n');
  pushStr('KOT NO: ' + req.invoiceNo + (total > 1 ? '-' + index : '') + '\n');
  pushBytes([0x1B, 0x45, 0x00]);
  pushStr('------------------------------------------\n');

  pushBytes([0x1B, 0x61, 0x00]);
  pushBytes([0x1B, 0x45, 0x01]);
  pushStr('TABLE   : ' + req.tableName + (req.tableZone ? ' (' + req.tableZone + ')' : '') + '\n');
  pushBytes([0x1B, 0x45, 0x00]);

  const timeStr = req.dateTime || new Date().toLocaleString('en-US');
  pushStr('TIME    : ' + timeStr + '\n');
  pushStr('WAITER  : ' + (req.waiter || 'Staff') + '\n');
  if (req.customer && req.customer !== 'Walk-in Customer') {
    pushStr('CUSTOMER: ' + req.customer + '\n');
  }
  pushStr('------------------------------------------\n');

  pushBytes([0x1B, 0x45, 0x01]);
  pushStr('ITEM NAME                              QTY\n');
  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x00]);

  for (const item of (slip.items || [])) {
    const name = item.name.length > 33 ? item.name.slice(0, 33) : item.name;
    const nameCol = name.padEnd(34, ' ');
    const qtyCol = (item.qty + 'x').padStart(6, ' ');

    pushBytes([0x1B, 0x45, 0x01]);
    pushStr(nameCol + ' ' + qtyCol + '\n');
    pushBytes([0x1B, 0x45, 0x00]);

    if (item.variation) pushStr('  * Cut: ' + item.variation + '\n');
    if (item.addons && item.addons.length > 0) pushStr('  + Extras: ' + item.addons.join(', ') + '\n');
    if (item.notes) pushStr('  - Note: ' + item.notes + '\n');
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

  pushBytes([0x1B, 0x40]);
  pushBytes([0x1B, 0x21, 0x00]);

  pushBytes([0x1B, 0x61, 0x01]);
  pushBytes([0x1B, 0x45, 0x01]);
  pushStr((bill.restaurantName || 'BARCODE CAFE BANANI') + '\n');
  pushBytes([0x1B, 0x45, 0x00]);
  pushStr((bill.restaurantAddress || 'House #42, Road #11, Block D, Banani') + '\n');
  pushStr('Hotline: ' + (bill.restaurantHotline || '+880 1700-000000') + '\n');
  if (bill.restaurantBin) pushStr('BIN/VAT Reg: ' + bill.restaurantBin + '\n');
  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x01]);
  pushStr((bill.isSettled ? 'PAID CASH MEMO' : 'INVOICE / GUEST BILL') + '\n');
  pushBytes([0x1B, 0x45, 0x00]);
  pushStr('------------------------------------------\n');

  pushBytes([0x1B, 0x61, 0x00]);
  pushStr(line2Col('Invoice No :', bill.invoiceNo));
  pushStr(line2Col('Date & Time:', bill.dateTime || new Date().toLocaleString('en-US')));
  pushStr(line2Col('Table      :', bill.tableName + (bill.tableZone ? ' (' + bill.tableZone + ')' : '')));
  if (bill.channelOrAgent) pushStr(line2Col('Channel    :', bill.channelOrAgent));
  pushStr(line2Col('Waiter     :', bill.waiter || 'Staff'));
  pushStr(line2Col('Customer   :', bill.customer || 'Walk-in Customer'));
  pushStr('------------------------------------------\n');

  const colItemH = 'ITEM'.padEnd(19, ' ');
  const colQtyH = 'QTY'.padStart(3, ' ');
  const colPriceH = 'PRICE'.padStart(8, ' ');
  const colTotalH = 'TOTAL'.padStart(9, ' ');
  pushBytes([0x1B, 0x45, 0x01]);
  pushStr(colItemH + ' ' + colQtyH + ' ' + colPriceH + ' ' + colTotalH + '\n');
  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x00]);

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
  pushStr(line2Col('Subtotal:', Number(bill.subtotal || 0).toFixed(2)));
  if (bill.discountDeduction > 0) {
    const discLbl = bill.discountType === 'percent' && bill.discountVal 
      ? 'Discount (' + bill.discountVal + '%):' 
      : 'Discount:';
    pushStr(line2Col(discLbl, '-' + Number(bill.discountDeduction).toFixed(2)));
  }
  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x01]);
  pushStr(line2Col('TOTAL PAYABLE:', Number(bill.netTotal || 0).toFixed(2)));
  pushBytes([0x1B, 0x45, 0x00]);

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

async function processPrintJob(job) {
  const installedPrinters = await getWindowsPrinters();
  const defaultKotPrinter = installedPrinters.find(p => /kot/i.test(p))
    || installedPrinters.find(p => /pos|receipt|thermal|80/i.test(p))
    || installedPrinters[0]
    || 'Kot Printer';

  const defaultBillPrinter = installedPrinters.find(p => /pos|receipt|bill|cash/i.test(p))
    || defaultKotPrinter;

  console.log('\n🖨️ [Job Dispatch] Received job ' + job.id + ' (' + job.type + ')');

  if (job.type === 'KOT') {
    const payload = job.payload || {};
    const slips = payload.slips || [];
    if (!Array.isArray(slips) || slips.length === 0) return false;

    for (let i = 0; i < slips.length; i++) {
      const slip = slips[i];
      let targetPrinter = defaultKotPrinter;
      if (slip.targetPrinterName && installedPrinters.includes(slip.targetPrinterName)) {
        targetPrinter = slip.targetPrinterName;
      }
      console.log(' ➔ Printing KOT Slip ' + (i + 1) + '/' + slips.length + ' on "' + targetPrinter + '"...');
      const buffer = buildKotEscPosBuffer(
        payload,
        slip,
        i + 1,
        slips.length
      );
      await printSlipWindows(targetPrinter, buffer);
      if (i < slips.length - 1) await new Promise(r => setTimeout(r, 800));
    }
    console.log('✅ [Job ' + job.id + '] All KOT slips printed successfully!');
    return true;
  }

  if (job.type === 'BILL') {
    console.log(' ➔ Printing Bill for Table ' + job.payload.tableName + ' on "' + defaultBillPrinter + '"...');
    const buffer = buildBillEscPosBuffer(job.payload);
    await printSlipWindows(defaultBillPrinter, buffer);
    console.log('✅ [Job ' + job.id + '] Bill printed successfully!');
    return true;
  }

  return false;
}

function startLocalHttpServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/health' && req.method === 'GET') {
      const printers = await getWindowsPrinters();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', printers: printers, timestamp: Date.now() }));
      return;
    }

    if (req.url === '/api/hardware/print-kot' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const ok = await processPrintJob({ id: 'local_' + Date.now(), type: 'KOT', payload: payload });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: ok }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.url === '/api/hardware/print-bill' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const ok = await processPrintJob({ id: 'local_' + Date.now(), type: 'BILL', payload: payload });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: ok }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
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
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
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
    // idle
  }

  setTimeout(pollCloudPrintQueue, POLL_INTERVAL_MS);
}

async function init() {
  console.log('================================================================');
  console.log('   🚀 CAFE BANANI - LOCAL PRINTER BRIDGE AGENT (ACTIVE)');
  console.log('================================================================');
  console.log('  [+] Cloud Target   : ' + CLOUD_SERVER_URL);
  console.log('  [+] Local Bridge   : http://127.0.0.1:' + LOCAL_PORT + ' (Instant 0ms Print)');
  console.log('  [+] Queue Polling  : Active (Every ' + (POLL_INTERVAL_MS / 1000) + 's)');
  console.log('================================================================\n');

  const printers = await getWindowsPrinters();
  console.log('📋 Detected Installed Windows Printers:');
  printers.forEach(p => console.log('   • ' + p));
  console.log('\n🟢 Status: Ready & listening for orders from live website...\n');

  startLocalHttpServer();
  pollCloudPrintQueue();
}

init();
