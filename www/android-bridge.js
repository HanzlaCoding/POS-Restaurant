/**
 * BiteDash POS • Native Android Bluetooth Classic SPP Printer Bridge
 *
 * Target Hardware: 58mm Portable Direct Thermal Printers (e.g., Speed-X M450 / BT-450M / MPT-II)
 * Protocol: Bluetooth Classic Serial Port Profile (SPP / RFCOMM UUID 00001101-0000-1000-8000-00805F9B34FB)
 * Native Plugin: Capacitor `BiteDashPrinter` (com.artisangrill.pos.BiteDashPrinterPlugin)
 *
 * Strict Safety Guarantees:
 * - Never fakes a connection or print success in browser/non-native environments.
 * - Does not use Web Bluetooth inside Android WebView.
 * - Distinguishes pre-transmission failures ('FAILED') from mid-stream/timeout errors ('UNKNOWN')
 *   so the cashier never loses an order or prints accidental duplicates.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AndroidPOSBridge = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PAPER_WIDTH_CHARS = 32; // Standard 58mm thermal paper (48mm printable width, Font A = 32 cols)
  const CONNECT_TIMEOUT_MS = 12000;
  const PRINT_TIMEOUT_MS = 12000;

  // ESC/POS Command Constants
  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;

  const stateListeners = new Set();
  let nativeListenerAttached = false;

  function getNativePlugin() {
    if (typeof window === 'undefined') return null;
    if (
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform() &&
      window.Capacitor.Plugins &&
      window.Capacitor.Plugins.BiteDashPrinter
    ) {
      return window.Capacitor.Plugins.BiteDashPrinter;
    }
    return null;
  }

  function ensureNativeStateListener() {
    const plugin = getNativePlugin();
    if (!plugin || nativeListenerAttached || typeof plugin.addListener !== 'function') {
      return;
    }
    nativeListenerAttached = true;
    plugin.addListener('printerStateChanged', function (event) {
      stateListeners.forEach(function (listener) {
        try {
          listener(event);
        } catch (err) {
          console.error('[AndroidPOSBridge] Listener error:', err);
        }
      });
    });
  }

  function withTimeout(promise, ms, timeoutCode, timeoutMessage) {
    return new Promise(function (resolve, reject) {
      const timer = setTimeout(function () {
        const err = new Error(timeoutMessage || 'Operation timed out');
        err.code = timeoutCode || 'TIMEOUT';
        reject(err);
      }, ms);

      promise
        .then(function (val) {
          clearTimeout(timer);
          resolve(val);
        })
        .catch(function (err) {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Sanitizes a single token/label to printable 7-bit ASCII (0x20 - 0x7E).
   */
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

  /**
   * Preserves exact column alignment spaces while stripping non-ASCII characters
   * and clamping to 32-character 58mm thermal line width.
   */
  function toRawAsciiLine(str, maxWidth) {
    const w = maxWidth || PAPER_WIDTH_CHARS;
    if (!str) return '';
    return String(str)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[^\x20-\x7E]/g, '')
      .slice(0, w);
  }

  function padRight(str, len) {
    const s = String(str || '');
    return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
  }

  function padLeft(str, len) {
    const s = String(str || '');
    return s.length >= len ? s.slice(0, len) : ' '.repeat(len - s.length) + s;
  }

  function formatTwoColumns(leftText, rightText, totalWidth = 32) {
    const left = String(leftText || '').replace(/[^\x20-\x7E]/g, '');
    const right = String(rightText || '').replace(/[^\x20-\x7E]/g, '');
    const spacesNeeded = totalWidth - left.length - right.length;
    if (spacesNeeded > 0) {
      return left + ' '.repeat(spacesNeeded) + right;
    }
    // If too long, truncate left text to leave room for right amount
    const maxLeft = Math.max(1, totalWidth - right.length - 1);
    return left.substring(0, maxLeft) + ' ' + right;
  }

  function formatColumns(left, right, width) {
    return formatTwoColumns(left, right, width || PAPER_WIDTH_CHARS);
  }

  function uint8ToBase64(uint8Array) {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return window.btoa(binary);
  }

  function formatDateTimePK(dateObj) {
    const d = dateObj instanceof Date ? dateObj : new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return {
      date: day + '/' + month + '/' + year,
      time: String(hours).padStart(2, '0') + ':' + mins + ' ' + ampm
    };
  }

  function formatThreeColumns(itemText, qtyText, priceText) {
    const cleanItem = toPrintableAscii(itemText || '');
    const cleanQty = toPrintableAscii(qtyText || '');
    const cleanPrice = toPrintableAscii(priceText || '');

    const leftCol = cleanItem.slice(0, 16).padEnd(17, ' ');

    const qtyClipped = cleanQty.slice(0, 5);
    const padTotal = Math.max(0, 5 - qtyClipped.length);
    const padLeft = Math.floor(padTotal / 2);
    const padRight = padTotal - padLeft;
    const midCol = ' '.repeat(padLeft) + qtyClipped + ' '.repeat(padRight);

    const rightCol = cleanPrice.slice(0, 10).padStart(10, ' ');

    return (leftCol + midCol + rightCol).slice(0, PAPER_WIDTH_CHARS);
  }

  /**
   * Builds a 58mm (32-char width) ESC/POS Kitchen Order Ticket byte buffer.
   */
  function buildKotEscPosBytes(order) {
    const bytes = [];

    function pushCmd() {
      for (let i = 0; i < arguments.length; i++) {
        bytes.push(arguments[i] & 0xFF);
      }
    }

    function pushLine(text) {
      const clean = toRawAsciiLine(text, PAPER_WIDTH_CHARS);
      for (let i = 0; i < clean.length; i++) {
        bytes.push(clean.charCodeAt(i) & 0x7F);
      }
      bytes.push(LF);
    }

    const tokenNum = String(order.token || 0).padStart(3, '0');
    const customerRaw = toPrintableAscii(order.customer || '').toUpperCase().slice(0, 20);
    const dt = formatDateTimePK(order.timestamp ? new Date(order.timestamp) : new Date());
    const items = Array.isArray(order.items) ? order.items : [];
    const grandTotal = Math.round(Number(order.total || 0));

    // 1. Initialize printer & select standard PC437 character table
    pushCmd(ESC, 0x40);       // ESC @ (Reset)
    pushCmd(ESC, 0x74, 0x00); // ESC t 0 (PC437)

    // 2. Centered Header: Bold Shop Name + Bold TOKEN #XXX + Date/Time
    pushCmd(ESC, 0x61, 0x01); // Center align
    pushCmd(ESC, 0x45, 0x01); // Bold ON
    pushLine('STUDENT BURGER & SHAWARMA');
    pushCmd(GS, 0x21, 0x11);  // 2x width, 2x height (16 chars max per line)
    pushLine('TOKEN #' + tokenNum);
    pushCmd(GS, 0x21, 0x00);  // Normal size
    pushCmd(ESC, 0x45, 0x00); // Bold OFF
    pushLine(dt.date + ' | ' + dt.time);

    // 3. Left-Aligned Table
    pushCmd(ESC, 0x61, 0x00); // Left align
    if (customerRaw) {
      pushLine('CUSTOMER: ' + customerRaw);
    }
    pushLine('--------------------------------');
    pushCmd(ESC, 0x45, 0x01);
    pushLine(formatThreeColumns('ITEM', 'QTY', 'AMOUNT'));
    pushCmd(ESC, 0x45, 0x00);
    pushLine('--------------------------------');

    // 4. Ordered Line Items: Left-aligned Item, Centered Qty ("x1"), Right-aligned Price ("Rs. 150")
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const qty = Number(item.quantity || item.qty || 0);
      if (qty <= 0) continue;

      const nameAscii = toPrintableAscii(item.name || item.englishName || item.id).toUpperCase();
      const lineTotal = Math.round(Number(item.lineTotal || (qty * Number(item.unitPrice || item.price || 0))));
      pushLine(formatThreeColumns(nameAscii, 'x' + qty, 'Rs. ' + lineTotal));
    }

    // 5. Summary with Double Divider Lines
    pushLine('================================');
    pushCmd(ESC, 0x45, 0x01);
    pushLine(formatColumns('TOTAL BILL:', 'Rs. ' + grandTotal.toLocaleString('en-US'), PAPER_WIDTH_CHARS));
    pushCmd(ESC, 0x45, 0x00);
    pushLine('================================');

    // 6. End of bill: Clean paper feed (3 blank lines) + optional partial cut
    pushCmd(LF, LF, LF);
    pushCmd(GS, 0x56, 0x42, 0x00);

    return new Uint8Array(bytes);
  }

  /**
   * Builds a 58mm (32-char width) ESC/POS Test Print Slip byte buffer.
   */
  function buildTestSlipEscPosBytes(deviceName, deviceAddress) {
    const bytes = [];

    function pushCmd() {
      for (let i = 0; i < arguments.length; i++) {
        bytes.push(arguments[i] & 0xFF);
      }
    }

    function pushLine(text) {
      const clean = toRawAsciiLine(text, PAPER_WIDTH_CHARS);
      for (let i = 0; i < clean.length; i++) {
        bytes.push(clean.charCodeAt(i) & 0x7F);
      }
      bytes.push(LF);
    }

    const dt = formatDateTimePK(new Date());
    const safeName = toPrintableAscii(deviceName || 'BT Printer').slice(0, 22);
    const safeMac = toPrintableAscii(deviceAddress || 'N/A').slice(0, 20);

    pushCmd(ESC, 0x40);       // Reset
    pushCmd(ESC, 0x74, 0x00); // PC437
    pushCmd(ESC, 0x61, 0x01); // Center
    pushCmd(ESC, 0x45, 0x01); // Bold ON
    pushCmd(GS, 0x21, 0x11);  // 2x size
    pushLine('BITEDASH POS');
    pushCmd(GS, 0x21, 0x00);  // Normal size
    pushLine('58MM SPP PRINTER TEST OK');
    pushCmd(ESC, 0x45, 0x00); // Bold OFF
    pushLine('================================');

    pushCmd(ESC, 0x61, 0x00); // Left align
    pushLine('DEVICE : ' + safeName);
    pushLine('MAC    : ' + safeMac);
    pushLine('PROTO  : BT CLASSIC SPP (RFCOMM)');
    pushLine('DATE   : ' + dt.date + ' ' + dt.time);
    pushLine('--------------------------------');
    pushLine('32-COL WIDTH ALIGNMENT RULER:');
    pushLine('12345678901234567890123456789012');
    pushLine('================================');
    pushCmd(ESC, 0x61, 0x01); // Center
    pushLine('READY FOR KITCHEN KOT PRINTING');
    pushCmd(ESC, 0x61, 0x00);
    pushCmd(LF, LF, LF, LF);

    return new Uint8Array(bytes);
  }

  const Bridge = {
    /**
     * Returns true ONLY when running inside the native Android Capacitor app
     * with the BiteDashPrinter native plugin registered.
     */
    isNative: function () {
      return getNativePlugin() !== null;
    },

    getNativeType: function () {
      return this.isNative() ? 'capacitor-bitedash-spp' : 'browser-unsupported';
    },

    /**
     * Subscribe to real-time native printer connection state events.
     */
    onStateChange: function (callback) {
      if (typeof callback !== 'function') return function () {};
      ensureNativeStateListener();
      stateListeners.add(callback);
      return function () {
        stateListeners.delete(callback);
      };
    },

    /**
     * Query genuine Bluetooth & socket status from the native Android layer.
     */
    getStatus: async function () {
      const plugin = getNativePlugin();
      if (!plugin) {
        return {
          nativeAvailable: false,
          bluetoothSupported: false,
          permissionGranted: false,
          bluetoothEnabled: false,
          connected: false,
          deviceName: null,
          deviceAddress: null
        };
      }
      ensureNativeStateListener();
      const status = await plugin.getStatus();
      return {
        nativeAvailable: true,
        bluetoothSupported: !!status.bluetoothSupported,
        permissionGranted: !!status.permissionGranted,
        bluetoothEnabled: !!status.bluetoothEnabled,
        connected: !!status.connected,
        deviceName: status.deviceName || null,
        deviceAddress: status.deviceAddress || null
      };
    },

    /**
     * Request Android 12+ BLUETOOTH_CONNECT & BLUETOOTH_SCAN runtime permissions.
     */
    requestPermissions: async function () {
      const plugin = getNativePlugin();
      if (!plugin) {
        throw new Error('Native Android runtime is not active.');
      }
      return plugin.requestBluetoothPermissions();
    },

    /**
     * Open Android System Bluetooth Settings for initial printer pairing.
     */
    openBluetoothSettings: async function () {
      const plugin = getNativePlugin();
      if (!plugin) {
        throw new Error('Android Bluetooth Settings is only available inside the Android app.');
      }
      return plugin.openBluetoothSettings();
    },

    /**
     * List Bluetooth devices already paired/bonded in Android System Settings.
     * Sorts likely thermal printers to the top of the list.
     */
    listBondedDevices: async function () {
      const plugin = getNativePlugin();
      if (!plugin) {
        throw new Error('Native Android printer bridge is not available in a web browser.');
      }
      const res = await plugin.listBondedDevices();
      const devices = Array.isArray(res && res.devices) ? res.devices : [];
      return devices.sort(function (a, b) {
        if (Boolean(a.connected) !== Boolean(b.connected)) {
          return a.connected ? -1 : 1;
        }
        if (Boolean(a.isLikelyPrinter) !== Boolean(b.isLikelyPrinter)) {
          return a.isLikelyPrinter ? -1 : 1;
        }
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
    },

    /**
     * Fast boolean check for active Bluetooth SPP printer connection.
     */
    isConnected: async function () {
      const plugin = getNativePlugin();
      if (!plugin) return false;
      try {
        const status = await plugin.getStatus();
        return !!(status && status.connected);
      } catch (e) {
        return false;
      }
    },

    /**
     * Connect to a bonded printer's Bluetooth Classic SPP (RFCOMM) socket by MAC address.
     * Supports optional custom timeoutMs (e.g. 2000ms for Vyapar-style silent auto-connect).
     */
    connect: async function (address, timeoutMs) {
      const plugin = getNativePlugin();
      if (!plugin) {
        throw new Error('Native Android printer bridge is not available.');
      }
      if (!address || typeof address !== 'string') {
        throw new Error('Printer MAC address is required.');
      }
      ensureNativeStateListener();
      const waitMs = (typeof timeoutMs === 'number' && timeoutMs > 0) ? timeoutMs : CONNECT_TIMEOUT_MS;
      const result = await withTimeout(
        plugin.connect({ address: address.trim() }),
        waitMs,
        'CONNECT_TIMEOUT',
        'Printer off ya out of range hai'
      );
      if (result && result.connected) {
        try {
          localStorage.setItem('bitedash_last_printer_mac', result.address || address.trim());
          localStorage.setItem('bitedash_last_printer_name', result.name || 'Thermal Printer');
        } catch (e) {}
      }
      return result;
    },

    /**
     * Disconnect the active Bluetooth SPP socket.
     */
    disconnect: async function () {
      const plugin = getNativePlugin();
      if (!plugin) {
        return { connected: false };
      }
      return plugin.disconnect();
    },

    /**
     * Send raw Uint8Array ESC/POS bytes to the connected printer.
     */
    sendEscPosBytes: async function (uint8Array) {
      const plugin = getNativePlugin();
      if (!plugin) {
        const err = new Error('Native Android printer bridge is not installed.');
        err.code = 'NOT_NATIVE';
        throw err;
      }
      if (!(uint8Array instanceof Uint8Array) || uint8Array.byteLength === 0) {
        const err = new Error('ESC/POS byte payload is empty.');
        err.code = 'INVALID_DATA';
        throw err;
      }

      const base64Data = uint8ToBase64(uint8Array);
      return withTimeout(
        plugin.writeBase64({ data: base64Data }),
        PRINT_TIMEOUT_MS,
        'PRINT_TIMEOUT',
        'Print transmission timed out. Check printer paper and power before retrying.'
      );
    },

    /**
     * Print a 58mm verification test slip on the currently connected printer.
     */
    printTestSlip: async function () {
      const status = await this.getStatus();
      if (!status.nativeAvailable) {
        throw new Error('Test print requires the Android app with native Bluetooth bridge.');
      }
      if (!status.connected) {
        throw new Error('Printer is not connected. Select and connect a paired printer first.');
      }
      const bytes = buildTestSlipEscPosBytes(status.deviceName, status.deviceAddress);
      const res = await this.sendEscPosBytes(bytes);
      if (!res || res.status !== 'SUCCESS') {
        throw new Error('Printer did not confirm test slip transmission.');
      }
      return res;
    },

    /**
     * Print a Kitchen Order Ticket (KOT) and return:
     * - 'SUCCESS': All ESC/POS bytes were written and flushed to the connected SPP socket.
     * - 'FAILED': Pre-check failed before any bytes were transmitted (safe to retry immediately).
     * - 'UNKNOWN': Transmission failed mid-stream or timed out (check physical printer before retry).
     */
    printKOT: async function (orderJsonOrObject) {
      const plugin = getNativePlugin();
      if (!plugin) {
        return 'FAILED';
      }

      let order;
      try {
        order = typeof orderJsonOrObject === 'string'
          ? JSON.parse(orderJsonOrObject)
          : orderJsonOrObject;
      } catch (e) {
        console.error('[AndroidPOSBridge] Invalid order JSON:', e);
        return 'FAILED';
      }

      if (!order || !Array.isArray(order.items) || order.items.length === 0) {
        return 'FAILED';
      }

      // Verify socket is genuinely connected BEFORE attempting transmission
      try {
        const currentStatus = await plugin.getStatus();
        if (!currentStatus || !currentStatus.connected) {
          return 'FAILED';
        }
      } catch (e) {
        return 'FAILED';
      }

      const kotBytes = buildKotEscPosBytes(order);

      try {
        const res = await this.sendEscPosBytes(kotBytes);
        if (res && res.status === 'SUCCESS') {
          return 'SUCCESS';
        }
        return 'UNKNOWN';
      } catch (err) {
        const code = String((err && err.code) || '');
        const msg = String((err && err.message) || '');
        if (
          code === 'NOT_CONNECTED' ||
          code === 'INVALID_DATA' ||
          code === 'BT_DISABLED' ||
          code === 'PERMISSION_DENIED' ||
          msg.indexOf('not connected') !== -1
        ) {
          return 'FAILED';
        }
        console.error('[AndroidPOSBridge] Mid-stream or timeout print error:', err);
        return 'UNKNOWN';
      }
    },

    buildKotEscPosBytes: buildKotEscPosBytes,
    buildTestSlipEscPosBytes: buildTestSlipEscPosBytes,
    formatTwoColumns: formatTwoColumns
  };

  return Bridge;
}));
