/**
 * The Artisan Grill & Co. • Speed-Pad Touch POS (High-Throughput Cashier System)
 * Ergonomics: Fixed 4x3 Speed Pad • Zero Scroll • Zero Tabs • Muscle Memory
 * Color Coding: Red/Orange = Burgers, Yellow = Sides/Fries, Blue/Green = Drinks
 *
 * Web Bluetooth Instant Speed Pipeline:
 * - window.printerChar: Global characteristic cache
 * - Keep-Alive Heartbeat: 8-second interval null-byte (0x00)
 * - Zero-Latency Fast Path: Direct 10ms chunked dispatch
 */

// Global Bluetooth Pipeline Cache
window.printerChar = null;
let keepAliveTimer = null;

// ============================================================================
// 1. TOP 12 MOST-SOLD ITEMS (FIXED SPEED-DIAL COORDINATES)
// ============================================================================
// ============================================================================
// 1. SPEED PAD ITEMS (Sirf Urdu Bold Naamo ke sath)
// ============================================================================
const SPEED_ITEMS = [
  {
    id: 'sp-01',
    code: 'B1',
    hotkey: '1',
    name: 'Wagyu Smash Burger',
    shortName: 'واگیو برگر', // Sirf Urdu bold name
    category: 'burger',
    image: 'assets/images/wagyu_smash.jpg',
    price: 1490
  },
  {
    id: 'sp-02',
    code: 'B2',
    hotkey: '2',
    name: 'Smoked Truffle Burger',
    shortName: 'ٹرفل برگر',
    category: 'burger',
    image: 'assets/images/truffle_burger.jpg',
    price: 1350
  },
  {
    id: 'sp-03',
    code: 'B3',
    hotkey: '3',
    name: 'Crispy Jalapeno Burger',
    shortName: 'جلابینو برگر',
    category: 'burger',
    image: 'assets/images/jalapeno_burger.jpg',
    price: 1190
  },
  {
    id: 'sp-04',
    code: 'B4',
    hotkey: '4',
    name: 'Double Cheese Burger',
    shortName: 'ڈبل چیز برگر',
    category: 'burger',
    image: 'assets/images/double_cheese.jpg',
    price: 1090
  },
  {
    id: 'sp-05',
    code: 'S1',
    hotkey: '5',
    name: 'Loaded Truffle Fries',
    shortName: 'لوڈڈ فرائز',
    category: 'side',
    image: 'assets/images/loaded_fries.jpg',
    price: 690
  },
  {
    id: 'sp-06',
    code: 'S2',
    hotkey: '6',
    name: 'Peri Peri Crispy Fries',
    shortName: 'پیری پیری فرائز',
    category: 'side',
    image: 'assets/images/peri_fries.jpg',
    price: 490
  },
  {
    id: 'sp-07',
    code: 'S3',
    hotkey: '7',
    name: 'Gourmet Onion Rings',
    shortName: 'اونین رنگز',
    category: 'side',
    image: 'assets/images/onion_rings.jpg',
    price: 550
  },
  {
    id: 'sp-08',
    code: 'S4',
    hotkey: '8',
    name: 'Buffalo Wings (6 Pcs)',
    shortName: 'بفیلو ونگز',
    category: 'side',
    image: 'assets/images/buffalo_wings.jpg',
    price: 850
  },
  {
    id: 'sp-09',
    code: 'D1',
    hotkey: '9',
    name: 'Mint Lemonade Cooler',
    shortName: 'منٹ کولر',
    category: 'drink',
    image: 'assets/images/mint_cooler.jpg',
    price: 390
  },
  {
    id: 'sp-10',
    code: 'D2',
    hotkey: '0',
    name: 'Artisan Peach Iced Tea',
    shortName: 'پیچ آئس ٹی',
    category: 'drink',
    image: 'assets/images/peach_tea.jpg',
    price: 420
  },
  {
    id: 'sp-11',
    code: 'D3',
    hotkey: '-',
    name: 'Classic Coca-Cola Can',
    shortName: 'کوک کین',
    category: 'drink',
    image: 'assets/images/cola_can.jpg',
    price: 180
  },
  {
    id: 'sp-12',
    code: 'D4',
    hotkey: '=',
    name: 'Caramel Thick Shake',
    shortName: 'کیرامেল شیک',
    category: 'drink',
    image: 'assets/images/caramel_shake.jpg',
    price: 650
  }
];

// ============================================================================
// 2. KITCHEN KOT BUILDER (Customer ka naam aur item bold & prominent)
// ============================================================================
function buildKitchenKotEscPos(order) {
  const b = new EscPosBuilder();
  b.init();

  b.cmd(ESCPOS.ALIGN_CENTER)
    .doubleDivider()
    .cmd(ESCPOS.BOLD_ON)
    .line('*** KITCHEN KOT ***')
    .cmd(ESCPOS.BOLD_OFF)
    .doubleDivider();

  // Token Number (Bohot Bara aur Bold)
  const tokenVal = order.token || String(order.tokenNumber || '000').padStart(3, '0');
  b.cmd(ESCPOS.ALIGN_CENTER)
    .cmd(ESCPOS.TEXT_DOUBLE_SIZE)
    .cmd(ESCPOS.BOLD_ON)
    .line(`TOKEN #${sanitizeAscii(tokenVal)}`)
    .cmd(ESCPOS.TEXT_NORMAL)
    .cmd(ESCPOS.BOLD_OFF);

  // Customer ka Naam (Extra Bold aur Double Height taake chef ko saaf dikhe)
  const rawCustomerName = (order.customerName || 'Counter').trim();
  const customerNameClean = sanitizeAscii(rawCustomerName || 'Counter').toUpperCase();

  b.cmd(ESCPOS.ALIGN_CENTER)
    .cmd(ESCPOS.TEXT_DOUBLE_HEIGHT) // Double height for high visibility
    .cmd(ESCPOS.BOLD_ON)
    .line(`GAHAK: ${customerNameClean}`) // Customer name label
    .cmd(ESCPOS.TEXT_NORMAL)
    .cmd(ESCPOS.BOLD_OFF);

  b.divider()
    .cmd(ESCPOS.BOLD_ON)
    .line('TADAD  ITEM')
    .cmd(ESCPOS.BOLD_OFF)
    .divider();

  // Item List
  (order.items || []).forEach(it => {
    b.cmd(ESCPOS.BOLD_ON)
      .line(`[ ${it.qty} ] ${sanitizeAscii(it.shortName || it.name)}`)
      .cmd(ESCPOS.BOLD_OFF);
  });

  b.divider()
    .line(`KUL ITEMS: ${(order.items || []).reduce((s, i) => s + i.qty, 0)}`)
    .doubleDivider();

  b.feed(3).cut();
  return b.getBytes();
}

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
    } catch (e) { }
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
    } catch (e) { }
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
    } catch (e) { }
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
        title="${item.englishName} - ${formatPKR(item.price)}"
      >
        <!-- Top Section: Clean High-Res Food Thumbnail, Zero Text Overlay Clutter -->
        <div class="tile-image-section">
          <img 
            src="${item.image}" 
            alt="${item.name}" 
            class="tile-thumbnail" 
            loading="eager" 
            draggable="false"
          />
          <span class="tile-hotkey-tag">[${item.hotkey}]</span>
          <span class="tile-qty-badge" id="badge-${item.id}">x${qty}</span>
        </div>

        <!-- Bottom Section: Clear, Non-Overlapping Typography -->
        <div class="tile-info-section">
          <div class="tile-title-group">
            <div class="tile-english-name">${item.name}</div>
            <div class="tile-urdu-name">${item.urduName}</div>
          </div>
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
      if (!tile.classList.contains('has-qty')) tile.classList.add('has-qty');
      const text = `x${qty}`;
      if (badge.textContent !== text) badge.textContent = text;
    } else {
      if (tile.classList.contains('has-qty')) tile.classList.remove('has-qty');
      if (badge.textContent !== '') badge.textContent = '';
    }
  });
}

// Optimized Ultra-Fast Touch Listeners (Zero-delay pointerdown execution)
let isTileTouchDelegated = false;
function attachTileTouchListeners() {
  if (isTileTouchDelegated) return;
  const grid = document.getElementById('speedDialGrid');
  if (!grid) return;

  // 1. Instant punch on pointerdown (eliminates 300ms touch delay)
  grid.addEventListener('pointerdown', (e) => {
    const tile = e.target.closest('.speed-tile');
    if (!tile) return;

    // Prevent synthetic delay & scrolling pauses
    if (e.pointerType === 'touch' || e.pointerType === 'mouse' || e.pointerType === 'pen') {
      e.preventDefault();
    }

    const itemId = tile.dataset.id;
    if (!itemId) return;

    soundEngine.playBeep();
    addToCart(itemId);

    // Instant tactile visual punch
    tile.classList.remove('pulse-active');
    void tile.offsetWidth;
    tile.classList.add('pulse-active');
    setTimeout(() => tile.classList.remove('pulse-active'), 180);
  }, { passive: false });

  // 2. Suppress synthetic duplicate click events
  grid.addEventListener('click', (e) => {
    if (e.target.closest('.speed-tile')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // 3. Right-click / context menu to remove item
  grid.addEventListener('contextmenu', (e) => {
    const tile = e.target.closest('.speed-tile');
    if (tile && tile.dataset.id) {
      e.preventDefault();
      removeItemCompletely(tile.dataset.id);
    }
  });

  isTileTouchDelegated = true;
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
      englishName: itemDef.englishName,
      urduName: itemDef.urduName,
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

// Delegated Touch/Pointer Stepper & Delete Handlers
let isTicketContainerDelegated = false;
function setupTicketContainerDelegation() {
  if (isTicketContainerDelegated) return;
  const container = document.getElementById('ticketItemsContainer');
  if (!container) return;

  container.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const itemId = btn.dataset.id;
    if (!itemId) return;

    e.preventDefault();
    if (action === 'increase') {
      updateCartQty(itemId, 1);
    } else if (action === 'decrease') {
      updateCartQty(itemId, -1);
    } else if (action === 'delete') {
      removeItemCompletely(itemId);
    }
  });

  isTicketContainerDelegated = true;
}

// In-place DOM update without tearing down the container on every tap
function renderTicketItems() {
  const container = document.getElementById('ticketItemsContainer');
  const badge = document.getElementById('ticketCountBadge');
  if (!container) return;

  const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const badgeStr = `${totalQty} ITEM${totalQty === 1 ? '' : 'S'}`;
  if (badge && badge.textContent !== badgeStr) {
    badge.textContent = badgeStr;
  }

  if (state.cart.length === 0) {
    if (!document.getElementById('ticketEmptyState')) {
      container.innerHTML = `
        <div class="ticket-empty-state" id="ticketEmptyState">
          <div class="empty-icon">🧾</div>
          <p class="empty-title">Ticket is Empty</p>
          <p class="empty-sub">Tap any Speed-Pad tile on the left to punch items</p>
        </div>
      `;
    }
    return;
  }

  const emptyState = document.getElementById('ticketEmptyState');
  if (emptyState) {
    emptyState.remove();
  }

  // Remove rows no longer in cart
  const cartIds = new Set(state.cart.map(i => i.id));
  const currentRows = container.querySelectorAll('.ticket-item-row');
  currentRows.forEach(row => {
    if (!cartIds.has(row.dataset.id)) {
      row.remove();
    }
  });

  // In-place update existing or append new
  state.cart.forEach(item => {
    let row = container.querySelector(`.ticket-item-row[data-id="${item.id}"]`);
    const subtotalStr = formatPKR(item.price * item.qty);

    if (row) {
      const valEl = row.querySelector('.touch-step-val');
      if (valEl && valEl.textContent !== String(item.qty)) {
        valEl.textContent = item.qty;
      }
      const subtotalEl = row.querySelector('.ticket-item-subtotal');
      if (subtotalEl && subtotalEl.textContent !== subtotalStr) {
        subtotalEl.textContent = subtotalStr;
      }
    } else {
      const newRow = document.createElement('div');
      newRow.className = 'ticket-item-row';
      newRow.dataset.id = item.id;
      newRow.innerHTML = `
        <div class="ticket-item-left">
          <div class="ticket-item-title-row">
            <span class="ticket-item-name">${item.name}</span>
            ${item.urduName ? `<span class="ticket-item-urdu">${item.urduName}</span>` : ''}
          </div>
          <div class="ticket-item-pricing">
            <span class="ticket-item-unit-price">${formatPKR(item.price)} each</span>
            <span class="ticket-item-subtotal">${subtotalStr}</span>
          </div>
        </div>
        <div class="ticket-item-right">
          <div class="touch-stepper">
            <button class="touch-step-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">−</button>
            <span class="touch-step-val">${item.qty}</span>
            <button class="touch-step-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
          <button class="ticket-item-del-btn" data-action="delete" data-id="${item.id}" title="Remove line item">✕</button>
        </div>
      `;
      container.appendChild(newRow);
    }
  });

  setupTicketContainerDelegation();
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
    billBtn.style.display = 'none';
  }
}

// ============================================================================
// 8. ESC/POS THERMAL PROTOCOL WITH WORD-WRAPPING (58mm / 32 Cols)
// - NO TRUNCATION (e.g. no "CRUNCH BUR")
// - 4 EMPTY LINE FEEDS + CUT GUIDE ("- - - TEAR HERE - - -") BETWEEN SLIPS
// ============================================================================
const ESC = 0x1B;
const GS = 0x1D;
const FS = 0x1C;
const LF = 0x0A;

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

// 1. Kitchen KOT ESC/POS Generator (Strict Minimal Clutter-Free Payload)
function buildKitchenKotEscPos(order) {
  const b = new EscPosBuilder();
  b.init();

  b.cmd(ESCPOS.ALIGN_CENTER)
    .doubleDivider()
    .cmd(ESCPOS.BOLD_ON)
    .line('*** KITCHEN KOT ***')
    .cmd(ESCPOS.BOLD_OFF)
    .doubleDivider();

  // Token Number (Bohot Bara aur Bold)
  const tokenVal = order.token || String(order.tokenNumber || '000').padStart(3, '0');
  b.cmd(ESCPOS.ALIGN_CENTER)
    .cmd(ESCPOS.TEXT_DOUBLE_SIZE)
    .cmd(ESCPOS.BOLD_ON)
    .line(`TOKEN #${sanitizeAscii(tokenVal)}`)
    .cmd(ESCPOS.TEXT_NORMAL)
    .cmd(ESCPOS.BOLD_OFF);

  // Customer ka Naam (Extra Bold aur Double Height taake chef ko saaf dikhe)
  const rawCustomerName = (order.customerName || 'Counter').trim();
  const customerNameClean = sanitizeAscii(rawCustomerName || 'Counter').toUpperCase();

  b.cmd(ESCPOS.ALIGN_CENTER)
    .cmd(ESCPOS.TEXT_DOUBLE_HEIGHT) // Double height for high visibility
    .cmd(ESCPOS.BOLD_ON)
    .line(`GAHAK: ${customerNameClean}`) // Customer name label
    .cmd(ESCPOS.TEXT_NORMAL)
    .cmd(ESCPOS.BOLD_OFF);

  b.divider()
    .cmd(ESCPOS.BOLD_ON)
    .line('TADAD  ITEM')
    .cmd(ESCPOS.BOLD_OFF)
    .divider();

  // Item List
  (order.items || []).forEach(it => {
    b.cmd(ESCPOS.BOLD_ON)
      .line(`[ ${it.qty} ] ${sanitizeAscii(it.shortName || it.name)}`)
      .cmd(ESCPOS.BOLD_OFF);
  });

  b.divider()
    .line(`KUL ITEMS: ${(order.items || []).reduce((s, i) => s + i.qty, 0)}`)
    .doubleDivider();

  b.feed(3).cut();
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
 * Web Bluetooth Keep-Alive Heartbeat:
 * Sends a harmless null byte (0x00) every 8 seconds via window.printerChar to prevent
 * YD583/MPT-II peripheral firmware from timing out into standby sleep.
 */
function startKeepAliveHeartbeat() {
  stopKeepAliveHeartbeat();
  keepAliveTimer = setInterval(async () => {
    const char = window.printerChar || state.writeCharacteristic;
    const dev = state.bluetoothDevice;
    if (char && dev && dev.gatt && dev.gatt.connected) {
      try {
        if (typeof char.writeValueWithoutResponse === 'function') {
          await char.writeValueWithoutResponse(new Uint8Array([0x00]));
        } else if (typeof char.writeValue === 'function') {
          await char.writeValue(new Uint8Array([0x00]));
        }
      } catch (e) {
        console.warn('[Keep-Alive] Heartbeat ping skipped/failed:', e);
      }
    } else {
      stopKeepAliveHeartbeat();
    }
  }, 8000);
}

function stopKeepAliveHeartbeat() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

/**
 * Clean peripheral disconnect / standby listener:
 * When the printer goes idle and drops the physical link 10 seconds later to save battery,
 * cleanly resets internal GATT handles and keeps the UI at "🖨️ YD583 Ready".
 * Does NOT trigger an error toast!
 */
function onDisconnected(event) {
  console.log('Bluetooth thermal printer link closed / standby:', event);
  stopKeepAliveHeartbeat();
  state.printerConnected = false;
  state.gattServer = null;
  state.writeCharacteristic = null;
  window.writeCharacteristic = null;
  window.printerChar = null;
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
  stopKeepAliveHeartbeat();
  window.printerChar = null;
  window.writeCharacteristic = null;
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
            window.printerChar = char;
            state.writeCharacteristic = char;
            window.writeCharacteristic = char;
            return char;
          }
        }
      } catch (e) { }
    }
  } catch (e) { }

  // 2. Fallback to known PRINTER_SERVICES
  for (const serviceUuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          window.printerChar = char;
          state.writeCharacteristic = char;
          window.writeCharacteristic = char;
          return char;
        }
      }
    } catch (e) { }
  }

  return null;
}

let isPrintSpoolerBusy = false;
const spoolerQueue = [];

/**
 * 2. WEB BLUETOOTH INSTANT SPEED PIPELINE:
 * - Single unified async printing wrapper dispatchPrintJob(escposBytes)
 * - Zero-Latency Print: Check if window.printerChar exists & device connected -> Immediate write!
 * - No service re-discovery overhead on hot prints
 * - 100-byte slices with 10ms intervals
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
    console.warn('[Bluetooth Speed Pipeline] Print execution error:', err);
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

  let dev = state.bluetoothDevice;
  let char = window.printerChar || state.writeCharacteristic;

  // Zero-Latency Fast Path:
  // If window.printerChar exists and peripheral GATT is currently connected,
  // skip all device querying and service re-discovery!
  const isDirectReady = !!(char && dev && dev.gatt && dev.gatt.connected);

  if (!isDirectReady) {
    dev = await getOrRestoreBluetoothDevice();

    if (!dev || !dev.gatt) {
      if (!navigator.bluetooth || typeof navigator.bluetooth.requestDevice !== 'function') {
        showToast('⚠️ Web Bluetooth is not supported in this browser.');
        throw new Error('Web Bluetooth requestDevice not available');
      }

      try {
        dev = await navigator.bluetooth.requestDevice({
          filters: PRINTER_NAME_PREFIXES.map(prefix => ({ namePrefix: prefix })),
          optionalServices: PRINTER_SERVICES
        });
      } catch (filterErr) {
        if (filterErr.name === 'NotFoundError') {
          showToast('⚠️ Bluetooth pairing cancelled');
          return false;
        }
        dev = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: PRINTER_SERVICES
        });
      }

      if (!dev) {
        return false;
      }

      const rawName = dev.name && dev.name.trim() ? dev.name.trim() : 'YD583';
      const savedName = rawName.toUpperCase().includes('YD583') ? 'YD583' : (rawName.toUpperCase().includes('MPT') ? 'MPT-II' : rawName);

      state.bluetoothDevice = dev;
      localStorage.setItem('pos_printer_id', dev.id);
      localStorage.setItem('pos_printer_name', savedName);
      attachGattListeners(dev);
    }

    // Connect GATT server if disconnected
    let server = dev.gatt;
    if (!server || !server.connected) {
      attachGattListeners(dev);
      console.log(`[Bluetooth Speed Pipeline] Connecting GATT to ${dev.name || 'Printer'}...`);
      try {
        server = await dev.gatt.connect();
        state.gattServer = server;
      } catch (connectErr) {
        console.warn('[Bluetooth Speed Pipeline] Connect rejected, retrying in 300ms...', connectErr);
        await new Promise(res => setTimeout(res, 300));
        server = await dev.gatt.connect();
        state.gattServer = server;
      }
    }

    // Resolve writable characteristic dynamically
    char = await resolveWriteCharacteristic(server);
    if (!char) {
      throw new Error('Writable GATT characteristic not found on printer peripheral');
    }

    window.printerChar = char;
    window.writeCharacteristic = char;
    state.writeCharacteristic = char;
    state.printerConnected = true;

    // Start 8-second keep-alive heartbeat to prevent peripheral sleeping
    startKeepAliveHeartbeat();
  } else {
    // Zero-latency path: ensure heartbeat is running
    if (!keepAliveTimer) {
      startKeepAliveHeartbeat();
    }
  }

  // Zero-Latency Direct Write:
  // Write raw ESC/POS bytes immediately via writeValueWithoutResponse() in 100-byte slices with 10ms intervals
  const CHUNK_SIZE = 100;
  const CHUNK_DELAY_MS = 10;

  for (let offset = 0; offset < escposBytes.length; offset += CHUNK_SIZE) {
    const chunk = escposBytes.slice(offset, offset + CHUNK_SIZE);
    if (typeof char.writeValueWithoutResponse === 'function') {
      await char.writeValueWithoutResponse(chunk);
    } else if (typeof char.writeValueWithResponse === 'function') {
      await char.writeValueWithResponse(chunk);
    } else {
      await char.writeValue(chunk);
    }
    if (offset + CHUNK_SIZE < escposBytes.length) {
      await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
    }
  }

  console.log('[Bluetooth Speed Pipeline] Print job dispatched in zero latency (10ms chunks).');
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

    // Attempt immediate connection to populate global cache and start heartbeat
    try {
      const server = await device.gatt.connect();
      state.gattServer = server;
      const char = await resolveWriteCharacteristic(server);
      if (char) {
        window.printerChar = char;
        window.writeCharacteristic = char;
        state.writeCharacteristic = char;
        state.printerConnected = true;
        startKeepAliveHeartbeat();
      }
    } catch (e) {
      console.debug('Immediate pair connect deferred to on-demand print:', e);
    }

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
 * Forget printer: clears stored device, stops heartbeat, resets UI
 */
function forgetCurrentPrinter() {
  stopKeepAliveHeartbeat();

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
  window.printerChar = null;
  state.printerConnected = false;
  state.printerStatus = 'unpaired';

  // Cleanly reset UI status to "🔴 Connect Printer"
  updatePrinterStatusUI('unpaired');
  showToast('Printer forgotten. Reset to Connect Printer.');
}

async function printModalTestSlip() {
  soundEngine.playBeep();
  try {
    const testBytes = buildKitchenKotEscPos({
      token: "000",
      tokenNumber: 0,
      tokenFormatted: "TOKEN #000",
      customerName: "TEST PRINT",
      timestamp: `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-PK')}`,
      date: new Date().toLocaleDateString('en-GB'),
      items: [{ name: "TEST PRINT SUCCESS", englishName: "TEST PRINT SUCCESS", qty: 1, price: 0 }]
    });
    await dispatchPrintJob(testBytes);
    soundEngine.playPrinterFeed();
    showToast('✅ Test KOT Slip Printed!');
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

  // Mobile Ticket Drawer toggles
  const mobileBar = document.getElementById('mobileTicketBar');
  if (mobileBar) {
    mobileBar.addEventListener('click', () => toggleMobileDrawer());
  }

  const mobileTotal = document.getElementById('mobileTotalDisplay');
  if (mobileTotal) {
    mobileTotal.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileDrawer(true);
    });
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

    // 1. Enter key or Space key: Primary Action -> Sends KOT to kitchen & clears order!
    if (e.key === 'Enter' || e.code === 'Space' || e.key === ' ') {
      if (state.cart.length > 0) {
        e.preventDefault();
        printKitchenKOT(null, getCustomerNameValue());
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
