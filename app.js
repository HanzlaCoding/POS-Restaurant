/**
 * The Artisan Grill & Co. • Speed-Pad Touch POS (High-Throughput Cashier System)
 * Ergonomics: Fixed 4x3 Speed Pad • Zero Scroll • Zero Tabs • Muscle Memory
 * Color Coding: Red/Orange = Burgers, Yellow = Sides/Fries, Blue/Green = Drinks
 */

// ============================================================================
// 1. TOP 12 MOST-SOLD ITEMS (FIXED SPEED-DIAL COORDINATES)
// ============================================================================
const SPEED_ITEMS = [
  // --- ROW 1: BURGERS (Red / Vermilion Tiles) ---
  {
    id: 'sp-01',
    code: 'B1',
    hotkey: '1',
    name: 'Wagyu Smash Burger',
    shortName: 'WAGYU SMASH',
    category: 'burger',
    image: 'assets/images/wagyu_smash.jpg',
    price: 1490
  },
  {
    id: 'sp-02',
    code: 'B2',
    hotkey: '2',
    name: 'Smoked Truffle Burger',
    shortName: 'SMOKED TRUFFLE',
    category: 'burger',
    image: 'assets/images/truffle_burger.jpg',
    price: 1350
  },
  {
    id: 'sp-03',
    code: 'B3',
    hotkey: '3',
    name: 'Crispy Jalapeno Burger',
    shortName: 'JALAPENO BURGER',
    category: 'burger',
    image: 'assets/images/jalapeno_burger.jpg',
    price: 1190
  },
  {
    id: 'sp-04',
    code: 'B4',
    hotkey: '4',
    name: 'Double Cheese Burger',
    shortName: 'DOUBLE CHEESE',
    category: 'burger',
    image: 'assets/images/double_cheese.jpg',
    price: 1090
  },

  // --- ROW 2: FRIES & SIDES (Yellow / Amber Tiles) ---
  {
    id: 'sp-05',
    code: 'S1',
    hotkey: '5',
    name: 'Loaded Truffle Fries',
    shortName: 'LOADED FRIES',
    category: 'side',
    image: 'assets/images/loaded_fries.jpg',
    price: 690
  },
  {
    id: 'sp-06',
    code: 'S2',
    hotkey: '6',
    name: 'Peri Peri Crispy Fries',
    shortName: 'PERI PERI FRIES',
    category: 'side',
    image: 'assets/images/peri_fries.jpg',
    price: 490
  },
  {
    id: 'sp-07',
    code: 'S3',
    hotkey: '7',
    name: 'Gourmet Onion Rings',
    shortName: 'ONION RINGS',
    category: 'side',
    image: 'assets/images/onion_rings.jpg',
    price: 550
  },
  {
    id: 'sp-08',
    code: 'S4',
    hotkey: '8',
    name: 'Buffalo Wings (6 Pcs)',
    shortName: 'BUFFALO WINGS',
    category: 'side',
    image: 'assets/images/buffalo_wings.jpg',
    price: 850
  },

  // --- ROW 3: DRINKS (Blue / Cyan Tiles) ---
  {
    id: 'sp-09',
    code: 'D1',
    hotkey: '9',
    name: 'Mint Lemonade Cooler',
    shortName: 'MINT COOLER',
    category: 'drink',
    image: 'assets/images/mint_cooler.jpg',
    price: 390
  },
  {
    id: 'sp-10',
    code: 'D2',
    hotkey: '0',
    name: 'Artisan Peach Iced Tea',
    shortName: 'PEACH ICED TEA',
    category: 'drink',
    image: 'assets/images/peach_tea.jpg',
    price: 420
  },
  {
    id: 'sp-11',
    code: 'D3',
    hotkey: '-',
    name: 'Classic Coca-Cola Can',
    shortName: 'COCA-COLA CAN',
    category: 'drink',
    image: 'assets/images/cola_can.jpg',
    price: 180
  },
  {
    id: 'sp-12',
    code: 'D4',
    hotkey: '=',
    name: 'Caramel Thick Shake',
    shortName: 'CARAMEL SHAKE',
    category: 'drink',
    image: 'assets/images/caramel_shake.jpg',
    price: 650
  }
];

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================
const state = {
  cart: [], // Array of { id, name, price, qty }
  tokenNumber: 43, // Starts at TOKEN #043
  customerName: '', // Streamlined customer name for active ticket
  printerConnected: false,
  printerStatus: 'idle',
  bluetoothDevice: null,
  gattServer: null,
  writeCharacteristic: null,
  lastOrder: null
};

// ============================================================================
// 3. SOUND ENGINE (Instant Low-Latency Feedback)
// ============================================================================
class POSSoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep() {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1550, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playRemoveBeep() {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  playPrinterFeed() {
    try {
      this.init();
      const now = this.ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750 + (i % 2) * 250, now + i * 0.045);
        gain.gain.setValueAtTime(0.14, now + i * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.035);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.045);
        osc.stop(now + i * 0.045 + 0.035);
      }
    } catch (e) {}
  }
}

const soundEngine = new POSSoundEngine();

// ============================================================================
// 4. UTILITIES
// ============================================================================
function formatPKR(amount) {
  const rounded = Math.round(amount || 0);
  return `Rs. ${rounded.toLocaleString('en-PK')}`;
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // 3. TOAST CLEANUP: Remove permanent conflicting stacked toasts
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const toast = document.createElement('div');
  toast.className = 'pos-toast';
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-dismiss after 2 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.18s ease';
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 180);
  }, 2000);
}

function getCustomerNameValue() {
  const input = document.getElementById('customerNameInput');
  const val = input ? input.value.trim() : (state.customerName || '').trim();
  return val || 'Counter';
}

function clearCustomerName() {
  state.customerName = '';
  const input = document.getElementById('customerNameInput');
  const clearBtn = document.getElementById('clearCustomerNameBtn');
  if (input) input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
}

// ============================================================================
// 5. RENDERING FIXED 4x3 SPEED-DIAL GRID
// - 12 fixed blocks (Row 1 Burgers, Row 2 Sides, Row 3 Drinks)
// - Live Quantity Badges on tiles
// - One-touch tap increments; Long-press removes
// ============================================================================
function renderSpeedGrid() {
  const grid = document.getElementById('speedDialGrid');
  if (!grid) return;

  grid.innerHTML = SPEED_ITEMS.map(item => {
    const cartEntry = state.cart.find(c => c.id === item.id);
    const qty = cartEntry ? cartEntry.qty : 0;
    const hasQtyClass = qty > 0 ? 'has-qty' : '';
    const categoryClass = `tile-${item.category}`;

    return `
      <div 
        class="speed-tile ${categoryClass} ${hasQtyClass}" 
        data-id="${item.id}"
        id="tile-${item.id}"
        role="button"
        tabindex="0"
        title="${item.name} - ${formatPKR(item.price)}"
      >
        <!-- Top 60%: Crisp Appetizing Food Thumbnail -->
        <div class="tile-image-section">
          <img 
            src="${item.image}" 
            alt="${item.shortName}" 
            class="tile-thumbnail" 
            loading="eager" 
            draggable="false"
          />
          <span class="tile-hotkey-tag">[${item.hotkey}]</span>
          <span class="tile-qty-badge" id="badge-${item.id}">x${qty}</span>
        </div>

        <!-- Bottom 40%: Short Name in Bold Uppercase + High-Contrast Bold Price -->
        <div class="tile-info-section">
          <div class="tile-name">${item.shortName}</div>
          <div class="tile-price">${formatPKR(item.price)}</div>
        </div>
      </div>
    `;
  }).join('');

  attachTileTouchListeners();
}

function updateTileBadges() {
  SPEED_ITEMS.forEach(item => {
    const tile = document.getElementById(`tile-${item.id}`);
    const badge = document.getElementById(`badge-${item.id}`);
    if (!tile || !badge) return;

    const cartEntry = state.cart.find(c => c.id === item.id);
    const qty = cartEntry ? cartEntry.qty : 0;

    if (qty > 0) {
      tile.classList.add('has-qty');
      badge.textContent = `x${qty}`;
    } else {
      tile.classList.remove('has-qty');
      badge.textContent = '';
    }
  });
}

// Attach Pointer & Long-Press Handlers for High-Speed Touch
function attachTileTouchListeners() {
  const tiles = document.querySelectorAll('.speed-tile');
  tiles.forEach(tile => {
    const itemId = tile.dataset.id;
    let longPressTimer = null;
    let isLongPress = false;

    function handleStart() {
      isLongPress = false;
      longPressTimer = setTimeout(() => {
        isLongPress = true;
        // Long-press removes/resets item from ticket!
        removeItemCompletely(itemId);
        tile.classList.remove('has-qty');
        tile.classList.add('pulse-active');
        setTimeout(() => tile.classList.remove('pulse-active'), 200);
      }, 550);
    }

    function handleEnd(e) {
      if (longPressTimer) clearTimeout(longPressTimer);
      if (!isLongPress) {
        // Normal One-Touch Tap: Adds 1 or increments!
        tile.classList.remove('pulse-active');
        void tile.offsetWidth;
        tile.classList.add('pulse-active');
        setTimeout(() => tile.classList.remove('pulse-active'), 200);

        soundEngine.playBeep();
        addToCart(itemId);
      }
    }

    function handleCancel() {
      if (longPressTimer) clearTimeout(longPressTimer);
    }

    tile.addEventListener('pointerdown', handleStart);
    tile.addEventListener('pointerup', handleEnd);
    tile.addEventListener('pointerleave', handleCancel);
    tile.addEventListener('pointercancel', handleCancel);
  });
}

// ============================================================================
// 6. TICKET MANAGEMENT & ITEM ADJUSTMENTS
// ============================================================================
function addToCart(itemId) {
  const itemDef = SPEED_ITEMS.find(m => m.id === itemId);
  if (!itemDef) return;

  const existing = state.cart.find(c => c.id === itemId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      id: itemDef.id,
      name: itemDef.name,
      price: itemDef.price,
      qty: 1
    });
  }

  updatePOS();
}

function updateCartQty(itemId, delta) {
  const item = state.cart.find(c => c.id === itemId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(c => c.id !== itemId);
    soundEngine.playRemoveBeep();
  } else {
    soundEngine.playBeep();
  }

  updatePOS();
}

function removeItemCompletely(itemId) {
  const item = state.cart.find(c => c.id === itemId);
  if (!item) return;

  state.cart = state.cart.filter(c => c.id !== itemId);
  soundEngine.playRemoveBeep();
  showToast(`Removed ${item.name}`);
  updatePOS();
}

function clearCart() {
  const hasCart = state.cart.length > 0;
  const hasName = !!(state.customerName || (document.getElementById('customerNameInput') && document.getElementById('customerNameInput').value.trim()));
  if (!hasCart && !hasName) return;

  state.cart = [];
  clearCustomerName();
  soundEngine.playRemoveBeep();
  showToast('Ticket cleared');
  updatePOS();
}

// ============================================================================
// 7. FINANCIAL CALCULATIONS & TICKET RENDERING
// ============================================================================
function calculateGrandTotal() {
  return state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function renderTicketItems() {
  const container = document.getElementById('ticketItemsContainer');
  const badge = document.getElementById('ticketCountBadge');
  if (!container) return;

  const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  if (badge) {
    badge.textContent = `${totalQty} ITEM${totalQty === 1 ? '' : 'S'}`;
  }

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="ticket-empty-state" id="ticketEmptyState">
        <div class="empty-icon">🧾</div>
        <p class="empty-title">Ticket is Empty</p>
        <p class="empty-sub">Tap any Speed-Pad tile on the left to punch items</p>
      </div>
    `;
    return;
  }

  const rowsHtml = state.cart.map(item => {
    const rowSubtotal = item.price * item.qty;
    return `
      <div class="ticket-item-row" data-id="${item.id}">
        <div class="ticket-item-left">
          <div class="ticket-item-name">${item.name}</div>
          <div class="ticket-item-subtotal">${formatPKR(rowSubtotal)}</div>
        </div>
        <div class="ticket-item-right">
          <div class="touch-stepper">
            <button class="touch-step-btn" onclick="updateCartQty('${item.id}', -1)" aria-label="Decrease quantity">−</button>
            <span class="touch-step-val">${item.qty}</span>
            <button class="touch-step-btn" onclick="updateCartQty('${item.id}', 1)" aria-label="Increase quantity">+</button>
          </div>
          <button class="ticket-item-del-btn" onclick="removeItemCompletely('${item.id}')" title="Remove line item">✕</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = rowsHtml;
}

function toggleMobileDrawer(open) {
  const panel = document.getElementById('ticketPanel');
  const backdrop = document.getElementById('mobileDrawerBackdrop');
  const toggleText = document.getElementById('mobileToggleText');
  const toggleArrow = document.getElementById('mobileToggleArrow');
  if (!panel) return;

  const shouldOpen = typeof open === 'boolean' ? open : !panel.classList.contains('drawer-open');
  if (shouldOpen) {
    panel.classList.add('drawer-open');
    if (backdrop) backdrop.classList.add('active');
    if (toggleText) toggleText.textContent = 'HIDE TICKET';
    if (toggleArrow) toggleArrow.textContent = '▼';
  } else {
    panel.classList.remove('drawer-open');
    if (backdrop) backdrop.classList.remove('active');
    if (toggleText) toggleText.textContent = 'VIEW TICKET';
    if (toggleArrow) toggleArrow.textContent = '▲';
  }
}

function closeMobileDrawer() {
  toggleMobileDrawer(false);
}

function updatePOS() {
  renderTicketItems();
  updateTileBadges();

  const grandTotal = calculateGrandTotal();
  const totEl = document.getElementById('summaryGrandTotal');
  if (totEl) {
    totEl.textContent = formatPKR(grandTotal);
  }

  // Update mobile summary bar (<= 768px view)
  const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const mobileBadge = document.getElementById('mobileTicketBadge');
  if (mobileBadge) {
    mobileBadge.textContent = `${totalQty} ITEM${totalQty === 1 ? '' : 'S'}`;
  }

  const mobileTotal = document.getElementById('mobileTotalDisplay');
  if (mobileTotal) {
    mobileTotal.textContent = formatPKR(grandTotal);
  }

  const isKotReady = state.cart.length > 0 && grandTotal > 0;
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.disabled = !isKotReady;
    if (isKotReady) {
      checkoutBtn.classList.add('active-ready');
    } else {
      checkoutBtn.classList.remove('active-ready');
    }
  }

  const billBtn = document.getElementById('printCustomerBillBtn');
  if (billBtn) {
    const isBillAvailable = isKotReady || state.lastOrder !== null;
    billBtn.disabled = !isBillAvailable;
  }
}

// ============================================================================
// 8. ESC/POS THERMAL PROTOCOL WITH WORD-WRAPPING (58mm / 32 Cols)
// - NO TRUNCATION (e.g. no "CRUNCH BUR")
// - 4 EMPTY LINE FEEDS + CUT GUIDE ("- - - TEAR HERE - - -") BETWEEN SLIPS
// ============================================================================
const ESC = 0x1B;
const GS  = 0x1D;
const FS  = 0x1C;
const LF  = 0x0A;

const ESCPOS = {
  INIT: [ESC, 0x40],
  CANCEL_CHINESE: [FS, 0x2E],
  CODE_PAGE_437: [ESC, 0x74, 0x00],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  TEXT_NORMAL: [GS, 0x21, 0x00],
  TEXT_DOUBLE_HEIGHT: [GS, 0x21, 0x01],
  TEXT_DOUBLE_SIZE: [GS, 0x21, 0x11],
  FEED_4_LINES: [LF, LF, LF, LF],
  PAPER_CUT_FULL: [GS, 0x56, 0x00],
  PAPER_CUT_PARTIAL: [GS, 0x56, 0x01]
};

function sanitizeAscii(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ñÑ]/g, 'n')
    .replace(/[çÇ]/g, 'c')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·]/g, '*')
    .replace(/₹/g, 'Rs. ')
    .replace(/€/g, 'EUR ')
    .replace(/£/g, 'GBP ')
    .replace(/[^\x20-\x7E\n\r]/g, '')
    .replace(/[\r\n]+$/, '');
}

function stringToAsciiBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes.push(code <= 127 ? code : 0x20);
  }
  return bytes;
}

function formatTwoColumns(left, right, maxCols = 32) {
  const cleanLeft = sanitizeAscii(left);
  const cleanRight = sanitizeAscii(right);
  const availableForLeft = maxCols - cleanRight.length - 1;
  const truncatedLeft = cleanLeft.length > availableForLeft 
    ? cleanLeft.substring(0, availableForLeft) 
    : cleanLeft;
  const spacesNeeded = Math.max(1, maxCols - truncatedLeft.length - cleanRight.length);
  return truncatedLeft + ' '.repeat(spacesNeeded) + cleanRight;
}

/**
 * Intelligent 32-column word wrap for items with prices
 * Wraps clean whole words onto a second line without hard-cutting words!
 */
function formatItemLineWrapped(qty, name, priceFormatted, maxCols = 32) {
  const cleanName = sanitizeAscii(name);
  const cleanPrice = sanitizeAscii(priceFormatted || '');
  const qtyPrefix = `${qty}x `;
  const priceLen = cleanPrice.length;

  // 1. Single line check
  const singleLine = `${qtyPrefix}${cleanName}`;
  if (singleLine.length + 1 + priceLen <= maxCols) {
    const spaces = maxCols - singleLine.length - priceLen;
    return [singleLine + ' '.repeat(spaces) + cleanPrice];
  }

  // 2. Multi-line wrap
  const words = cleanName.split(' ');
  const lines = [];
  let currentLine = qtyPrefix;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isFirstWord = (currentLine === qtyPrefix || currentLine === '   ');
    const testLine = currentLine + (isFirstWord ? '' : ' ') + word;
    const isLastWord = (i === words.length - 1);
    const limit = isLastWord ? (maxCols - priceLen - 1) : maxCols;

    if (testLine.length <= limit) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = '   ' + word; // Indent continuation
    }
  }

  const spaces = maxCols - currentLine.length - priceLen;
  if (spaces >= 1) {
    lines.push(currentLine + ' '.repeat(spaces) + cleanPrice);
  } else {
    lines.push(currentLine);
    lines.push(' '.repeat(maxCols - priceLen) + cleanPrice);
  }

  return lines;
}

/**
 * Word wrap for Kitchen KOT items without prices
 */
function formatKotItemWrapped(qty, name, maxCols = 32) {
  const qtyTag = `[ ${qty} ] `;
  const cleanName = sanitizeAscii(name).toUpperCase();
  const single = `${qtyTag}${cleanName}`;

  if (single.length <= maxCols) return [single];

  const words = cleanName.split(' ');
  const lines = [];
  let cur = qtyTag;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const test = cur + (cur === qtyTag || cur === '      ' ? '' : ' ') + word;
    if (test.length <= maxCols) {
      cur = test;
    } else {
      lines.push(cur);
      cur = '      ' + word;
    }
  }
  if (cur.trim()) lines.push(cur);
  return lines;
}

class EscPosBuilder {
  constructor() {
    this.buffer = [];
  }

  raw(bytes) {
    if (Array.isArray(bytes) || bytes instanceof Uint8Array) {
      for (let i = 0; i < bytes.length; i++) this.buffer.push(bytes[i]);
    } else if (typeof bytes === 'number') {
      this.buffer.push(bytes);
    }
    return this;
  }

  cmd(commandBytes) {
    return this.raw(commandBytes);
  }

  text(str) {
    const bytes = stringToAsciiBytes(sanitizeAscii(str));
    return this.raw(bytes);
  }

  line(str = '') {
    this.text(str);
    this.buffer.push(LF);
    return this;
  }

  divider(char = '-', length = 32) {
    return this.line(char.repeat(length));
  }

  doubleDivider(length = 32) {
    return this.divider('=', length);
  }

  feed(n = 4) {
    for (let i = 0; i < n; i++) this.buffer.push(LF);
    return this;
  }

  cut() {
    return this.cmd(ESCPOS.PAPER_CUT_FULL);
  }

  init() {
    return this
      .cmd(ESCPOS.INIT)
      .cmd(ESCPOS.CANCEL_CHINESE)
      .cmd(ESCPOS.CODE_PAGE_437);
  }

  getBytes() {
    return new Uint8Array(this.buffer);
  }
}

function parseDateTime(timestampStr) {
  const clean = sanitizeAscii(timestampStr || '');
  const parts = clean.split(' ');
  if (parts.length >= 3) {
    return { date: parts[0], time: parts.slice(1).join(' ') };
  }
  return { date: clean, time: '' };
}

// 1. Kitchen KOT ESC/POS Generator
function buildKitchenKotEscPos(order) {
  const b = new EscPosBuilder();
  const dt = parseDateTime(order.timestamp);
  b.init();

  b.cmd(ESCPOS.ALIGN_CENTER)
   .doubleDivider()
   .cmd(ESCPOS.BOLD_ON)
   .line('*** KITCHEN KOT ***')
   .cmd(ESCPOS.BOLD_OFF)
   .doubleDivider();

  // Double-Width + Double-Height Bold Token Header
  const tokenVal = order.token || String(order.tokenNumber || '000').padStart(3, '0');
  b.cmd(ESCPOS.ALIGN_CENTER)
   .cmd(ESCPOS.TEXT_DOUBLE_SIZE) // GS ! 0x11
   .cmd(ESCPOS.BOLD_ON)          // ESC E 1
   .line(`TOKEN #${sanitizeAscii(tokenVal)}`)
   .cmd(ESCPOS.TEXT_NORMAL)      // GS ! 0x00
   .cmd(ESCPOS.BOLD_OFF);

  // Directly below Double-Height Token: Customer Name in bold text (sanitized ASCII)
  const rawCustomerName = (order.customerName || 'Counter').trim();
  const customerNameClean = sanitizeAscii(rawCustomerName || 'Counter').toUpperCase();
  b.cmd(ESCPOS.ALIGN_CENTER)
   .cmd(ESCPOS.TEXT_DOUBLE_HEIGHT) // Double height so it stands out clearly for chef/packing boy
   .cmd(ESCPOS.BOLD_ON)
   .line(`NAME: ${customerNameClean}`)
   .cmd(ESCPOS.TEXT_NORMAL)
   .cmd(ESCPOS.BOLD_OFF);

  const orderType = sanitizeAscii(order.orderType || 'COUNTER').toUpperCase();
  b.cmd(ESCPOS.ALIGN_LEFT);

  if (dt.time) {
    b.line(formatTwoColumns(`MODE: ${orderType}`, dt.time));
    b.line(formatTwoColumns(`DATE: ${dt.date}`, ''));
  } else {
    b.line(formatTwoColumns(`MODE: ${orderType}`, order.timestamp || ''));
  }

  b.divider()
   .cmd(ESCPOS.BOLD_ON)
   .line('QTY  ITEM')
   .cmd(ESCPOS.BOLD_OFF)
   .divider();

  // Item List with clean word wrapping (no truncation)
  (order.items || []).forEach(it => {
    const wrappedLines = formatKotItemWrapped(it.qty, it.name, 32);
    wrappedLines.forEach((l, idx) => {
      if (idx === 0) b.cmd(ESCPOS.BOLD_ON);
      b.line(l);
      if (idx === 0) b.cmd(ESCPOS.BOLD_OFF);
    });

    if (it.note) {
      b.line(`      * NOTE: ${sanitizeAscii(it.note)}`);
    }
  });

  const totalItemCount = (order.items || []).reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
  b.divider()
   .line(formatTwoColumns(`TOTAL ITEMS: ${totalItemCount}`, `ORDER: ${orderType}`))
   .doubleDivider();

  // TEAR GAP: 3 empty line feeds so text fully clears the physical tear bar
  b.feed(3)
   .cut();

  return b.getBytes();
}

// 2. Customer Receipt ESC/POS Generator
function buildCustomerReceiptEscPos(order) {
  const b = new EscPosBuilder();
  b.init();

  b.cmd(ESCPOS.ALIGN_CENTER)
   .doubleDivider()
   .cmd(ESCPOS.BOLD_ON)
   .line('THE ARTISAN GRILL & CO.')
   .cmd(ESCPOS.BOLD_OFF)
   .line('Fast-Food Counter')
   .doubleDivider();

  const dt = parseDateTime(order.timestamp);
  const tokenVal = order.token || String(order.tokenNumber || '000').padStart(3, '0');
  const custName = sanitizeAscii((order.customerName || 'Counter').trim());

  b.cmd(ESCPOS.ALIGN_LEFT)
   .line(formatTwoColumns(`Token #${sanitizeAscii(tokenVal)}`, '[Counter Sale]'))
   .line(`Customer: ${custName}`);

  if (dt.time) {
    b.line(formatTwoColumns(dt.date, dt.time));
  } else {
    b.line(formatTwoColumns('Date/Time:', order.timestamp || ''));
  }
  b.divider()
   .cmd(ESCPOS.BOLD_ON)
   .line(formatTwoColumns('QTY  ITEM', 'PRICE'))
   .cmd(ESCPOS.BOLD_OFF)
   .divider();

  // Itemized List with clean multi-line word-wrapping
  (order.items || []).forEach(it => {
    const priceFormatted = `Rs. ${Number(it.price * it.qty).toLocaleString('en-PK')}`;
    const wrappedLines = formatItemLineWrapped(it.qty, it.name, priceFormatted, 32);
    wrappedLines.forEach(l => b.line(l));

    if (it.note) {
      b.line(`   * ${sanitizeAscii(it.note)}`);
    }
  });

  b.divider();

  const grandTotal = order.grandTotal || (order.items || []).reduce((s, it) => s + (it.price * it.qty), 0);
  const totalStr = `Rs. ${Number(grandTotal).toLocaleString('en-PK')}`;

  b.cmd(ESCPOS.BOLD_ON)
   .cmd(ESCPOS.TEXT_DOUBLE_HEIGHT) // GS ! 0x01
   .line(formatTwoColumns('TOTAL:', totalStr))
   .cmd(ESCPOS.TEXT_NORMAL)        // GS ! 0x00
   .cmd(ESCPOS.BOLD_OFF)
   .line(formatTwoColumns('Payment Mode:', 'CASH'))
   .divider();

  b.cmd(ESCPOS.ALIGN_CENTER)
   .line('Thank You For Dining With Us!')
   .line('Please Retain Slip For Order')
   .doubleDivider();

  // TEAR GAP: 3 empty line feeds so text fully clears the physical tear bar
  b.feed(3)
   .cut();

  return b.getBytes();
}

// 3. Complete Dual Print Stream with 4 Line Feeds + Dashed Cut Guide (Optional / Fallback)
function buildDualPrintEscPos(order) {
  const kotBytes = buildKitchenKotEscPos(order);
  const billBytes = buildCustomerReceiptEscPos(order);
  const b = new EscPosBuilder();

  b.raw(kotBytes);
  b.feed(1);
  b.raw(billBytes);

  return b.getBytes();
}

// ============================================================================
// 9. DEDICATED INDEPENDENT PRINT ACTIONS
// 1. printKitchenKOT(orderData)   - Primary workflow action
// 2. printCustomerBill(orderData) - Secondary on-demand action
// ============================================================================

/**
 * 1. PRIMARY WORKFLOW ACTION: printKitchenKOT
 * - Generates and dispatches ONLY the Kitchen KOT ESC/POS byte sequence with 3 trailing line feeds
 * - Increments token counter (e.g. #043 -> #044)
 * - Clears the current order for the next customer
 */
async function printKitchenKOT(orderData, customerName) {
  const grandTotal = calculateGrandTotal();
  if (!orderData && (state.cart.length === 0 || grandTotal === 0)) {
    showToast('⚠️ Ticket is empty — punch items first');
    return;
  }

  const startTime = performance.now();

  const currentToken = state.tokenNumber;
  const tokenFormatted = `TOKEN #${String(currentToken).padStart(3, '0')}`;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Resolve customer name: explicit parameter > orderData.customerName > active input/state > 'Counter'
  let finalCustomerName;
  let finalOrderData = orderData;
  if (typeof orderData === 'string' && !customerName) {
    finalCustomerName = orderData.trim() || 'Counter';
    finalOrderData = null;
  } else {
    finalCustomerName = (typeof customerName === 'string' && customerName.trim())
      ? customerName.trim()
      : (orderData && typeof orderData.customerName === 'string' && orderData.customerName.trim())
        ? orderData.customerName.trim()
        : getCustomerNameValue();
  }

  const orderRecord = finalOrderData || {
    tokenNumber: currentToken,
    token: String(currentToken).padStart(3, '0'),
    tokenFormatted,
    customerName: finalCustomerName,
    timestamp: `${dateStr} ${timeStr}`,
    date: dateStr,
    items: JSON.parse(JSON.stringify(state.cart)),
    grandTotal
  };

  if (!orderRecord.customerName) {
    orderRecord.customerName = finalCustomerName;
  }

  // Save as last order so customer bill can still be printed on-demand
  state.lastOrder = orderRecord;

  // 1. Audio chime
  soundEngine.playPrinterFeed();

  // 2. Populate HTML emulation
  populateKotReceiptOnly(orderRecord);

  // 3. Dispatch ONLY Kitchen KOT ESC/POS bytes with 3 line feeds
  const kotBytes = buildKitchenKotEscPos(orderRecord);
  await sendBytesToThermalPrinter(kotBytes);

  // 4. Reset ticket state, auto-clear customer name, increment token, and refresh UI
  state.cart = [];
  clearCustomerName();
  state.tokenNumber += 1;
  const nextTokenStr = `TOKEN #${String(state.tokenNumber).padStart(3, '0')}`;

  const topTokenDisplay = document.getElementById('topTokenDisplay');
  if (topTokenDisplay) {
    topTokenDisplay.textContent = nextTokenStr;
  }
  const ticketPanelToken = document.getElementById('ticketPanelToken');
  if (ticketPanelToken) {
    ticketPanelToken.textContent = nextTokenStr;
  }

  updatePOS();
  closeMobileDrawer();

  const elapsed = Math.round(performance.now() - startTime);
  showToast(`⚡ Kitchen KOT #${orderRecord.token} (${orderRecord.customerName}) Sent! Ready for ${nextTokenStr} (${elapsed}ms)`);
}

/**
 * 2. SECONDARY ON-DEMAND ACTION: printCustomerBill
 * - Generates and dispatches ONLY the Customer Receipt slip with 3 trailing line feeds
 * - Does NOT clear the active cart or re-print/increment the kitchen token
 */
async function printCustomerBill(orderData, customerName) {
  let targetOrder = orderData;

  let finalCustomerName;
  if (typeof orderData === 'string' && !customerName) {
    finalCustomerName = orderData.trim() || 'Counter';
    targetOrder = null;
  } else {
    finalCustomerName = (typeof customerName === 'string' && customerName.trim())
      ? customerName.trim()
      : (orderData && typeof orderData.customerName === 'string' && orderData.customerName.trim())
        ? orderData.customerName.trim()
        : getCustomerNameValue();
  }

  if (!targetOrder) {
    const grandTotal = calculateGrandTotal();
    if (state.cart.length > 0 && grandTotal > 0) {
      const currentToken = state.tokenNumber;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      targetOrder = {
        tokenNumber: currentToken,
        token: String(currentToken).padStart(3, '0'),
        tokenFormatted: `TOKEN #${String(currentToken).padStart(3, '0')}`,
        customerName: finalCustomerName,
        timestamp: `${dateStr} ${timeStr}`,
        date: dateStr,
        items: JSON.parse(JSON.stringify(state.cart)),
        grandTotal
      };
    } else if (state.lastOrder) {
      targetOrder = { ...state.lastOrder };
      if (typeof customerName === 'string' && customerName.trim()) {
        targetOrder.customerName = customerName.trim();
      }
    } else {
      showToast('⚠️ No active ticket or previous order to print bill');
      return;
    }
  } else if (!targetOrder.customerName) {
    targetOrder.customerName = finalCustomerName;
  }

  // 1. Audio chime
  soundEngine.playPrinterFeed();

  // 2. Populate HTML emulation
  populateCustomerReceiptOnly(targetOrder);

  // 3. Dispatch ONLY Customer Bill ESC/POS bytes with 3 line feeds
  const billBytes = buildCustomerReceiptEscPos(targetOrder);
  await sendBytesToThermalPrinter(billBytes);

  showToast(`🧾 Customer Bill Printed for Token #${targetOrder.token} (${targetOrder.customerName || 'Counter'})`);
}

const handlePrintAndNext = printKitchenKOT;

function populateKotReceiptOnly(order) {
  const kotToken = document.getElementById('receiptKotToken');
  if (kotToken) kotToken.textContent = order.tokenFormatted || `TOKEN #${order.token}`;

  const kotCust = document.getElementById('receiptKotCustomerName');
  if (kotCust) {
    const custClean = sanitizeAscii((order.customerName || 'Counter').trim()).toUpperCase();
    kotCust.textContent = `NAME: ${custClean || 'COUNTER'}`;
  }

  const kotDate = document.getElementById('receiptKotDate');
  if (kotDate) kotDate.textContent = (order.date || '').toUpperCase();

  const kotTime = document.getElementById('receiptKotTime');
  if (kotTime) kotTime.textContent = order.timestamp || '';

  const kotItemsWrap = document.getElementById('receiptKotItems');
  if (kotItemsWrap) {
    kotItemsWrap.innerHTML = (order.items || []).map(it => `
      <div class="kot-item-entry">[ ${it.qty} ] ${sanitizeAscii(it.name).toUpperCase()}</div>
    `).join('');
  }
}

function populateCustomerReceiptOnly(order) {
  const custToken = document.getElementById('receiptCustomerToken');
  if (custToken) custToken.textContent = `Token #${order.token}`;

  const custNameEl = document.getElementById('receiptCustomerName');
  if (custNameEl) {
    const custClean = sanitizeAscii((order.customerName || 'Counter').trim());
    custNameEl.textContent = `Customer: ${custClean || 'Counter'}`;
  }

  const custDate = document.getElementById('receiptCustomerDate');
  if (custDate) custDate.textContent = order.date;

  const custTime = document.getElementById('receiptCustomerTime');
  if (custTime) custTime.textContent = order.timestamp;

  const custItemsWrap = document.getElementById('receiptCustomerItems');
  if (custItemsWrap) {
    custItemsWrap.innerHTML = (order.items || []).map(it => `
      <div class="receipt-item-line">
        <span>${it.qty}x ${it.name}</span>
        <span>Rs. ${(it.price * it.qty).toLocaleString('en-PK')}</span>
      </div>
    `).join('');
  }

  const totEl = document.getElementById('receiptGrandTotal');
  if (totEl) totEl.textContent = `Rs. ${(order.grandTotal || 0).toLocaleString('en-PK')}`;
}

function populateThermalReceipt(order) {
  populateKotReceiptOnly(order);
  populateCustomerReceiptOnly(order);
}

// ============================================================================
// ============================================================================
// 10. YD583 & MPT-II WEB BLUETOOTH ON-DEMAND ENGINE
// - Hardware Support: YD583 mini 58mm printer (fffc0fe8-30060000-59433331-59433231) & MPT-II
// - Scans with Name prefixes: ["YD583", "MPT", "POS", "RPP", "MTP"] and common 58mm ESC/POS vendor UUIDs
// - Dynamic GATT service & writable characteristic discovery with global reference storage
// - Persistence: saves selected device name ("YD583") and id into localStorage
// - Status displays: "🟢 YD583 Ready" when paired/standby, "🔌 Connect Printer" when unpaired
// - On-demand print pipeline: connects if needed, writes 100-byte slices with 20ms delays (buffer-safe)
// ============================================================================

const PRINTER_NAME_PREFIXES = ['YD583', 'MPT', 'POS', 'RPP', 'MTP'];

const PRINTER_SERVICES = [
  0x18f0,
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000e781-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb'
];

let isPrintBusy = false;
const printQueue = [];

function isBluetoothPrinterConnected() {
  return !!(
    state.bluetoothDevice &&
    state.bluetoothDevice.gatt &&
    state.bluetoothDevice.gatt.connected &&
    state.writeCharacteristic
  );
}

function getPrinterDisplayName(customName) {
  const name = customName || state.bluetoothDevice?.name || localStorage.getItem('pos_printer_name') || 'YD583';
  if (name.toUpperCase().includes('YD583')) return 'YD583';
  if (name.toUpperCase().includes('MPT')) return 'MPT-II';
  return name.trim() || 'YD583';
}

/**
 * 3. TOP BAR BUTTON & STATUS RENDERING:
 * - If a device ID exists in localStorage, render "🖨️ YD583 Ready" (neutral/green border).
 * - Only show "🔴 Connect Printer" if no device has ever been paired.
 */
function updatePrinterStatusUI(statusOverride, deviceNameOverride) {
  const pill = document.getElementById('connectBtBtn');
  const dot = document.getElementById('printerStatusDot');
  const text = document.getElementById('printerBtnText');
  if (!pill) return;

  const savedId = localStorage.getItem('pos_printer_id');
  const savedName = localStorage.getItem('pos_printer_name');
  const displayName = getPrinterDisplayName(deviceNameOverride || savedName);

  let currentStatus = statusOverride;
  if (!currentStatus) {
    currentStatus = savedId ? 'ready' : 'unpaired';
  }

  state.printerStatus = currentStatus;
  pill.classList.remove('connected', 'ready', 'printing', 'reconnecting', 'disconnected');

  if (currentStatus === 'printing') {
    pill.classList.add('printing');
    if (dot) dot.className = 'printer-ready-dot printing';
    if (text) text.textContent = '🟡 Printing...';
    pill.title = 'Printing in progress...';
  } else if (savedId && currentStatus !== 'unpaired') {
    // Top Bar Button: If a device ID exists in localStorage, render "🖨️ YD583 Ready" (neutral/green border)
    pill.classList.add('ready');
    if (dot) dot.className = 'printer-ready-dot ready';
    if (text) text.textContent = `🖨️ ${displayName} Ready`;
    pill.title = `${displayName} Ready (On-Demand Spooler) • Click to configure`;
  } else {
    // Only show "🔴 Connect Printer" if no device has ever been paired
    pill.classList.add('disconnected');
    if (dot) dot.className = 'printer-ready-dot disconnected';
    if (text) text.textContent = '🔴 Connect Printer';
    pill.title = 'No printer paired • Click to pair Bluetooth printer';
  }

  updateModalStatusUI(currentStatus, displayName);
}

function updateModalStatusUI(statusOverride, labelOverride) {
  const statusDot = document.getElementById('modalStatusDot');
  const statusText = document.getElementById('modalStatusText');
  const devName = document.getElementById('modalDeviceName');
  const devId = document.getElementById('modalDeviceId');
  const forgetBtn = document.getElementById('forgetPrinterBtn');
  const testBtn = document.getElementById('modalTestPrintBtn');
  if (!statusText) return;

  const savedId = localStorage.getItem('pos_printer_id');
  const savedName = localStorage.getItem('pos_printer_name');
  const displayName = labelOverride || getPrinterDisplayName(savedName);
  const currentStatus = statusOverride || (savedId ? 'ready' : 'unpaired');

  if (statusDot) statusDot.className = 'ps-dot';

  if (currentStatus === 'printing') {
    if (statusDot) statusDot.classList.add('reconnecting');
    statusText.textContent = '🟡 Printing...';
    statusText.style.color = '#d97706';
    if (devName) devName.textContent = `${displayName} Thermal Printer`;
    if (devId) devId.textContent = savedId ? `Device ID: ${savedId} (Sending ESC/POS bytes)` : '';
    if (forgetBtn) forgetBtn.style.display = savedId ? 'block' : 'none';
    if (testBtn) testBtn.disabled = true;
  } else if (savedId && currentStatus !== 'unpaired') {
    // 1. Mark UI Status as: "🟢 Printer Paired (Ready)" without invoking device.gatt.connect()
    if (statusDot) statusDot.classList.add('ready');
    statusText.textContent = '🟢 Printer Paired (Ready)';
    statusText.style.color = '#15803d';
    if (devName) devName.textContent = `${displayName} Thermal Printer`;
    if (devId) devId.textContent = `Device ID: ${savedId} (On-Demand Spooler Active)`;
    if (forgetBtn) forgetBtn.style.display = 'block';
    if (testBtn) testBtn.disabled = false;
  } else {
    // unpaired
    if (statusDot) statusDot.classList.add('disconnected');
    statusText.textContent = '⚪ No Printer Paired';
    statusText.style.color = '#64748b';
    if (devName) devName.textContent = 'Click "Pair New Printer" below to set up once';
    if (devId) devId.textContent = '';
    if (forgetBtn) forgetBtn.style.display = 'none';
    if (testBtn) testBtn.disabled = true;
  }
}

function openPrinterSetupModal() {
  const modal = document.getElementById('printerModalBackdrop');
  if (!modal) return;
  modal.style.display = 'flex';
  updateModalStatusUI();
}

function closePrinterSetupModal() {
  const modal = document.getElementById('printerModalBackdrop');
  if (!modal) return;
  modal.style.display = 'none';
}

/**
 * 4. USER GESTURE SAFETY:
 * Ensures clicking "Connect Printer" or the status pill cleanly handles user-gesture
 * requirements without unhandled promise rejections.
 */
function handlePrinterPillClick(e) {
  soundEngine.playBeep();
  const savedId = localStorage.getItem('pos_printer_id');
  if (!savedId) {
    // If no device has ever been paired, directly initiate pairing within user gesture context
    pairNewPrinter();
    return;
  }
  openPrinterSetupModal();
}

/**
 * Clean peripheral disconnect / standby listener:
 * When the printer goes idle and drops the physical link 10 seconds later to save battery,
 * cleanly resets internal GATT handles and keeps the UI at "🖨️ YD583 Ready".
 * Does NOT trigger an error toast!
 */
function onDisconnected(event) {
  console.log('Bluetooth thermal printer link closed / standby:', event);
  state.printerConnected = false;
  state.gattServer = null;
  state.writeCharacteristic = null;
  window.writeCharacteristic = null;
  // Step 6: Do NOT trigger an error toast if the printer disconnects 10s later to save battery
  updatePrinterStatusUI();
}

function attachGattListeners(device) {
  if (!device) return;
  device.removeEventListener('gattserverdisconnected', onDisconnected);
  device.addEventListener('gattserverdisconnected', onDisconnected);
}

/**
 * Graceful peripheral teardown on page unload
 */
function teardownBluetooth() {
  try {
    const dev = state.bluetoothDevice;
    if (dev && dev.gatt && dev.gatt.connected) {
      console.log('Teardown: releasing GATT connection before page unload...');
      dev.gatt.disconnect();
    }
  } catch (err) {
    console.debug('Teardown Bluetooth error:', err);
  }
}

window.addEventListener('beforeunload', teardownBluetooth);
window.addEventListener('pagehide', teardownBluetooth);

// Global safeguard against unhandled Bluetooth rejections locking UI state
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    event.reason.name === 'NetworkError' ||
    String(event.reason).includes('GATT') ||
    String(event.reason).includes('Bluetooth')
  )) {
    console.warn('Safeguard caught Bluetooth rejection:', event.reason);
    event.preventDefault();
  }
});

async function getOrRestoreBluetoothDevice() {
  if (state.bluetoothDevice && state.bluetoothDevice.gatt) {
    return state.bluetoothDevice;
  }

  const savedId = localStorage.getItem('pos_printer_id');
  const savedName = localStorage.getItem('pos_printer_name');
  if (!savedId) return null;

  if (navigator.bluetooth && typeof navigator.bluetooth.getDevices === 'function') {
    try {
      const devices = await navigator.bluetooth.getDevices();
      let target = devices.find(d => d.id === savedId);
      if (!target && savedName) {
        target = devices.find(d => d.name && (d.name.includes(savedName) || savedName.includes(d.name)));
      }
      if (!target && devices.length > 0) {
        target = devices.find(d => d.name && PRINTER_NAME_PREFIXES.some(p => d.name.toUpperCase().includes(p))) || devices[0];
      }
      if (target) {
        state.bluetoothDevice = target;
        attachGattListeners(target);
        return target;
      }
    } catch (e) {
      console.debug('getDevices() restore failed:', e);
    }
  }
  return null;
}

/**
 * Dynamic GATT service & writable characteristic discovery
 */
async function resolveWriteCharacteristic(server) {
  if (!server) return null;

  // 1. Inspect all primary services dynamically
  try {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            state.writeCharacteristic = char;
            window.writeCharacteristic = char;
            return char;
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 2. Fallback to known PRINTER_SERVICES
  for (const serviceUuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          state.writeCharacteristic = char;
          window.writeCharacteristic = char;
          return char;
        }
      }
    } catch (e) {}
  }

  return null;
}

let isPrintSpoolerBusy = false;
const spoolerQueue = [];

/**
 * 2. THERMER-STYLE ON-DEMAND PRINT EXECUTION:
 * Single unified async printing wrapper dispatchPrintJob(escposBytes):
 * Step 1: Show a fast, subtle indicator: "Printing...".
 * Step 2: Check if (!device || !device.gatt). If not paired, trigger navigator.bluetooth.requestDevice().
 * Step 3: If !device.gatt.connected, execute await device.gatt.connect().
 * Step 4: Obtain the Primary Service and Writable Characteristic dynamically.
 * Step 5: Slice ESC/POS byte array into 100-byte chunks and write using
 *         writeCharacteristic.writeValueWithoutResponse() or writeValueWithResponse() with a 25ms interval.
 * Step 6: Once printing finishes, cleanly return. Do NOT trigger an error toast if the printer disconnects 10 seconds later to save battery.
 */
async function dispatchPrintJob(escposBytes) {
  if (!escposBytes || escposBytes.length === 0) return false;

  if (isPrintSpoolerBusy) {
    spoolerQueue.push(escposBytes);
    return true;
  }

  isPrintSpoolerBusy = true;
  try {
    let currentJob = escposBytes;
    while (currentJob) {
      await executeOnDemandPrintJob(currentJob);
      currentJob = spoolerQueue.length > 0 ? spoolerQueue.shift() : null;
    }
    return true;
  } catch (err) {
    console.warn('[On-Demand Spooler] Print execution error:', err);
    showToast('⚠️ Printer offline or sleeping. Press Print again to wake.');
    return false;
  } finally {
    isPrintSpoolerBusy = false;
    updatePrinterStatusUI();
  }
}

async function executeOnDemandPrintJob(escposBytes) {
  // Step 1: Show a fast, subtle indicator: "Printing..."
  showToast('Printing...');
  updatePrinterStatusUI('printing');

  // Step 2: Check if (!device || !device.gatt). If not paired, trigger navigator.bluetooth.requestDevice().
  let device = await getOrRestoreBluetoothDevice();

  if (!device || !device.gatt) {
    if (!navigator.bluetooth || typeof navigator.bluetooth.requestDevice !== 'function') {
      showToast('⚠️ Web Bluetooth is not supported in this browser.');
      throw new Error('Web Bluetooth requestDevice not available');
    }

    try {
      device = await navigator.bluetooth.requestDevice({
        filters: PRINTER_NAME_PREFIXES.map(prefix => ({ namePrefix: prefix })),
        optionalServices: PRINTER_SERVICES
      });
    } catch (filterErr) {
      if (filterErr.name === 'NotFoundError') {
        showToast('⚠️ Bluetooth pairing cancelled');
        return false;
      }
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES
      });
    }

    if (!device) {
      return false;
    }

    const rawName = device.name && device.name.trim() ? device.name.trim() : 'YD583';
    const savedName = rawName.toUpperCase().includes('YD583') ? 'YD583' : (rawName.toUpperCase().includes('MPT') ? 'MPT-II' : rawName);

    state.bluetoothDevice = device;
    localStorage.setItem('pos_printer_id', device.id);
    localStorage.setItem('pos_printer_name', savedName);
    attachGattListeners(device);
  }

  // Step 3: If !device.gatt.connected, execute await device.gatt.connect()
  let server = device.gatt;
  if (!server || !server.connected) {
    attachGattListeners(device);
    console.log(`[On-Demand Spooler] Connecting GATT to ${device.name || 'Printer'}...`);
    try {
      server = await device.gatt.connect();
      state.gattServer = server;
    } catch (connectErr) {
      console.warn('[On-Demand Spooler] Initial connect failed, waiting 300ms before retry...', connectErr);
      await new Promise(res => setTimeout(res, 300));
      server = await device.gatt.connect();
      state.gattServer = server;
    }
  }

  // Step 4: Obtain the Primary Service and Writable Characteristic dynamically
  let writeChar = state.writeCharacteristic;
  if (!writeChar || !server.connected) {
    writeChar = await resolveWriteCharacteristic(server);
  }
  if (!writeChar) {
    throw new Error('Writable GATT characteristic not found on printer peripheral');
  }

  state.writeCharacteristic = writeChar;
  window.writeCharacteristic = writeChar;
  state.printerConnected = true;

  // Step 5: Slice ESC/POS byte array into 100-byte chunks and write using
  // writeCharacteristic.writeValueWithoutResponse() or writeValueWithResponse() with a 25ms interval
  const CHUNK_SIZE = 100;
  const CHUNK_DELAY_MS = 25;

  for (let offset = 0; offset < escposBytes.length; offset += CHUNK_SIZE) {
    const chunk = escposBytes.slice(offset, offset + CHUNK_SIZE);
    if (typeof writeChar.writeValueWithoutResponse === 'function') {
      await writeChar.writeValueWithoutResponse(chunk);
    } else if (typeof writeChar.writeValueWithResponse === 'function') {
      await writeChar.writeValueWithResponse(chunk);
    } else {
      await writeChar.writeValue(chunk);
    }
    if (offset + CHUNK_SIZE < escposBytes.length) {
      await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
    }
  }

  // Step 6: Once printing finishes, cleanly return.
  // Do NOT trigger an error toast if the printer disconnects 10 seconds later to save battery.
  console.log('[On-Demand Spooler] Print job dispatched successfully.');
  return true;
}

const sendBytesToThermalPrinter = dispatchPrintJob;
const initSavedPrinterReference = () => updatePrinterStatusUI();
const autoConnectSavedPrinter = () => updatePrinterStatusUI();

/**
 * One-time pairing helper
 */
async function pairNewPrinter(options = {}) {
  if (!navigator.bluetooth || typeof navigator.bluetooth.requestDevice !== 'function') {
    alert('Web Bluetooth is not supported in this browser.\nPlease use Google Chrome or Microsoft Edge.');
    return;
  }

  try {
    showToast('🔍 Scanning for thermal printer...');

    let device;
    if (options.acceptAll) {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES
      });
    } else {
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: PRINTER_NAME_PREFIXES.map(prefix => ({ namePrefix: prefix })),
          optionalServices: PRINTER_SERVICES
        });
      } catch (filterErr) {
        if (filterErr.name === 'NotFoundError') {
          throw filterErr;
        }
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: PRINTER_SERVICES
        });
      }
    }

    if (!device) return;

    const rawName = device.name && device.name.trim() ? device.name.trim() : 'YD583';
    const savedName = rawName.toUpperCase().includes('YD583') ? 'YD583' : (rawName.toUpperCase().includes('MPT') ? 'MPT-II' : rawName);

    state.bluetoothDevice = device;
    localStorage.setItem('pos_printer_id', device.id);
    localStorage.setItem('pos_printer_name', savedName);

    attachGattListeners(device);
    updatePrinterStatusUI('ready', savedName);
    showToast(`✅ ${savedName} Paired (Ready)`);
    closePrinterSetupModal();
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      console.warn('Bluetooth pairing error:', err);
      showToast('⚠️ Bluetooth pairing cancelled');
    }
  }
}

/**
 * Forget printer: clears stored device and resets UI
 */
function forgetCurrentPrinter() {
  if (state.bluetoothDevice) {
    try {
      state.bluetoothDevice.removeEventListener('gattserverdisconnected', onDisconnected);
      if (state.bluetoothDevice.gatt && state.bluetoothDevice.gatt.connected) {
        state.bluetoothDevice.gatt.disconnect();
      }
    } catch (e) {
      console.debug('Error disconnecting printer during forget:', e);
    }
  }

  // Clear persistent storage
  localStorage.removeItem('pos_printer_id');
  localStorage.removeItem('pos_printer_name');

  // Clear volatile state
  state.bluetoothDevice = null;
  state.gattServer = null;
  state.writeCharacteristic = null;
  window.writeCharacteristic = null;
  state.printerConnected = false;
  state.printerStatus = 'unpaired';

  // Cleanly reset UI status to "🔴 Connect Printer"
  updatePrinterStatusUI('unpaired');
  showToast('Printer forgotten. Reset to Connect Printer.');
}

async function printModalTestSlip() {
  soundEngine.playBeep();
  try {
    const testBytes = buildDualPrintEscPos({
      token: "000",
      tokenNumber: 0,
      tokenFormatted: "TOKEN #000",
      customerName: "TEST PRINT",
      timestamp: new Date().toLocaleTimeString('en-PK'),
      date: new Date().toLocaleDateString('en-GB'),
      items: [{ name: "TEST PRINT SUCCESS", qty: 1, price: 0 }],
      grandTotal: 0
    });
    await dispatchPrintJob(testBytes);
    soundEngine.playPrinterFeed();
    showToast('✅ Test Slip Printed!');
  } catch (err) {
    showToast('⚠️ Test print failed');
  }
}

// ============================================================================
// 11. EVENT LISTENERS & KEYBOARD MAPPINGS
// ============================================================================
function setupEventListeners() {
  const printerBtn = document.getElementById('connectBtBtn');
  if (printerBtn) {
    printerBtn.addEventListener('click', handlePrinterPillClick);
    printerBtn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openPrinterSetupModal();
    });
  }

  const clearBtn = document.getElementById('clearCartBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearCart);
  }

  // Streamlined Customer Name Input and Clear Button
  const customerInput = document.getElementById('customerNameInput');
  const clearCustBtn = document.getElementById('clearCustomerNameBtn');

  if (customerInput) {
    customerInput.addEventListener('input', () => {
      state.customerName = customerInput.value;
      if (clearCustBtn) {
        clearCustBtn.style.display = customerInput.value.trim() ? 'flex' : 'none';
      }
    });

    customerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        customerInput.blur();
        if (state.cart.length > 0) {
          printKitchenKOT(null, getCustomerNameValue());
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        customerInput.blur();
      }
    });
  }

  if (clearCustBtn && customerInput) {
    clearCustBtn.addEventListener('click', (e) => {
      e.preventDefault();
      customerInput.value = '';
      state.customerName = '';
      clearCustBtn.style.display = 'none';
      customerInput.focus();
    });
  }

  // Printer Admin Setup Modal listeners
  const closePrinterModalBtn = document.getElementById('closePrinterModalBtn');
  if (closePrinterModalBtn) {
    closePrinterModalBtn.addEventListener('click', closePrinterSetupModal);
  }

  const printerModalBackdrop = document.getElementById('printerModalBackdrop');
  if (printerModalBackdrop) {
    printerModalBackdrop.addEventListener('click', (e) => {
      if (e.target === printerModalBackdrop) closePrinterSetupModal();
    });
  }

  const modalStatusBox = document.getElementById('modalPrinterStatusBox');
  if (modalStatusBox) {
    modalStatusBox.style.cursor = 'pointer';
    modalStatusBox.addEventListener('click', () => {
      const savedId = localStorage.getItem('pos_printer_id');
      if (savedId) {
        soundEngine.playBeep();
        printModalTestSlip();
      }
    });
  }

  const pairNewBtn = document.getElementById('pairNewPrinterBtn');
  if (pairNewBtn) {
    pairNewBtn.addEventListener('click', pairNewPrinter);
  }

  const testPrintBtn = document.getElementById('modalTestPrintBtn');
  if (testPrintBtn) {
    testPrintBtn.addEventListener('click', printModalTestSlip);
  }

  const forgetBtn = document.getElementById('forgetPrinterBtn');
  if (forgetBtn) {
    forgetBtn.addEventListener('click', forgetCurrentPrinter);
  }

  // Primary Giant "PRINT KOT (KITCHEN) ⚡ [Enter]" Button
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => printKitchenKOT(null, getCustomerNameValue()));
  }

  // Secondary Outline "Print Customer Bill [Space]" Button
  const billBtn = document.getElementById('printCustomerBillBtn');
  if (billBtn) {
    billBtn.addEventListener('click', () => printCustomerBill(null, getCustomerNameValue()));
  }

  // Mobile Ticket Drawer toggles
  const mobileBar = document.getElementById('mobileTicketBar');
  if (mobileBar) {
    mobileBar.addEventListener('click', () => toggleMobileDrawer());
  }

  const closeDrawerBtn = document.getElementById('closeMobileDrawerBtn');
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMobileDrawer();
    });
  }

  const drawerBackdrop = document.getElementById('mobileDrawerBackdrop');
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeMobileDrawer);
  }

  // Fast Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // If user is focused on customerNameInput:
    if (e.target && e.target.id === 'customerNameInput') {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
        if (state.cart.length > 0) {
          printKitchenKOT(null, getCustomerNameValue());
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.target.blur();
      }
      return;
    }

    // Ignore hotkeys if user is focused inside any other input or textarea
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }

    // 1. Enter key: Primary Action -> Sends KOT to kitchen & clears order!
    if (e.key === 'Enter') {
      if (state.cart.length > 0) {
        e.preventDefault();
        printKitchenKOT(null, getCustomerNameValue());
      }
      return;
    }

    // 2. Space key: Secondary Action -> Sends Customer Bill without clearing cart
    if (e.code === 'Space' || e.key === ' ') {
      if (state.cart.length > 0 || state.lastOrder) {
        e.preventDefault();
        printCustomerBill(null, getCustomerNameValue());
      }
      return;
    }

    // 3. Escape key clears ticket
    if (e.key === 'Escape') {
      if (state.cart.length > 0 || state.customerName) {
        clearCart();
      }
      return;
    }

    // 4. Fast hotkey numbers & symbols (1-9, 0, -, =) for speed dialing
    const key = e.key;
    const hotkeyMap = {
      '1': 0, '2': 1, '3': 2, '4': 3,
      '5': 4, '6': 5, '7': 6, '8': 7,
      '9': 8, '0': 9, '-': 10, '=': 11, '+': 11
    };
    if (Object.prototype.hasOwnProperty.call(hotkeyMap, key)) {
      const targetItem = SPEED_ITEMS[hotkeyMap[key]];
      if (targetItem) {
        e.preventDefault();
        soundEngine.playBeep();
        addToCart(targetItem.id);
      }
    }
  });
}

// ============================================================================
// 12. INITIALIZATION
// ============================================================================
function initPOS() {
  renderSpeedGrid();
  updatePOS();
  setupEventListeners();

  const tokenStr = `TOKEN #${String(state.tokenNumber).padStart(3, '0')}`;
  const tokenDisplay = document.getElementById('topTokenDisplay');
  if (tokenDisplay) {
    tokenDisplay.textContent = tokenStr;
  }
  const ticketPanelToken = document.getElementById('ticketPanelToken');
  if (ticketPanelToken) {
    ticketPanelToken.textContent = tokenStr;
  }

  // 1. KILL BACKGROUND PERSISTENT SOCKET ATTEMPTS:
  // Render "🖨️ YD583 Ready" if paired, or "🔴 Connect Printer" if not paired,
  // without invoking any background GATT connection on reload!
  updatePrinterStatusUI();
}

document.addEventListener('DOMContentLoaded', initPOS);
