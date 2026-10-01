const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { exec, execFile } = require('child_process');

const CLOUD_SERVER_URL = (process.argv[2] || process.env.CLOUD_SERVER_URL || 'https://tsc-cafeteria.onrender.com').replace(/\/+$/, '');
const LOCAL_PORT = 9123;
const POLL_INTERVAL_MS = 250;

let cachedPrinters = [];
let cachedDetailedPrinters = [];
let cachedUsbDevicePaths = [];
let cachedLanIps = ['192.168.1.87'];
let isUsbPhysicallyConnected = false;
let isLanReachable = false;
let lastPrinterScan = 0;
let printerScanPromise = null;

const VIRTUAL_PRINTER_REGEX = /microsoft print to pdf|xps document writer|onenote|fax|adobe pdf|foxit|send to|anydesk|snagit|cutepdf/i;

function ensureFastPrintBinary() {
  const exePath = path.join(__dirname, 'scripts', 'raw-print.exe');
  const csPath = path.join(__dirname, 'scripts', 'raw-print.cs');
  if (fs.existsSync(exePath)) return exePath;
  const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  if (fs.existsSync(csc) && fs.existsSync(csPath)) {
    execFile(csc, ['/nologo', '/optimize+', '/target:exe', `/out:${exePath}`, csPath], () => {});
  }
  return exePath;
}

function checkTcpReachable(host, port, timeoutMs = 300) {
  return new Promise((resolve) => {
    let done = false;
    const socket = new net.Socket();
    const finish = (ok) => {
      if (!done) {
        done = true;
        try { socket.destroy(); } catch (e) {}
        resolve(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
    socket.connect(port, host, () => finish(true));
  });
}

// Automatically configure routing if a thermal printer is plugged directly into PC's LAN port without a router (APIPA 169.254.x.x)
function configureDirectLanCableRoute() {
  const ps = `
    $eth = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' -and ($_.InterfaceDescription -match 'Ethernet|Realtek|Intel|PCIe|LAN|USB' -or $_.Name -match 'Ethernet') };
    foreach ($adapter in $eth) {
      $ips = @(Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue);
      $hasApipa = $ips | Where-Object { $_.IPAddress -match '^169\\.254\\.' };
      $has192 = $ips | Where-Object { $_.IPAddress -match '^192\\.168\\.1\\.' };
      if ($hasApipa -and -not $has192) {
        route add 192.168.1.87 mask 255.255.255.255 0.0.0.0 IF $adapter.ifIndex 2>$null;
        New-NetIPAddress -InterfaceIndex $adapter.ifIndex -IPAddress 192.168.1.250 -PrefixLength 24 -SkipAsSource $true -ErrorAction SilentlyContinue | Out-Null;
      }
    }
  `.replace(/\r?\n/g, ' ');
  exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps.replace(/"/g, '\\"')}"`, { timeout: 8000 }, () => {});
}

function refreshWindowsPrintersInBackground() {
  if (printerScanPromise) return printerScanPromise;
  printerScanPromise = new Promise((resolve) => {
    const psCmd = [
      `$usb = @(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.Service -eq 'usbprint' -and $_.Status -eq 'OK' });`,
      `$usbDevices = @();`,
      `foreach ($u in $usb) {`,
      `  $busDesc = (Get-PnpDeviceProperty -InstanceId $u.InstanceId -KeyName 'DEVPKEY_Device_BusReportedDeviceDesc' -ErrorAction SilentlyContinue).Data;`,
      `  $friendly = $u.FriendlyName;`,
      `  $label = if ($busDesc) { [string]$busDesc } elseif ($friendly) { [string]$friendly } else { 'USB Receipt Printer' };`,
      `  $usbDevices += [PSCustomObject]@{ Name = $label.Trim(); InstanceId = [string]$u.InstanceId; FriendlyName = [string]$friendly };`,
      `}`,
      `$printers = @(Get-Printer -ErrorAction SilentlyContinue | Select-Object Name, PortName, DriverName, WorkOffline, PrinterStatus);`,
      `[PSCustomObject]@{ usbCount = $usb.Count; usbDevices = $usbDevices; printers = $printers } | ConvertTo-Json -Depth 4 -Compress`
    ].join(' ');

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd.replace(/"/g, '\\"')}"`, { timeout: 12000 }, async (err, stdout) => {
      printerScanPromise = null;
      const detailed = [];
      const allNames = [];
      const usbPaths = [];
      const discoveredIps = new Set(['192.168.1.87', '192.168.0.87', '192.168.1.200', '192.168.0.200']);

      if (!err && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          isUsbPhysicallyConnected = (Number(parsed.usbCount) || 0) > 0;
          const rawList = Array.isArray(parsed.printers) ? parsed.printers : (parsed.printers ? [parsed.printers] : []);
          const usbDevList = Array.isArray(parsed.usbDevices) ? parsed.usbDevices : (parsed.usbDevices ? [parsed.usbDevices] : []);

          for (const p of rawList) {
            const name = (p && p.Name ? String(p.Name) : '').trim();
            const rawPort = (p && p.PortName ? String(p.PortName) : '').trim();
            if (!name) continue;

            const ipMatch = rawPort.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (ipMatch) discoveredIps.add(ipMatch[1]);

            const isVirtual = VIRTUAL_PRINTER_REGEX.test(name) || /^(PORTPROMPT:|SHRFAX:|nul:|FILE:)/i.test(rawPort) || /^Microsoft\.Office\./i.test(rawPort);
            const isUsbPort = /^USB/i.test(rawPort);
            const isLanPort = Boolean(ipMatch) || /^(IP_|WSD|TCP)/i.test(rawPort);
            const connType = isLanPort ? 'LAN' : 'USB';
            const displayPort = /^Microsoft\.Office\.OneNote/i.test(rawPort)
              ? 'OneNote Port'
              : (rawPort.length > 28 ? rawPort.slice(0, 25) + '...' : (rawPort || 'USB001'));
            const connectedNow = isUsbPort ? isUsbPhysicallyConnected : (!p.WorkOffline);

            detailed.push({
              name,
              portName: displayPort,
              driverName: (p && p.DriverName ? String(p.DriverName) : ''),
              connectionType: connType,
              ipAddress: ipMatch ? ipMatch[1] : (connType === 'LAN' ? '192.168.1.87' : undefined),
              port: 9100,
              usbPort: isUsbPort ? rawPort : displayPort,
              isConnected: connectedNow,
              isVirtual,
              deviceCategory: 'Printers'
            });

            if (!allNames.some(n => n.toLowerCase() === name.toLowerCase())) {
              allNames.push(name);
            }
          }

          // Dynamically include connected USB PnP printer devices (e.g. "USB Receipt Printer" under Unspecified in Devices and Printers)
          for (const u of usbDevList) {
            const instId = (u && u.InstanceId ? String(u.InstanceId) : '').trim();
            if (instId) {
              usbPaths.push('\\\\?\\' + instId.replace(/\\/g, '#') + '#{28d78fad-5a12-11d1-ae5b-0000f803a8c2}');
            }
            const usbName = (u && u.Name ? String(u.Name) : '').trim();
            if (!usbName) continue;
            if (!detailed.some(d => d.name.toLowerCase() === usbName.toLowerCase())) {
              detailed.push({
                name: usbName,
                portName: 'USB001',
                driverName: (u && u.FriendlyName ? String(u.FriendlyName) : 'USB Printing Support'),
                connectionType: 'USB',
                port: 9100,
                usbPort: 'USB001',
                isConnected: true,
                isVirtual: false,
                deviceCategory: 'Unspecified (USB)'
              });
            }
            if (!allNames.some(n => n.toLowerCase() === usbName.toLowerCase())) {
              allNames.push(usbName);
            }
          }
        } catch (parseErr) {
          // ignore parse error
        }
      }

      cachedUsbDevicePaths = usbPaths;
      cachedLanIps = Array.from(discoveredIps);

      // Check if any LAN thermal printer is reachable on TCP 9100 in parallel (max 250ms total instead of sequential)
      const lanResults = await Promise.all(
        cachedLanIps.map(async (ip) => ({ ip, ok: await checkTcpReachable(ip, 9100, 250) }))
      );
      const reachableEntry = lanResults.find(r => r.ok);
      isLanReachable = Boolean(reachableEntry);
      const activeLanIp = reachableEntry ? reachableEntry.ip : '192.168.1.87';
      if (reachableEntry) {
        cachedLanIps = [activeLanIp, ...cachedLanIps.filter(x => x !== activeLanIp)];
      }

      if (isLanReachable && !detailed.some(d => d.connectionType === 'LAN' && d.ipAddress === activeLanIp)) {
        detailed.unshift({
          name: `80 Printer (LAN ${activeLanIp})`,
          portName: `${activeLanIp}:9100`,
          driverName: 'Direct TCP/IP ESC/POS',
          connectionType: 'LAN',
          ipAddress: activeLanIp,
          port: 9100,
          isConnected: true,
          isVirtual: false,
          deviceCategory: 'LAN Printer'
        });
        if (!allNames.includes('80 Printer')) {
          allNames.unshift('80 Printer');
        }
      }

      // Sort so physical hardware printers (USB / LAN) appear first, then system printers alphabetically
      detailed.sort((a, b) => {
        if (Boolean(a.isVirtual) !== Boolean(b.isVirtual)) {
          return a.isVirtual ? 1 : -1;
        }
        if (Boolean(a.isConnected) !== Boolean(b.isConnected)) {
          return a.isConnected ? -1 : 1;
        }
        return String(a.name).localeCompare(String(b.name));
      });

      cachedDetailedPrinters = detailed;
      cachedPrinters = detailed.map(d => d.name);
      lastPrinterScan = Date.now();
      resolve(cachedPrinters);
    });
  });
  return printerScanPromise;
}

async function getWindowsPrinters(force = false) {
  const now = Date.now();
  if (force || lastPrinterScan === 0) {
    await refreshWindowsPrintersInBackground();
    return cachedPrinters;
  }
  // If cache is older than 8s, trigger non-blocking background refresh so printing NEVER waits!
  if (now - lastPrinterScan >= 8000) {
    refreshWindowsPrintersInBackground();
  }
  return cachedPrinters;
}

async function hasConnectedHardwarePrinter() {
  if (lastPrinterScan === 0) {
    await refreshWindowsPrintersInBackground();
  } else if (Date.now() - lastPrinterScan >= 8000) {
    refreshWindowsPrintersInBackground();
  }
  return isUsbPhysicallyConnected || isLanReachable || cachedPrinters.length > 0;
}

function printTcpRaw(host, port, rawBuffer, timeoutMs = 450) {
  return new Promise((resolve) => {
    let resolved = false;
    const socket = new net.Socket();
    const finish = (ok) => {
      if (!resolved) {
        resolved = true;
        try { socket.destroy(); } catch (e) {}
        resolve(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
    socket.connect(port, host, () => {
      socket.write(rawBuffer, () => {
        socket.end();
        finish(true);
      });
    });
  });
}

function resolveThermalPrinter(installedPrinters, requestedName) {
  const printers = (installedPrinters || []).filter(p => !VIRTUAL_PRINTER_REGEX.test(p));
  const lanPrinter = printers.find(p => /80\s*printer/i.test(p));

  if (lanPrinter) {
    return lanPrinter;
  }

  if (requestedName && !VIRTUAL_PRINTER_REGEX.test(requestedName)) {
    const trimmedReq = requestedName.trim();
    const exact = printers.find(p => p.toLowerCase() === trimmedReq.toLowerCase());
    if (exact) return exact;

    if (/kot/i.test(trimmedReq)) {
      const matchKot = printers.find(p => /kot/i.test(p));
      if (matchKot) return matchKot;
    }
  }

  const kot = printers.find(p => /kot\s*printer/i.test(p)) || printers.find(p => /kot/i.test(p));
  if (kot) return kot;

  const thermal = printers.find(p => /pos|receipt|thermal|80|58|xp|xprinter|gp|rongta|epson|bixolon|generic/i.test(p));
  if (thermal) return thermal;

  return printers[0] || '80 Printer';
}

async function printSlipWindows(printerName, rawBuffer) {
  return new Promise((resolve) => {
    const tempFile = path.join(os.tmpdir(), 'agent_print_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '.bin');
    fs.writeFileSync(tempFile, rawBuffer);

    const safePrinter = (printerName || '80 Printer').trim();
    const fastExe = ensureFastPrintBinary();
    const usbDevPath = cachedUsbDevicePaths[0] || '';

    // 1. Ultra-Fast Native C# Binary (~50-80ms, zero PowerShell startup or compilation overhead!)
    if (fs.existsSync(fastExe)) {
      execFile(fastExe, [safePrinter, tempFile, usbDevPath], { timeout: 2500 }, (err, stdout) => {
        if (!err) {
          try { fs.unlinkSync(tempFile); } catch (e) {}
          console.log('⚡ [Instant USB/Spooler Print] ' + (stdout || 'SUCCESS').trim());
          return resolve(true);
        }
        // Fallback to PowerShell script only if native binary returned error
        const scriptPath = path.join(__dirname, 'scripts', 'print-raw.ps1');
        const psCmd = 'powershell -NoProfile -ExecutionPolicy Bypass -File "' + scriptPath + '" -PrinterName "' + safePrinter.replace(/"/g, '`"') + '" -FilePath "' + tempFile.replace(/"/g, '`"') + '"';
        exec(psCmd, (error, psOut) => {
          try { fs.unlinkSync(tempFile); } catch (e) {}
          if (error) {
            console.error('❌ [Print Error] Hardware print unavailable on "' + safePrinter + '"');
            resolve(false);
          } else {
            console.log('🖨️ [Hardware Print] ' + (psOut || 'SUCCESS').trim());
            resolve(true);
          }
        });
      });
      return;
    }

    // 2. PowerShell fallback if raw-print.exe is not present yet
    const scriptPath = path.join(__dirname, 'scripts', 'print-raw.ps1');
    const psCmd = 'powershell -NoProfile -ExecutionPolicy Bypass -File "' + scriptPath + '" -PrinterName "' + safePrinter.replace(/"/g, '`"') + '" -FilePath "' + tempFile.replace(/"/g, '`"') + '"';

    exec(psCmd, (error, stdout) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      if (error) {
        console.error('❌ [Print Error] Hardware print unavailable on "' + printerName + '":', (error.message || '').split('\n')[0]);
        resolve(false);
      } else {
        console.log('🖨️ [Hardware Print] ' + (stdout || 'SUCCESS').trim());
        resolve(true);
      }
    });
  });
}

async function printSlipFast(printerName, rawBuffer) {
  // 1. Only try direct TCP Socket (Port 9100) if a LAN printer is actually reachable (prevents 2.8s timeout delay on USB setups!)
  if (isLanReachable) {
    for (const ip of cachedLanIps) {
      const tcpOk = await printTcpRaw(ip, 9100, rawBuffer, 350);
      if (tcpOk) {
        console.log('⚡ [Ultra-Fast LAN Print] Sent directly to ' + ip + ':9100');
        return true;
      }
    }
  }

  // 2. Instant Direct USB Hardware / Windows Spooler via raw-print.exe (~80ms!)
  return await printSlipWindows(printerName, rawBuffer);
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
  const shouldShowDateTime = slip.showDateTime !== undefined ? Boolean(slip.showDateTime) : (req.showDateTime !== false);
  if (shouldShowDateTime) {
    pushStr('TIME    : ' + timeStr + '\n');
  }

  const shouldShowWaiter = slip.showWaiter !== undefined ? Boolean(slip.showWaiter) : (req.showWaiter !== undefined ? Boolean(req.showWaiter) : true);
  if (shouldShowWaiter) {
    pushStr('WAITER  : ' + (req.waiter || 'Staff') + '\n');
  }

  const shouldShowCustomer = slip.showCustomer !== undefined ? Boolean(slip.showCustomer) : Boolean(req.showCustomer);
  if (shouldShowCustomer && req.customer && req.customer !== 'Walk-in Customer') {
    pushStr('CUSTOMER: ' + req.customer + '\n');
  }
  pushStr('------------------------------------------\n');

  const shouldShowPrices = Boolean(slip.showPrices || req.showPrices);

  if (shouldShowPrices) {
    // 5. Items Header with Price (Exact 42 character columns: 22 item + 1 space + 5 qty + 1 space + 13 price = 42)
    pushBytes([0x1B, 0x45, 0x01]); // Bold ON
    const colItemH = 'ITEM NAME'.padEnd(22, ' ');
    const colQtyH = 'QTY'.padStart(5, ' ');
    const colPriceH = 'PRICE'.padStart(13, ' ');
    pushStr(colItemH + ' ' + colQtyH + ' ' + colPriceH + '\n');
    pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
    pushStr('------------------------------------------\n');

    // 6. Food Items with Prices
    let totalAmount = 0;
    for (const item of (slip.items || [])) {
      const itemPrice = Number(item.price || 0);
      const itemTotal = itemPrice * item.qty;
      totalAmount += itemTotal;

      let firstLineName = (item.name || '').trim();
      let remainder = '';
      if (firstLineName.length > 22) {
        const lastSpace = firstLineName.lastIndexOf(' ', 22);
        if (lastSpace > 10) {
          remainder = firstLineName.slice(lastSpace + 1).trim();
          firstLineName = firstLineName.slice(0, lastSpace);
        } else {
          remainder = firstLineName.slice(22).trim();
          firstLineName = firstLineName.slice(0, 22);
        }
      }

      const nameCol = firstLineName.padEnd(22, ' ');
      const qtyCol = (item.qty + 'x').padStart(5, ' ');
      const priceCol = `Tk ${itemPrice}`.padStart(13, ' ');

      pushBytes([0x1B, 0x45, 0x01]); // Bold ON
      pushStr(nameCol + ' ' + qtyCol + ' ' + priceCol + '\n');
      pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

      if (remainder) pushStr('  ' + remainder + '\n');
      if (item.variation) pushStr('   - Cut: ' + item.variation + '\n');
      if (item.addons && item.addons.length > 0) pushStr('   - Extras: ' + item.addons.join(', ') + '\n');
      if (item.notes) pushStr('   - Note: ' + item.notes + '\n');
    }

    pushStr('------------------------------------------\n');
  } else {
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
  }

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
  pushStr((bill.restaurantName || 'BD HOSTT POS') + '\n');
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

  const rawAddress = bill.restaurantAddress || 'Chattogram, Bangladesh';
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
  const metaLine = (lbl, val) => {
    if (!val) return '';
    return lbl.padEnd(14, ' ') + ': ' + val + '\n';
  };

  pushStr(metaLine('Invoice No', bill.invoiceNo || 'INV-0000'));

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
  pushStr(line2Col('Date : ' + dateStr, 'Time: ' + timeStr));
  pushStr(metaLine('Table & Zone', (bill.tableName || 'Takeaway') + (bill.tableZone ? ' (' + bill.tableZone + ')' : '')));
  if (bill.channelOrAgent) pushStr(metaLine('Channel', bill.channelOrAgent));
  if (bill.showWaiter !== false) {
    pushStr(metaLine('Waiter', bill.waiter && bill.waiter !== 'N/A' && bill.waiter !== 'Staff' ? bill.waiter : (bill.waiter || 'Staff')));
  }
  const orderTaker = bill.orderTakenBy || bill.orderCreatedBy || bill.waiter || 'Staff';
  if (orderTaker && orderTaker !== (bill.waiter || 'Staff')) {
    pushStr(metaLine('Order Taken By', orderTaker));
  }
  if (bill.isSettled) {
    const settleRole = bill.settleBillRole || bill.cashierRole || 'Cashier';
    pushStr(metaLine('Bill Settled By', settleRole));
  }
  if (bill.customer && bill.customer !== 'Walk-in Customer') {
    pushStr(metaLine('Customer', bill.customer));
  }
  pushStr('------------------------------------------\n');

  // 5. Column Headers (Exact 42 character columns: 19 + 1 + 4 + 1 + 8 + 1 + 8 = 42)
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON for headers
  const colItemH = 'ITEM'.padEnd(19, ' ');
  const colQtyH = ' QTY';
  const colPriceH = '   PRICE';
  const colTotalH = '   TOTAL';
  pushStr(colItemH + ' ' + colQtyH + ' ' + colPriceH + ' ' + colTotalH + '\n');
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
  pushStr('------------------------------------------\n');

  // 6. Food Items (Crisp & High Legibility)
  for (const item of (bill.items || [])) {
    let firstLineName = (item.name || '').trim();
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
    const colQty = (' ' + item.qty + ' ').padStart(4, ' ');
    const colPrice = Number(item.price).toFixed(2).padStart(8, ' ');
    const colTotal = Number(item.price * item.qty).toFixed(2).padStart(8, ' ');

    pushStr(colItem + ' ' + colQty + ' ' + colPrice + ' ' + colTotal + '\n');
    if (remainder) pushStr('  ' + remainder + '\n');
    if (item.variation) pushStr('  * Cut: ' + item.variation + '\n');
    if (item.addons && item.addons.length > 0) pushStr('  + Extras: ' + item.addons.join(', ') + '\n');
    if (item.notes) pushStr('  - Note: ' + item.notes + '\n');
  }

  pushStr('------------------------------------------\n');

  // 7. Financial Totals (Right-aligned matching the TOTAL column at column 42)
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
  pushStr((report.restaurantName || 'BD HOSTT POS') + '\n');

  const rawAddress = report.restaurantAddress || 'Chattogram, Bangladesh';
  if (rawAddress) pushStr(rawAddress + '\n');
  const rawHotline = report.restaurantHotline || '+880 1756-007600';
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

  const rawRoles = s.roleBreakdown;
  const roles = Array.isArray(rawRoles) ? rawRoles.filter(r => (Number(r.orderCount) || 0) > 0 || (Number(r.totalCollected) || 0) > 0) : [];
  if (roles && roles.length > 0) {
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
  pushStr((data.restaurantName || 'BD HOSTT POS') + '\n');
  pushStr((data.restaurantAddress || 'Chattogram, Bangladesh') + '\n');
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
  pushStr((data.restaurantName || 'BD HOSTT POS') + '\n');
  pushStr((data.restaurantAddress || 'Chattogram, Bangladesh') + '\n');
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
  pushStr((data.restaurantName || 'BD HOSTT POS') + '\n');
  pushStr((data.restaurantAddress || 'Chattogram, Bangladesh') + '\n');
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

const recentJobsCache = new Map();

function getJobDedupKey(job) {
  if (!job) return '';
  let key = job.id;
  if (job.payload) {
    const p = job.payload;
    const inv = p.invoiceNo || p.id || '';
    const tbl = p.tableName || '';
    const tot = p.netTotal || (p.slips ? p.slips.length : '');
    key = (job.type || '') + '_' + inv + '_' + tbl + '_' + tot;
  }
  return key;
}

function isDuplicateJob(job) {
  if (!job) return false;
  const now = Date.now();
  for (const [key, timestamp] of recentJobsCache.entries()) {
    if (now - timestamp > 30000) recentJobsCache.delete(key);
  }

  const key = getJobDedupKey(job);
  if (recentJobsCache.has(key)) {
    const diff = now - recentJobsCache.get(key);
    if (diff < 15000) {
      console.log('⚠️ [Deduplication] Blocked duplicate print job (' + key + ') received within ' + diff + 'ms.');
      return true;
    }
  }
  return false;
}

function markJobPrinted(job) {
  const key = getJobDedupKey(job);
  if (key) recentJobsCache.set(key, Date.now());
}

async function processPrintJob(job) {
  if (!job || !job.type) return false;
  if (isDuplicateJob(job)) return true;

  const installedPrinters = await getWindowsPrinters();
  const defaultKotPrinter = resolveThermalPrinter(installedPrinters);

  console.log('\n🖨️ [Job Dispatch] Processing job ' + job.id + ' (' + job.type + ')');

  if (job.type === 'KOT') {
    const payload = job.payload || {};
    const slips = payload.slips || [];
    if (!Array.isArray(slips) || slips.length === 0) return false;

    let allOk = true;
    for (let i = 0; i < slips.length; i++) {
      const slip = slips[i];
      const targetPrinter = resolveThermalPrinter(installedPrinters, slip.targetPrinterName);
      console.log(' ➔ Printing KOT Slip ' + (i + 1) + '/' + slips.length + ' on "' + targetPrinter + '"...');
      const buffer = buildKotEscPosBuffer(payload, slip, i + 1, slips.length);
      const ok = await printSlipFast(targetPrinter, buffer);
      if (!ok) allOk = false;
      if (i < slips.length - 1) await new Promise(r => setTimeout(r, 200));
    }
    if (allOk) {
      markJobPrinted(job);
      console.log('✅ [Job ' + job.id + '] All KOT slips printed successfully on ' + defaultKotPrinter + '!');
      return true;
    }
    console.warn('⚠️ [Job ' + job.id + '] KOT print failed on this device (printer not connected here).');
    return false;
  }

  if (job.type === 'BILL') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Bill for Table ' + (job.payload.tableName || 'N/A') + ' on "' + targetPrinter + '"...');
    const buffer = buildBillEscPosBuffer(job.payload);
    const ok = await printSlipFast(targetPrinter, buffer);
    if (ok) {
      markJobPrinted(job);
      console.log('✅ [Job ' + job.id + '] Bill printed successfully on ' + targetPrinter + '!');
    }
    return ok;
  }

  if (job.type === 'ZREPORT') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Shift Z-Report on "' + targetPrinter + '"...');
    const buffer = buildZReportEscPosBuffer(job.payload);
    const ok = await printSlipFast(targetPrinter, buffer);
    if (ok) {
      markJobPrinted(job);
      console.log('✅ [Job ' + job.id + '] Shift Z-Report printed successfully on ' + targetPrinter + '!');
    }
    return ok;
  }

  if (job.type === 'WAITER_SLIP') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Waiter Slip for ' + (job.payload.waiterName || 'Staff') + ' on "' + targetPrinter + '"...');
    const buffer = buildWaiterSlipEscPosBuffer(job.payload);
    const ok = await printSlipFast(targetPrinter, buffer);
    if (ok) {
      markJobPrinted(job);
      console.log('✅ [Job ' + job.id + '] Waiter slip printed successfully on ' + targetPrinter + '!');
    }
    return ok;
  }

  if (job.type === 'CHEF_SLIP') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Kitchen Chef Slip on "' + targetPrinter + '"...');
    const buffer = buildChefSlipEscPosBuffer(job.payload);
    const ok = await printSlipFast(targetPrinter, buffer);
    if (ok) {
      markJobPrinted(job);
      console.log('✅ [Job ' + job.id + '] Chef slip printed successfully on ' + targetPrinter + '!');
    }
    return ok;
  }

  if (job.type === 'DAYEND') {
    const targetPrinter = resolveThermalPrinter(installedPrinters);
    console.log(' ➔ Printing Daily Master Day-End Z-Report on "' + targetPrinter + '"...');
    const buffer = buildDayEndEscPosBuffer(job.payload);
    const ok = await printSlipFast(targetPrinter, buffer);
    if (ok) {
      markJobPrinted(job);
      console.log('✅ [Job ' + job.id + '] Day-End Master Z-Report printed successfully on ' + targetPrinter + '!');
    }
    return ok;
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

    if ((req.url === '/health' || req.url.startsWith('/health?') || req.url === '/api/hardware/printers' || req.url.startsWith('/api/hardware/printers?')) && req.method === 'GET') {
      const force = req.url.includes('force=1');
      const printers = await getWindowsPrinters(force);
      const hasHardware = await hasConnectedHardwarePrinter();
      const activePrinter = resolveThermalPrinter(printers);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true,
        status: hasHardware ? 'ok' : 'standby',
        hasHardware,
        isUsbConnected: isUsbPhysicallyConnected,
        isLanReachable,
        activePrinter,
        printers: printers,
        detailedPrinters: cachedDetailedPrinters,
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

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.log('ℹ️ [Local Bridge] Port ' + LOCAL_PORT + ' is already active in another background instance.');
      process.exit(42);
    }
    console.error('⚠️ [Local Bridge Server Error]:', err.message);
  });

  server.listen(LOCAL_PORT, '0.0.0.0', () => {
    console.log('⚡ [Local Bridge] Direct HTTP Service ready on http://127.0.0.1:' + LOCAL_PORT + ' (and LAN 0.0.0.0:' + LOCAL_PORT + ')');
  });
}

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});

async function pollCloudPrintQueue() {
  try {
    // CRITICAL: Only pull and complete jobs from the cloud queue if THIS PC physically has the USB or LAN printer connected!
    // Otherwise an unplugged PC will steal jobs meant for another PC where the printer is currently connected.
    const canPrintHere = await hasConnectedHardwarePrinter();
    if (canPrintHere) {
      const url = CLOUD_SERVER_URL + '/api/print-bridge/poll';
      const activePrinter = resolveThermalPrinter(cachedPrinters);
      const agentMeta = Buffer.from(JSON.stringify({
        activePrinter,
        isUsbConnected: isUsbPhysicallyConnected,
        isLanReachable,
        printers: cachedPrinters,
        detailedPrinters: cachedDetailedPrinters
      }), 'utf8').toString('base64');

      const response = await fetch(url, {
        headers: { 'X-Agent-Printers': agentMeta },
        signal: AbortSignal.timeout(4000)
      });
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
    }
  } catch (e) {
    // idle or network blip
  }

  setTimeout(pollCloudPrintQueue, POLL_INTERVAL_MS);
}

async function init() {
  console.log('================================================================');
  console.log('   🚀 BD HOSTT POS - THERMAL PRINTER CLOUD BRIDGE (ACTIVE)');
  console.log('================================================================');
  console.log('  [+] Cloud Target   : ' + CLOUD_SERVER_URL);
  console.log('  [+] Local Bridge   : http://127.0.0.1:' + LOCAL_PORT + ' (Instant 0ms Print)');
  console.log('  [+] Queue Polling  : Active (Smart Hardware-Aware Mode)');
  console.log('================================================================\n');

  // Configure direct LAN cable route if printer is plugged straight into PC Ethernet port
  configureDirectLanCableRoute();
  setInterval(configureDirectLanCableRoute, 20000);

  // Start HTTP health/print server and cloud polling immediately (0ms delay)
  startLocalHttpServer();
  pollCloudPrintQueue();

  const printers = await refreshWindowsPrintersInBackground();
  const primaryThermal = resolveThermalPrinter(printers);

  console.log('📋 Detected Connected Thermal Printers:');
  if (printers.length === 0 && !isLanReachable) {
    console.log('   ⏸️  No physical USB/LAN printer plugged into this PC right now (Standby Mode).');
  } else {
    printers.forEach(p => {
      if (p === primaryThermal) {
        console.log('   🎯 ' + p + ' [PRIMARY ACTIVE HARDWARE PRINTER]');
      } else {
        console.log('   • ' + p);
      }
    });
  }

  console.log('\n🖨️ Active Output Device : "' + primaryThermal + '" (USB: ' + (isUsbPhysicallyConnected ? 'YES' : 'NO') + ', LAN: ' + (isLanReachable ? 'YES' : 'NO') + ')');
  console.log('🟢 Status: Listening for print orders from ' + CLOUD_SERVER_URL + '...\n');
}

init();
