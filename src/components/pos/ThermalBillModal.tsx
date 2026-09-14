import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  Printer, 
  X, 
  ChefHat, 
  ReceiptText, 
  Settings2, 
  Sliders, 
  CheckCircle2, 
  Wifi, 
  Usb, 
  Filter, 
  Layers, 
  Store,
  Sparkles,
  Percent,
  Scissors,
  Send,
  RefreshCw,
  Download
} from 'lucide-react';
import { PrinterConfig, PrintTemplate, ThermalPaperWidth } from '../../types';

export const ThermalBillModal: React.FC = () => {
  const { printableReceipt, closePrintReceipt, data } = useRestaurant();

  const isCancelKot = printableReceipt?.receiptType === 'CANCEL_KOT';
  const isKot = isCancelKot || printableReceipt?.receiptType === 'KOT';
  const profile = data?.restaurantProfile;
  const restaurantName = profile?.name || 'BARCODE CAFE BANANI';
  const restaurantAddress = profile?.address || 'House #42, Road #11, Block D, Banani, Dhaka-1213';
  const restaurantHotline = profile?.phone || '+880 1700-000000';
  const restaurantBin = profile?.binOrVat || '0029381-01';

  // Format Date and Time
  const rawDt = printableReceipt?.dateTime || '';
  let receiptDateStr = '';
  let receiptTimeStr = '';
  if (rawDt.includes(',')) {
    const parts = rawDt.split(',');
    receiptDateStr = parts[0].trim();
    receiptTimeStr = parts.slice(1).join(',').trim();
  } else {
    const parts = rawDt.trim().split(/\s+/);
    if (parts.length >= 2) {
      receiptDateStr = parts[0];
      receiptTimeStr = parts.slice(1).join(' ');
    } else {
      receiptDateStr = rawDt;
      receiptTimeStr = '';
    }
  }

  // Available configured printers & templates
  const printers = (data?.printers && data.printers.length > 0) ? data.printers : [];
  const templates = (data?.printTemplates && data.printTemplates.length > 0) ? data.printTemplates : [];

  // Match items with their menu catalog department & category
  const enrichedItems = useMemo(() => {
    if (!printableReceipt) return [];

    const rawItems = (printableReceipt.receiptType === 'CANCEL_KOT' && printableReceipt.cancelledItems)
      ? printableReceipt.cancelledItems.map((c, i) => ({
          id: i + 9000,
          name: c?.name || 'Cancelled Item',
          price: c?.price || 0,
          qty: c?.qty || 1,
          department: c?.department || 'Main Kitchen',
          notes: c?.reason ? `Reason: ${c.reason}` : undefined,
          selectedVariation: undefined,
          selectedAddons: undefined
        }))
      : (Array.isArray(printableReceipt.items) ? printableReceipt.items : []);

    const menuCatalog = Array.isArray(data?.menuItems) ? data.menuItems : [];

    return rawItems.map(item => {
      if (!item) {
        return { name: 'Item', qty: 1, price: 0, department: 'Main Kitchen', category: 'General' };
      }
      const itemName = item.name ? String(item.name).trim() : '';
      const itemId = item.id != null ? String(item.id) : null;

      const menuObj = menuCatalog.find(m => {
        if (!m) return false;
        if (itemId && m.id != null && String(m.id) === itemId) return true;
        if (itemName && m.name && String(m.name).trim().toLowerCase() === itemName.toLowerCase()) return true;
        return false;
      });

      return {
        ...item,
        name: itemName || 'Item',
        qty: item.qty || 1,
        price: item.price || 0,
        department: item.department || menuObj?.department || 'Main Kitchen',
        category: item.category || menuObj?.category || 'Appetizers & Soup'
      };
    });
  }, [printableReceipt, data?.menuItems]);

  // Unique departments present in this order
  const orderDepartments = useMemo(() => {
    const set = new Set<string>();
    enrichedItems.forEach(i => {
      if (i && i.department) set.add(i.department);
    });
    return Array.from(set);
  }, [enrichedItems]);

  // Selected Department Filter (Default: If order has multiple departments, default to SPLIT_ALL so separate slips with auto-cut are ready immediately without extra clicks!)
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(() => {
    return orderDepartments.length > 1 ? 'SPLIT_ALL' : 'ALL';
  });

  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // Helper to match configured hardware printer for a specific department
  const getPrinterForDept = (dept: string): PrinterConfig | null => {
    return printers.find(p => p.isActive && p.type === 'KOT' && p.departments?.includes(dept))
      || printers.find(p => p.isActive && (p.type === 'KOT' || p.type === 'ALL') && p.isDefault)
      || printers.find(p => p.isActive && (p.type === 'KOT' || p.type === 'ALL'))
      || null;
  };

  // Initial matched printer
  const defaultMatchedPrinter = useMemo(() => {
    const targetType = isKot ? 'KOT' : 'BILL';
    const found = printers.find(p => p.isActive && (p.type === targetType || p.type === 'ALL'));
    return found || printers[0] || null;
  }, [printers, isKot]);

  // Initial matched template
  const defaultMatchedTemplate = useMemo(() => {
    const targetType = isKot ? 'KOT' : 'BILL';
    const found = templates.find(t => t.isActive && (t.templateType === targetType || t.templateType === 'BOTH'));
    return found || templates[0] || null;
  }, [templates, isKot]);

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(defaultMatchedPrinter?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultMatchedTemplate?.id || '');
  const [showConfigBar, setShowConfigBar] = useState<boolean>(false);

  // Switch tab and automatically align active hardware printer
  const handleSelectDept = (dept: string) => {
    setSelectedDeptFilter(dept);
    setDispatchSuccess(null);
    if (dept === 'ALL' || dept === 'SPLIT_ALL') {
      if (defaultMatchedPrinter) {
        setSelectedPrinterId(defaultMatchedPrinter.id);
      }
    } else {
      const mapped = getPrinterForDept(dept);
      if (mapped) {
        setSelectedPrinterId(mapped.id);
      }
    }
  };

  const handleDispatchAllStations = () => {
    const logs = orderDepartments.map(dept => {
      const p = getPrinterForDept(dept);
      const count = enrichedItems.filter(i => i.department === dept).length;
      const portInfo = p?.connectionType === 'LAN' ? `LAN ${p.ipAddress}:${p.port}` : `USB ${p?.usbPort || 'USB001'}`;
      return `• ${dept} (${count} item${count > 1 ? 's' : ''}) ➔ ${p?.name || 'Default KOT Printer'} [${portInfo}]`;
    });
    setDispatchSuccess(`Dispatched ${orderDepartments.length} KOT tickets simultaneously to respective station hardware:\n${logs.join('\n')}`);
  };

  const activePrinter = printers.find(p => p.id === selectedPrinterId) || defaultMatchedPrinter;
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || defaultMatchedTemplate;

  // Paper width from template or printer
  const paperWidth: ThermalPaperWidth = activeTemplate?.paperWidth || activePrinter?.paperWidth || '80mm';

  // Filter items based on selected department filter
  const displayedItems = useMemo(() => {
    if (selectedDeptFilter === 'ALL' || selectedDeptFilter === 'SPLIT_ALL') {
      return enrichedItems;
    }
    return enrichedItems.filter(i => i.department === selectedDeptFilter);
  }, [enrichedItems, selectedDeptFilter]);

  const displayedSubtotal = displayedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const [isPrinting, setIsPrinting] = useState(false);
  const [hardwarePrintStatus, setHardwarePrintStatus] = useState<string | null>(null);

  const handlePrint = async () => {
    setIsPrinting(true);
    setHardwarePrintStatus('🖨️ Printing receipt...');

    // Try background hardware print if local server is connected
    try {
      if (!isKot) {
        fetch('/api/hardware/print-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantName: printableReceipt.restaurantName || restaurantName,
            restaurantAddress: printableReceipt.restaurantAddress || restaurantAddress,
            restaurantHotline: printableReceipt.restaurantHotline || restaurantHotline,
            restaurantBin: printableReceipt.restaurantBin || restaurantBin,
            invoiceNo: printableReceipt.invoiceNo,
            dateTime: printableReceipt.dateTime,
            tableName: printableReceipt.tableName,
            tableZone: printableReceipt.tableZone,
            channelOrAgent: printableReceipt.channelOrAgent,
            waiter: printableReceipt.waiter,
            orderTakenBy: printableReceipt.orderTakenBy,
            settleBillRole: printableReceipt.settleBillRole,
            customer: printableReceipt.customer,
            items: displayedItems.map(i => ({
              name: i.name,
              qty: i.qty,
              price: i.price,
              variation: i.selectedVariation?.name,
              addons: i.selectedAddons?.map(a => a.name),
              notes: i.notes
            })),
            subtotal: displayedSubtotal,
            discountDeduction: printableReceipt.discountDeduction,
            discountType: printableReceipt.discountType,
            discountVal: printableReceipt.discountVal,
            netTotal: printableReceipt.netTotal,
            isSettled: printableReceipt.isSettled || false,
            paymentBreakdown: printableReceipt.paymentBreakdown,
            changeReturn: printableReceipt.changeReturn
          })
        }).catch(() => {});
      } else {
        const slipsToPrint = (selectedDeptFilter === 'ALL')
          ? [{
              station: 'Master KOT (All Stations)',
              items: displayedItems.map(i => ({
                name: i.name,
                qty: i.qty,
                variation: i.selectedVariation?.name,
                addons: i.selectedAddons?.map(a => a.name),
                notes: i.notes
              }))
            }]
          : [{
              station: selectedDeptFilter,
              targetPrinterName: getPrinterForDept(selectedDeptFilter)?.name,
              items: displayedItems.map(i => ({
                name: i.name,
                qty: i.qty,
                variation: i.selectedVariation?.name,
                addons: i.selectedAddons?.map(a => a.name),
                notes: i.notes
              }))
            }];

        fetch('/api/hardware/print-kot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: printableReceipt.tableName,
            tableZone: printableReceipt.tableZone,
            waiter: printableReceipt.waiter,
            customer: printableReceipt.customer,
            invoiceNo: printableReceipt.invoiceNo,
            dateTime: printableReceipt.dateTime,
            slips: slipsToPrint
          })
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Hardware print dispatch warning:', e);
    }

    setIsPrinting(false);
    setHardwarePrintStatus(null);

    // Always trigger browser thermal print
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const generateReceiptHtml = () => {
    if (!printableReceipt) return '';

    if (isKot) {
      const kotItemsHtml = displayedItems.map(item => `
        <tr style="border-bottom: 1px dashed #cbd5e1; font-size: 11.5px;">
          <td style="padding: 6px 0; text-align: left; vertical-align: top;">
            <div style="font-weight: bold; font-size: 13px; color: ${isCancelKot ? '#b91c1c; text-decoration: line-through;' : '#0f172a;'}">${item.name}</div>
            ${item.selectedVariation?.name ? `<div style="font-size: 10px; color: #1d4ed8; font-weight: 600;">• Cut: ${item.selectedVariation.name}</div>` : ''}
            ${item.selectedAddons && item.selectedAddons.length > 0 ? `<div style="font-size: 9.5px; color: #92400e;">+ Extras: ${item.selectedAddons.map((a: any) => a.name).join(', ')}</div>` : ''}
            ${item.notes ? `<div style="font-size: 9.5px; color: #dc2626; font-style: italic; font-weight: 600;">📝 Note: ${item.notes}</div>` : ''}
          </td>
          <td style="padding: 6px 0; text-align: right; vertical-align: top; font-weight: 900; font-size: 14px; color: #0f172a;">${item.qty}x</td>
        </tr>
      `).join('');

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${isCancelKot ? 'VOID_KOT' : 'KOT'}_${printableReceipt.invoiceNo}</title>
          <style>
            @page { size: ${paperWidth === '58mm' ? '58mm' : '80mm'} auto; margin: 3mm; }
            @media print { body { margin: 0; padding: 0; } }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0 auto;
              padding: 6px;
              max-width: ${paperWidth === '58mm' ? '54mm' : '78mm'};
              background: #fff;
              font-size: 11px;
              line-height: 1.35;
            }
            .header { text-align: center; border-bottom: 1.5px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
            .station { font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 0 0 2px 0; }
            .kot-no { font-size: 12px; font-weight: 700; color: #334155; }
            .badge { display: inline-block; padding: 3px 8px; background: #000; color: #fff; border-radius: 4px; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-top: 4px; }
            .cancel-badge { background: #dc2626; color: #fff; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; font-size: 11px; }
            .info-table td { padding: 1.5px 0; }
            .table-highlight { font-size: 13px; font-weight: 900; color: #000; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
            .items-table th { border-bottom: 1.5px dashed #000; padding: 3px 0; font-size: 10.5px; text-transform: uppercase; }
            .footer { text-align: center; font-size: 10px; color: #64748b; margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="station">STATION: ${selectedDeptFilter === 'ALL' ? 'MAIN KITCHEN' : selectedDeptFilter.toUpperCase()}</div>
            <div class="kot-no">${isCancelKot ? 'VOID KOT #' : 'KOT #'} ${printableReceipt.invoiceNo}</div>
            ${isCancelKot ? '<div class="badge cancel-badge">⚠️ CANCELLED / VOID ORDER</div>' : '<div class="badge">KITCHEN ORDER TICKET</div>'}
          </div>
          <table class="info-table">
            <tr>
              <td style="font-weight: 600;">TABLE:</td>
              <td class="table-highlight" style="text-align: right;">${printableReceipt.tableName}${printableReceipt.tableZone ? ` (${printableReceipt.tableZone})` : ''}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">TIME:</td>
              <td style="text-align: right; font-weight: 600;">${printableReceipt.dateTime || receiptTimeStr || receiptDateStr}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">WAITER:</td>
              <td style="text-align: right; font-weight: 600;">${printableReceipt.waiter || 'Staff'}</td>
            </tr>
            ${printableReceipt.customer && printableReceipt.customer !== 'Walk-in Customer' ? `
            <tr>
              <td style="color: #64748b;">CUSTOMER:</td>
              <td style="text-align: right; font-weight: 600;">${printableReceipt.customer}</td>
            </tr>
            ` : ''}
          </table>
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">FOOD ITEM</th>
                <th style="text-align: right;">QTY</th>
              </tr>
            </thead>
            <tbody>
              ${kotItemsHtml}
            </tbody>
          </table>
          <div class="footer">
            *** END OF KOT SLIP ***
          </div>
        </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt_${printableReceipt.invoiceNo}</title>
        <style>
          @page {
            size: ${paperWidth === '58mm' ? '58mm' : '80mm'} auto;
            margin: 4mm;
          }
          @media print {
            body { margin: 0; padding: 0; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0 auto;
            padding: 10px 8px;
            max-width: ${paperWidth === '58mm' ? '54mm' : '78mm'};
            background: #fff;
            font-size: 11px;
            line-height: 1.35;
          }
          .header { text-align: center; border-bottom: 1px dashed #94a3b8; padding-bottom: 8px; margin-bottom: 8px; }
          .res-name { font-size: 15px; font-weight: 900; text-transform: uppercase; margin: 0 0 3px 0; color: #0f172a; letter-spacing: 0.3px; }
          .res-sub { font-size: 10px; color: #475569; margin: 1px 0; }
          .badge { display: inline-block; padding: 2px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 5px; color: #0f172a; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; font-size: 10.5px; }
          .info-table td { padding: 1.5px 0; }
          .info-label { color: #64748b; }
          .info-val { font-weight: 600; text-align: right; color: #0f172a; }
          .table-box { background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 800; color: #78350f; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          .items-table th { border-bottom: 1px dashed #94a3b8; padding: 4px 0; font-size: 10px; text-transform: uppercase; color: #475569; }
          .totals-table { width: 100%; border-collapse: collapse; border-top: 1px dashed #94a3b8; border-bottom: 1px dashed #94a3b8; padding: 6px 0; margin-bottom: 8px; }
          .totals-table td { padding: 2.5px 0; }
          .net-total-row td { font-size: 13px; font-weight: 900; color: #0f172a; padding-top: 4px; }
          .payments { border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; margin-bottom: 8px; font-size: 10px; color: #334155; }
          .footer { text-align: center; font-size: 9.5px; color: #64748b; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="res-name">${restaurantName}</div>
          <div class="res-sub">${restaurantAddress}</div>
          <div class="res-sub">Hotline: ${restaurantHotline} • BIN: ${restaurantBin}</div>
          <div class="badge">${titleText}</div>
        </div>

        <table class="info-table">
          <tr>
            <td class="info-label">Invoice No:</td>
            <td class="info-val font-mono">${printableReceipt.invoiceNo}</td>
          </tr>
          <tr>
            <td class="info-label">Date : ${receiptDateStr}</td>
            <td class="info-val" style="text-align: right;">Time: ${receiptTimeStr}</td>
          </tr>
          <tr>
            <td class="info-label">Table & Zone:</td>
            <td class="info-val"><span class="table-box">${printableReceipt.tableName} (${printableReceipt.tableZone || 'Floor 1'})</span></td>
          </tr>
          ${printableReceipt.channelOrAgent ? `
            <tr>
              <td class="info-label">Channel:</td>
              <td class="info-val">${printableReceipt.channelOrAgent}</td>
            </tr>
          ` : ''}
          <tr>
            <td class="info-label">Waiter:</td>
            <td class="info-val">${printableReceipt.waiter || 'Staff'}</td>
          </tr>
          <tr>
            <td class="info-label">Order Taken By:</td>
            <td class="info-val">${printableReceipt.orderTakenBy || printableReceipt.waiter || 'Staff'}</td>
          </tr>
          <tr>
            <td class="info-label">Bill Settled By:</td>
            <td class="info-val">${printableReceipt.isSettled ? (printableReceipt.settleBillRole || 'Cashier') : (printableReceipt.settleBillRole || '')}</td>
          </tr>
          <tr>
            <td class="info-label">Customer:</td>
            <td class="info-val">${printableReceipt.customer || 'Walk-in Customer'}</td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align: left; width: 46%;">Item</th>
              <th style="text-align: center; width: 14%;">Qty</th>
              <th style="text-align: right; width: 18%;">Price</th>
              <th style="text-align: right; width: 22%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="color: #475569;">Subtotal:</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">৳${Number(displayedSubtotal).toFixed(2)}</td>
          </tr>
          ${printableReceipt.discountDeduction > 0 ? `
            <tr style="color: #059669;">
              <td>Discount ${printableReceipt.discountType === 'percent' ? `(${printableReceipt.discountVal}%)` : ''}:</td>
              <td style="text-align: right; font-family: monospace;">-৳${Number(printableReceipt.discountDeduction).toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr class="net-total-row">
            <td>Net Total:</td>
            <td style="text-align: right; font-family: monospace;">৳${Number(printableReceipt.netTotal).toFixed(2)}</td>
          </tr>
        </table>

        ${payments.length > 0 ? `
          <div class="payments">
            <div style="font-weight: bold; margin-bottom: 2px;">Payment Breakdown:</div>
            <div>${payments.join(' • ')}</div>
            ${printableReceipt.changeReturn !== undefined && printableReceipt.changeReturn > 0 ? `
              <div style="margin-top: 2px; font-weight: bold; color: #059669;">Change Given: ৳${Number(printableReceipt.changeReturn).toFixed(2)}</div>
            ` : ''}
          </div>
        ` : ''}

        <div class="footer">
          <p style="margin: 0; font-weight: 600;">${activeTemplate?.footerMessage || `Thank you for dining at ${restaurantName}!`}</p>
          <p style="margin: 2px 0 0 0; font-size: 8.5px;">${activeTemplate?.footerNotes || 'Powered by Barcode Cafe ERP • All VAT & Taxes Included'}</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleExportPdf = () => {
    window.print();
  };

  // Reusable layout for rendering single KOT slip or individual department slips in split mode
  const renderKotTicketLayout = (
    itemsList: typeof enrichedItems,
    deptLabel?: string,
    ticketPrinter?: PrinterConfig | null,
    ticketIndex?: number,
    totalTickets?: number
  ) => {
    return (
      <div>
        {/* Clean, Uniform KOT Header */}
        <div className="text-center pb-2 border-b border-dashed border-slate-700 space-y-0.5">
          {deptLabel && deptLabel !== 'ALL' && (
            <div className="font-bold text-xs uppercase text-slate-900 tracking-wide">
              STATION: {deptLabel}
            </div>
          )}
          <div className="font-semibold text-xs text-slate-700">
            {isCancelKot ? 'VOID KOT #' : 'KOT #'} {printableReceipt.invoiceNo}{ticketIndex ? `-${ticketIndex}` : ''}
          </div>
        </div>

        {/* Cancel Warning Box if Cancel Kot */}
        {isCancelKot && (
          <div className="my-2 p-1.5 bg-rose-600 text-white rounded text-center text-xs font-bold">
            ⚠️ DO NOT PREPARE / CANCELLED ORDER
          </div>
        )}

        {/* Table & Zone Box */}
        <div className="my-2 p-1.5 bg-amber-50/80 border border-amber-200 rounded text-center text-xs font-bold text-slate-900">
          Table: {printableReceipt.tableName}{printableReceipt.tableZone ? ` (${printableReceipt.tableZone})` : ''}
          {printableReceipt.channelOrAgent && ` • ${printableReceipt.channelOrAgent}`}
        </div>

        {/* Meta details */}
        <div className="py-1.5 border-b border-dashed border-slate-300 text-xs space-y-1">
          {activeTemplate?.showDateTime !== false && (
            <div className="flex justify-between">
              <span className="text-slate-500">Time:</span>
              <span className="font-semibold text-slate-800">{printableReceipt.dateTime}</span>
            </div>
          )}
          {activeTemplate?.showWaiter !== false && (
            <div className="flex justify-between">
              <span className="text-slate-500">Server / Waiter:</span>
              <span className="font-semibold text-slate-800">{printableReceipt.waiter || 'Staff'}</span>
            </div>
          )}
          {activeTemplate?.showCustomer !== false && printableReceipt.customer && printableReceipt.customer !== 'Walk-in Customer' && (
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[150px]">{printableReceipt.customer}</span>
            </div>
          )}
          {isCancelKot && printableReceipt.voidAuthorizedBy && (
            <div className="flex justify-between py-0.5 bg-rose-50 px-1 rounded">
              <span className="text-rose-700 font-bold">Authorized By:</span>
              <span className="font-bold text-rose-900">{printableReceipt.voidAuthorizedBy}</span>
            </div>
          )}
          {isCancelKot && printableReceipt.voidReason && (
            <div className="flex justify-between py-0.5 bg-rose-50 px-1 rounded">
              <span className="text-rose-700 font-bold">Void Reason:</span>
              <span className="font-bold text-rose-900 truncate max-w-[160px]">{printableReceipt.voidReason}</span>
            </div>
          )}
        </div>

        {/* Food Items Table with Uniform Font Sizes */}
        <div className="py-2 border-b border-dashed border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 font-semibold text-xs">
                <th className="py-1">Food Item &amp; Customization</th>
                <th className="py-1 text-right">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemsList.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 text-xs">
                    <div className={`font-bold ${isCancelKot ? 'text-rose-900 line-through' : 'text-slate-900'}`}>
                      {item.name}
                    </div>
                    {item.selectedVariation && (
                      <div className="text-xs text-blue-700">
                        • Cut: {item.selectedVariation.name}
                      </div>
                    )}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="text-xs text-amber-800">
                        • Extras: {item.selectedAddons.map(a => a.name).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs italic text-rose-600">
                        • Note: {item.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-bold text-xs text-slate-900 align-top">
                    {item.qty}x {isCancelKot ? 'VOID' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const isDirect = printableReceipt?.isDirectPrint;

  React.useEffect(() => {
    if (isDirect) {
      closePrintReceipt();
    }
  }, [isDirect]);

  if (!printableReceipt || isDirect) return null;

  return (
    <div 
      id="printModalBackdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
    >
      <div 
        id="printModalContainer" 
        className={`bg-white rounded-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] transition-all duration-200 ${
          paperWidth === '58mm' ? 'max-w-sm' : 'max-w-md'
        }`}
      >
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="p-4 border-b border-slate-200 no-print space-y-3 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCancelKot ? (
                <div className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-black flex items-center gap-1.5 shadow-sm text-xs">
                  <ChefHat className="w-4 h-4 animate-bounce" />
                  <span>VOID KOT (CANCELLED)</span>
                </div>
              ) : isKot ? (
                <div className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-black flex items-center gap-1.5 shadow-sm text-xs">
                  <ChefHat className="w-4 h-4" />
                  <span>KOT Ticket</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#004b9b] font-bold text-xs border border-blue-200 shadow-xs">
                  <ReceiptText className="w-3.5 h-3.5" />
                  <span>Bill / Memo</span>
                </div>
              )}

              <div className="text-xs font-bold text-slate-800">
                <span>{printableReceipt.tableName}</span>
                <span className="text-slate-400 font-normal ml-1">({paperWidth})</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowConfigBar(!showConfigBar)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  showConfigBar 
                    ? 'bg-[#004b9b] text-white border-[#004b9b]' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Toggle Printer & Template Routing"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Routing</span>
              </button>

              <button
                id="close-thermal-receipt"
                onClick={closePrintReceipt}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Hardware Routing Toolbar (Collapsible or visible) */}
          {showConfigBar && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs animate-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 text-[10px] mb-1 flex items-center gap-1">
                    <Printer className="w-3 h-3 text-blue-600" />
                    Target Hardware Printer:
                  </label>
                  <select
                    value={selectedPrinterId}
                    onChange={e => setSelectedPrinterId(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#004b9b]"
                  >
                    {printers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.connectionType} • {p.paperWidth}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-[10px] mb-1 flex items-center gap-1">
                    <ReceiptText className="w-3 h-3 text-[#004b9b]" />
                    Print Template:
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#004b9b]"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} [{t.paperWidth}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Printer Details pill */}
              {activePrinter && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
                  <div className="flex items-center gap-1">
                    {activePrinter.connectionType === 'LAN' ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <Wifi className="w-2.5 h-2.5" /> LAN: {activePrinter.ipAddress || '192.168.1.100'}:{activePrinter.port || 9100}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        <Usb className="w-2.5 h-2.5" /> USB: {activePrinter.usbPort || 'USB001'}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-700">Paper: {paperWidth}</span>
                </div>
              )}
            </div>
          )}

          {/* Hardware Print Feedback Alert */}
          {hardwarePrintStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hardware Printer Status:</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-200 font-mono text-[11px] text-slate-800 whitespace-pre-line leading-relaxed font-bold">
                {hardwarePrintStatus}
              </div>
            </div>
          )}

          {/* Department filter tabs for KOT routing */}
          {isKot && orderDepartments.length > 1 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3 text-amber-500" />
                  Kitchen Station Routing:
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {orderDepartments.length} Stations Active
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
                {/* 1. Split All Button (Single printer auto-split cuts) */}
                <button
                  type="button"
                  onClick={() => handleSelectDept('SPLIT_ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition flex flex-col items-start cursor-pointer border ${
                    selectedDeptFilter === 'SPLIT_ALL'
                      ? 'bg-rose-700 text-white border-rose-700 shadow-xs ring-2 ring-rose-400/50'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Split into separate slips with auto-cut for each station"
                >
                  <span className="text-xs flex items-center gap-1">
                    <Scissors className="w-3 h-3 text-amber-300" />
                    Separate Slips ({orderDepartments.length} Slips)
                  </span>
                  <span className="text-[9px] opacity-80 font-normal">Auto-Cut per Dept</span>
                </button>

                {/* 2. Master KOT Button (Single Combined Slip) */}
                <button
                  type="button"
                  onClick={() => handleSelectDept('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition flex flex-col items-start cursor-pointer border ${
                    selectedDeptFilter === 'ALL'
                      ? 'bg-[#004b9b] text-white border-[#004b9b] shadow-xs ring-2 ring-blue-400/50'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Master KOT: All items in 1 combined slip"
                >
                  <span className="text-xs">Combined Slip ({enrichedItems.length})</span>
                  <span className="text-[9px] opacity-75 font-normal">Master KOT (1 Slip)</span>
                </button>

                {/* 3. Individual Department Station Tabs */}
                {orderDepartments.map(dept => {
                  const count = enrichedItems.filter(i => i.department === dept).length;
                  const deptPrinter = getPrinterForDept(dept);
                  const isSelected = selectedDeptFilter === dept;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleSelectDept(dept)}
                      className={`px-2.5 py-1.5 rounded-xl font-bold shrink-0 transition flex flex-col items-start cursor-pointer border ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={`Station: ${dept}`}
                    >
                      <span className="text-xs">{dept} ({count})</span>
                      <span className="text-[9px] opacity-85 font-mono truncate max-w-[130px]">
                        ➔ {deptPrinter?.name || 'Default Printer'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Printable Thermal Receipt / KOT Body */}
        <div 
          id="printReceiptModal" 
          className={`flex-1 overflow-y-auto my-2 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-900 font-mono text-xs mx-4 custom-scrollbar ${
            paperWidth === '58mm' ? 'max-w-[280px] mx-auto text-[11px]' : 'max-w-[360px] mx-auto text-xs'
          }`}
        >
          {isKot ? (
            /* ===== KITCHEN ORDER TICKET (KOT / VOID KOT) LAYOUT ===== */
            selectedDeptFilter === 'SPLIT_ALL' ? (
              <div className="space-y-6 print:space-y-0">
                {orderDepartments.map((dept, idx) => {
                  const deptItems = enrichedItems.filter(i => i.department === dept);
                  if (deptItems.length === 0) return null;
                  const deptPrinter = getPrinterForDept(dept);
                  return (
                    <div 
                      key={dept} 
                      className="kot-slip-page bg-white p-3 rounded-xl border border-dashed border-slate-300 shadow-xs print:p-0 print:border-none print:shadow-none"
                    >
                      {idx > 0 && (
                        <div className="no-print -mt-1.5 mb-3 py-1 px-2 bg-amber-50 border border-dashed border-amber-300 rounded text-center text-[10px] font-bold text-amber-900 flex items-center justify-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-amber-600" />
                          <span>✂️ Thermal Paper Auto-Cut ({dept})</span>
                        </div>
                      )}
                      {renderKotTicketLayout(deptItems, dept, deptPrinter, idx + 1, orderDepartments.length)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="kot-slip-page bg-white p-1 print:p-0">
                {renderKotTicketLayout(
                  displayedItems, 
                  selectedDeptFilter === 'ALL' ? undefined : selectedDeptFilter, 
                  activePrinter
                )}
              </div>
            )
          ) : (
            /* ===== CUSTOMER BILL / CASH MEMO LAYOUT ===== */
            <div>
              {/* Restaurant Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                {activeTemplate?.showLogo !== false && profile?.logoUrl && (
                  <div className="flex justify-center mb-1.5">
                    <img 
                      src={profile.logoUrl} 
                      alt="Logo" 
                      className="h-10 max-w-[140px] object-contain grayscale"
                    />
                  </div>
                )}
                <h2 className="font-extrabold text-base tracking-tight font-sans text-slate-900 uppercase">
                  {restaurantName}
                </h2>
                {activeTemplate?.showAddress !== false && (
                  <p className="text-[11px] text-slate-600 font-sans">
                    {restaurantAddress}
                  </p>
                )}
                {activeTemplate?.showPhone !== false && (
                  <p className="text-[10px] text-slate-500 font-sans">
                    Hotline: {restaurantHotline}
                  </p>
                )}
                {activeTemplate?.showBinVat !== false && restaurantBin && (
                  <p className="text-[10px] text-slate-500 font-sans">
                    BIN / VAT Reg: {restaurantBin}
                  </p>
                )}
                <div className="mt-2 inline-block px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-bold uppercase tracking-wider font-sans">
                  {activeTemplate?.headerTitle || (printableReceipt.isSettled ? 'PAID CASH MEMO' : 'TABLE RUNNING BILL')}
                </div>
              </div>

              {/* Invoice Info with Table & Zone */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice No:</span>
                  <span className="font-bold">{printableReceipt.invoiceNo}</span>
                </div>
                {activeTemplate?.showDateTime !== false && (
                  <div className="flex justify-between">
                    <span><span className="text-slate-500">Date :</span> <span className="font-semibold text-slate-800">{receiptDateStr}</span></span>
                    <span><span className="text-slate-500">Time:</span> <span className="font-semibold text-slate-800">{receiptTimeStr}</span></span>
                  </div>
                )}
                {activeTemplate?.showTableZone !== false && (
                  <div className="flex justify-between items-center py-0.5 bg-amber-50/80 px-1 rounded">
                    <span className="text-slate-700 font-semibold">Table & Zone:</span>
                    <span className="font-black text-amber-950 font-sans">
                      {printableReceipt.tableName} ({printableReceipt.tableZone || 'Floor 1'})
                    </span>
                  </div>
                )}
                {printableReceipt.channelOrAgent && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Channel:</span>
                    <span className="font-bold text-amber-900 font-sans">{printableReceipt.channelOrAgent}</span>
                  </div>
                )}
                {activeTemplate?.showWaiter !== false && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waiter:</span>
                    <span>{printableReceipt.waiter}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Taken By:</span>
                  <span className="font-semibold">{printableReceipt.orderTakenBy || printableReceipt.waiter || 'Staff'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Settled By:</span>
                  <span className="font-bold text-slate-800">{printableReceipt.isSettled ? (printableReceipt.settleBillRole || 'Cashier') : (printableReceipt.settleBillRole || '')}</span>
                </div>
                {activeTemplate?.showCustomer !== false && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="truncate max-w-[150px] font-medium">{printableReceipt.customer}</span>
                  </div>
                )}
              </div>

              {/* Itemized Table */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 text-xs">
                      <th className="py-1 w-[46%] text-left">Item</th>
                      <th className="py-1 w-[14%] text-center">Qty</th>
                      <th className="py-1 w-[18%] text-right font-mono">Price</th>
                      <th className="py-1 w-[22%] text-right font-mono">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedItems.map((item, idx) => (
                      <tr key={idx} className="py-1.5">
                        <td className="py-1.5 w-[46%] pr-1 font-sans">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          {item.selectedVariation && (
                            <div className="text-[10px] text-blue-600 font-medium">{item.selectedVariation.name}</div>
                          )}
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="text-[9px] text-slate-500">+{item.selectedAddons.map(a => a.name).join(', ')}</div>
                          )}
                          {item.notes && (
                            <div className="text-[9px] text-amber-700 italic">📝 {item.notes}</div>
                          )}
                        </td>
                        <td className="py-1.5 w-[14%] text-center font-bold text-slate-800">{item.qty}</td>
                        <td className="py-1.5 w-[18%] text-right font-mono text-slate-700">৳{Number(item.price).toFixed(2)}</td>
                        <td className="py-1.5 w-[22%] text-right font-mono font-bold text-slate-900">৳{Number(item.price * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation */}
              <div className="py-2 space-y-1.5 text-xs border-b border-dashed border-slate-400">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Subtotal:</span>
                  <span className="font-bold font-mono text-slate-900">৳{Number(displayedSubtotal).toFixed(2)}</span>
                </div>

                {printableReceipt.discountDeduction > 0 && (
                  <div className="flex justify-between items-center text-emerald-700">
                    <span>
                      Discount 
                      {printableReceipt.discountType === 'percent' ? ` (${printableReceipt.discountVal}%)` : ''}:
                    </span>
                    <span className="font-mono font-semibold">- ৳{Number(printableReceipt.discountDeduction).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-300">
                  <span>Net Total:</span>
                  <span className="font-mono text-base font-black text-amber-600">৳{Number(printableReceipt.netTotal).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Breakdown (if settled) */}
              {activeTemplate?.showPaymentBreakdown !== false && printableReceipt.paymentBreakdown && (
                <div className="py-2 text-[11px] border-b border-dashed border-slate-300 space-y-1">
                  <div className="text-slate-500 font-semibold mb-1">Payment Method Details:</div>
                  {printableReceipt.paymentBreakdown.cash ? (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Cash Received:</span>
                      <span className="font-mono font-semibold text-slate-800">৳{Number(printableReceipt.paymentBreakdown.cash).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {printableReceipt.paymentBreakdown.card ? (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Card:</span>
                      <span className="font-mono font-semibold text-slate-800">৳{Number(printableReceipt.paymentBreakdown.card).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {printableReceipt.paymentBreakdown.bkash ? (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">bKash:</span>
                      <span className="font-mono font-semibold text-slate-800">৳{Number(printableReceipt.paymentBreakdown.bkash).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {printableReceipt.paymentBreakdown.nagad ? (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Nagad:</span>
                      <span className="font-mono font-semibold text-slate-800">৳{Number(printableReceipt.paymentBreakdown.nagad).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {printableReceipt.paymentBreakdown.due ? (
                    <div className="flex justify-between items-center text-amber-800 font-bold">
                      <span>Customer Due:</span>
                      <span className="font-mono font-bold">৳{Number(printableReceipt.paymentBreakdown.due).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {printableReceipt.changeReturn !== undefined && printableReceipt.changeReturn > 0 && (
                    <div className="flex justify-between items-center font-bold text-emerald-800 pt-1 border-t border-slate-200">
                      <span>Change Given:</span>
                      <span className="font-mono">৳{Number(printableReceipt.changeReturn).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Note */}
              <div className="text-center pt-3 text-[10px] text-slate-500 font-sans">
                <p className="font-semibold text-slate-700">
                  {activeTemplate?.footerMessage || `Thank you for dining at ${restaurantName}!`}
                </p>
                <p>
                  {activeTemplate?.footerNotes || 'Powered by Barcode Cafe ERP • All VAT & Taxes Included'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons (Hidden in Print) */}
        <div className="p-4 border-t border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-2.5 no-print bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={closePrintReceipt}
            className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 text-xs transition cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            id="btn-trigger-print"
            disabled={isPrinting}
            onClick={handlePrint}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              isKot
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-[#004b9b] hover:bg-[#005bb8] text-white'
            }`}
          >
            {isPrinting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Printing...</span>
              </span>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                <span>
                  {isCancelKot 
                    ? `Print Cancel KOT (${paperWidth})` 
                    : isKot 
                      ? selectedDeptFilter === 'SPLIT_ALL'
                        ? `Print KOT (${orderDepartments.length} slips auto-cut)`
                        : selectedDeptFilter === 'ALL'
                          ? `Print Master KOT (${paperWidth})`
                          : `Print ${selectedDeptFilter} Slip (${paperWidth})`
                      : `Print Bill (${paperWidth})`}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            id="btn-export-receipt-pdf"
            onClick={handleExportPdf}
            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Export and Save Receipt as clean PDF"
          >
            <Download className="w-4 h-4" />
            <span>Export to PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
