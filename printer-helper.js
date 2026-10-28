/**
 * BiteDash POS - 58mm Thermal Printer Helper (ESC/POS Generator & 32-Column Grid)
 * Designed for standard 58mm Bluetooth Classic & BLE thermal printers.
 */

(function (global) {
  'use strict';

  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;
  const PAPER_WIDTH_CHARS = 32;

  const CMD = {
    INIT: [ESC, 0x40],
    ALIGN_CENTER: [ESC, 0x61, 0x01],
    ALIGN_LEFT: [ESC, 0x61, 0x00],
    ALIGN_RIGHT: [ESC, 0x61, 0x02],
    FONT_REGULAR: [GS, 0x21, 0x00],
    FONT_BOLD_ON: [ESC, 0x45, 0x01],
    FONT_BOLD_OFF: [ESC, 0x45, 0x00],
    FONT_LARGE_TOKEN: [GS, 0x21, 0x11],
    FEED_TEAR_OFF: [ESC, 0x64, 0x05] // Feed 5 lines (~18-20mm) to clear Speedx M450 physical tear-off blade
  };

  function toPrintableAscii(str) {
    if (!str) return '';
    return String(str)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatItemLinesFor58mm(rawName, qtyStr, amountStr) {
    const name = toPrintableAscii(rawName || 'Item');
    const col1Width = 18;
    const col2Width = 4;
    const col3Width = 10;

    const c2 = String(qtyStr || '').padStart(col2Width, ' ').slice(-col2Width);
    const c3 = String(amountStr || '').padStart(col3Width, ' ').slice(-col3Width);

    if (name.length <= col1Width) {
      return [name.padEnd(col1Width, ' ') + c2 + c3];
    }

    const words = name.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.length > col1Width) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        let rem = word;
        while (rem.length > col1Width) {
          lines.push(rem.slice(0, col1Width));
          rem = rem.slice(col1Width);
        }
        currentLine = rem;
        continue;
      }

      const testLine = currentLine ? (currentLine + ' ' + word) : word;
      if (testLine.length <= col1Width) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    if (lines.length <= 1) {
      return [lines[0].padEnd(col1Width, ' ') + c2 + c3];
    }

    const output = [];
    for (let i = 0; i < lines.length - 1; i++) {
      output.push(lines[i].padEnd(col1Width, ' '));
    }

    const lastLineText = '  ' + lines[lines.length - 1];
    const paddedLast = lastLineText.slice(0, col1Width).padEnd(col1Width, ' ');
    output.push(paddedLast + c2 + c3);

    return output;
  }

  /**
   * Builds the 58mm ESC/POS byte buffer for a customer bill / KOT slip.
   * Trailing feed is strictly limited to 1 line feed to prevent wasting paper roll.
   */
  function buildKotEscPosBytes(orderData, shopConfig) {
    const bytes = [];
    const cfg = shopConfig || (typeof global.shopConfig !== 'undefined' ? global.shopConfig : {}) || {};

    function appendBytes(arr) {
      for (let i = 0; i < arr.length; i++) bytes.push(arr[i] & 0xFF);
    }

    function appendText(str) {
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        bytes.push(code <= 0x7F ? code : 0x3F);
      }
    }

    function appendLine(str = '') {
      appendText(str + '\n');
    }

    const tokenStr = `#${String(orderData.token || 1).padStart(3, '0')}`;
    const dateObj = new Date(orderData.timestamp || Date.now());
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    let hours = dateObj.getHours();
    const mins = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const dateStr = `${day}/${month}/${year}`;
    const timeStr = `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;

    const DIVIDER_DASH = '--------------------------------';
    const DIVIDER_EQUAL = '================================';

    // 1. Header (Centered, Bold)
    appendBytes(CMD.INIT);
    appendBytes(CMD.ALIGN_CENTER);
    appendBytes(CMD.FONT_BOLD_ON);
    const shopName = (cfg.shopName || 'STUDENT BURGER').toUpperCase();
    appendLine(shopName.slice(0, 32));
    appendBytes(CMD.FONT_BOLD_OFF);
    appendLine(DIVIDER_DASH);

    // 2. Token (Centered Hero Section for Kitchen - Double Height & Width)
    appendBytes(CMD.ALIGN_CENTER);
    appendBytes(CMD.FONT_LARGE_TOKEN);
    appendLine(`TOKEN ${tokenStr}`);
    appendBytes(CMD.FONT_REGULAR);
    appendLine(DIVIDER_DASH);

    // 3. Order Metadata (Left Aligned)
    appendBytes(CMD.ALIGN_LEFT);
    appendLine(`Date: ${dateStr}  ${timeStr}`);
    if (orderData.customer && String(orderData.customer).trim()) {
      appendLine(`Customer: ${toPrintableAscii(orderData.customer).slice(0, 22)}`);
    }
    const isOnline = orderData.paymentMode === 'online' || String(orderData.paymentMode).toLowerCase() === 'online';
    appendLine(isOnline ? 'PAYMENT: ONLINE' : 'PAYMENT: CASH');
    if (orderData.isReprint) {
      appendLine('*** DUPLICATE / REPRINT ***');
    }
    appendLine(DIVIDER_EQUAL);

    // 4. Items Table (Fixed 32-Column Grid)
    appendBytes(CMD.FONT_BOLD_ON);
    appendLine('ITEM'.padEnd(18, ' ') + 'QTY'.padStart(4, ' ') + 'AMOUNT'.padStart(10, ' '));
    appendBytes(CMD.FONT_BOLD_OFF);
    appendLine(DIVIDER_DASH);

    (orderData.items || []).forEach(it => {
      const qty = Number(it.quantity || it.qty || 0);
      if (qty <= 0) return;
      const rawName = it.name || it.nameEn || it.englishName || it.id || 'Item';
      const qtyStr = `x${qty}`;
      const lineTotal = Math.round(Number(it.lineTotal != null ? it.lineTotal : (qty * Number(it.unitPrice || it.price || 0))));
      const priceStr = `Rs.${lineTotal}`;
      const lines = formatItemLinesFor58mm(rawName, qtyStr, priceStr);
      lines.forEach(line => appendLine(line));
    });

    appendLine(DIVIDER_DASH);

    // 5. Total Summary (Bold)
    appendBytes(CMD.FONT_BOLD_ON);
    const totalAmount = Math.round(Number(orderData.total || 0));
    appendLine('TOTAL:'.padEnd(16, ' ') + `Rs. ${totalAmount.toLocaleString()}`.padStart(16, ' '));
    appendBytes(CMD.FONT_BOLD_OFF);
    appendLine(DIVIDER_DASH);

    // 6. Footer (Centered) & EXACTLY 5-Line Tear-Off Feed (Clears Speedx M450 blade by ~5mm)
    appendBytes(CMD.ALIGN_CENTER);
    appendLine(cfg.footerNote || 'Thank You For Coming');
    appendBytes([ESC, 0x64, 0x05]); // Feed 5 lines (ESC d 5) to sit clear of metal teeth

    return new Uint8Array(bytes);
  }

  const PrinterHelper = {
    CMD: CMD,
    toPrintableAscii: toPrintableAscii,
    formatItemLinesFor58mm: formatItemLinesFor58mm,
    buildKotEscPosBytes: buildKotEscPosBytes
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrinterHelper;
  } else {
    global.PrinterHelper = PrinterHelper;
  }
})(typeof window !== 'undefined' ? window : globalThis);
