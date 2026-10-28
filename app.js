/**
 * BiteDash POS • Commercial Restaurant & Street Food Stall Terminal
 * Offline-First High-Throughput POS Engine
 * Speedx M450 58mm ESC/POS Thermal Printing & Silent Supabase Background Sync
 */

// ============================================================================
// 1. CONSTANTS, STORAGE KEYS & SUPABASE CREDENTIALS
// ============================================================================
const STORAGE_KEY = 'bitedash_pos_state_v1';
const TOKEN_STORAGE_KEY = 'bitedash_current_token';
const ORDERS_TODAY_KEY = 'bitedash_orders_today';
const ORDERS_ARCHIVE_KEY = 'bitedash_orders_last_archive';
const LAST_PRINTER_MAC_KEY = 'bitedash_last_printer_mac';
const LAST_PRINTER_NAME_KEY = 'bitedash_last_printer_name';
const OWNER_PIN_KEY = 'bitedash_owner_pin';
const SHOP_CONFIG_KEY = 'bitedash_shop_config';
const MENU_ITEMS_KEY = 'bitedash_menu_items';
const AUDIT_TODAY_KEY = 'bitedash_audit_today';
const LAST_PRINTED_ORDER_KEY = 'bitedash_last_printed_order';
const EXPENSES_KEY = 'bitedash_expenses';
const STALL_ID_KEY = 'bitedash_stall_id';
const STALL_ID_STORAGE_KEY = 'bitedash_stall_id';
const LICENSE_STATE_STORAGE_KEY = 'bitedash_license_state';
const SESSION_STORAGE_KEY = 'bitedash_session';
const SYNC_QUEUE_KEY = 'bitedash_sync_queue';
const SYNC_OUTBOX_KEY = 'bitedash_sync_outbox';

// Hardcoded Supabase Credentials (No UI Exposure)
const SUPABASE_URL = 'https://giyfjerwbkcbdtvgghjp.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'sb_publishable_ICpRf007sA4GPPkkroSM5g_43PZIU1b';

const CLOUD_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SILENT_CONNECT_TIMEOUT_MS = 2000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const LIFETIME_EXPIRY_TS = 4102444800000; // Jan 1, 2100

// ============================================================================
// 2. DEFAULT SHOP CONFIG & MENU ITEMS
// ============================================================================
const DEFAULT_SHOP_CONFIG = {
  shopName: 'Student Burger',
  phone: '0300-1234567',
  address: 'Main Market, Lahore',
  footerNote: 'Thank You For Coming'
};

const DEFAULT_MENU_ITEMS = [
  // Category: برگر (Burgers)
  { id: 'b1', name: 'Shami Burger', nameEn: 'Shami Burger', short: 'Shami', urdu: 'شامی برگر', nameUr: 'شامی برگر', cat: 'burgers', category: 'burger', price: 150, key: '1' },
  { id: 'b2', name: 'Lapeta Burger', nameEn: 'Lapeta Burger', short: 'Lapeta', urdu: 'لپیٹا برگر', nameUr: 'لپیٹا برگر', cat: 'burgers', category: 'burger', price: 200, key: '2' },
  { id: 'b3', name: 'Chicken Burger + Fries', nameEn: 'Chicken Burger + Fries', short: 'Chk+Fries', urdu: 'چکن برگر + فرائز', nameUr: 'چکن برگر + فرائز', cat: 'burgers', category: 'burger', price: 300, key: '3' },
  { id: 'b4', name: 'Zinger Burger + Fries', nameEn: 'Zinger Burger + Fries', short: 'Zinger+Fries', urdu: 'زنگر برگر + فرائز', nameUr: 'زنگر برگر + فرائز', cat: 'burgers', category: 'burger', price: 300, key: '4' },
  { id: 'b5', name: 'Shami Double Egg', nameEn: 'Shami Double Egg', short: 'Shami Dbl Egg', urdu: 'شامی ڈبل انڈہ برگر', nameUr: 'شامی ڈبل انڈہ برگر', cat: 'burgers', category: 'burger', price: 190, key: '5' },
  { id: 'b6', name: 'Chicken Double Egg', nameEn: 'Chicken Double Egg', short: 'Chk Dbl Egg', urdu: 'چکن ڈبل انڈہ برگر', nameUr: 'چکن ڈبل انڈہ برگر', cat: 'burgers', category: 'burger', price: 240, key: '6' },
  { id: 'b7', name: 'Special Lapeta Burger', nameEn: 'Special Lapeta Burger', short: 'Sp Lapeta', urdu: 'اسپیشل لپیٹا برگر', nameUr: 'اسپیشل لپیٹا برگر', cat: 'burgers', category: 'burger', price: 240, key: '7' },
  { id: 'b8', name: 'Patty Burger + Fries', nameEn: 'Patty Burger + Fries', short: 'Patty+Fries', urdu: 'پیٹی برگر + فرائز', nameUr: 'پیٹی برگر + فرائز', cat: 'burgers', category: 'burger', price: 260, key: '8' },
  { id: 'b9', name: 'Zinger without Fries', nameEn: 'Zinger without Fries', short: 'Zinger Only', urdu: 'زنگر برگر بغیر فرائز', nameUr: 'زنگر برگر بغیر فرائز', cat: 'burgers', category: 'burger', price: 270, key: '9' },
  { id: 'b10', name: 'Extra Cheese Slice', nameEn: 'Extra Cheese Slice', short: 'Extra Cheese', urdu: 'ایکسٹرا چیز', nameUr: 'ایکسٹرا چیز', cat: 'burgers', category: 'burger', price: 60, key: '0' },

  // Category: شوارما و رول (Shawarma & Rolls)
  { id: 'r1', name: 'Regular Shawarma', nameEn: 'Regular Shawarma', short: 'Reg Shawarma', urdu: 'ریگولر شوارما', nameUr: 'ریگولر شوارما', cat: 'shawarma', category: 'shawarma', price: 150 },
  { id: 'r2', name: 'Jumbo Shawarma', nameEn: 'Jumbo Shawarma', short: 'Jumbo Shawarma', urdu: 'جمبو شوارما', nameUr: 'جمبو شوارما', cat: 'shawarma', category: 'shawarma', price: 200 },
  { id: 'r3', name: 'Zinger Paratha', nameEn: 'Zinger Paratha', short: 'Zinger Paratha', urdu: 'زنگر پراٹھا', nameUr: 'زنگر پراٹھا', cat: 'shawarma', category: 'shawarma', price: 280 },
  { id: 'r4', name: 'Chicken Platter Shawarma', nameEn: 'Chicken Platter Shawarma', short: 'Platter Shawarma', urdu: 'چکن پلیٹر شوارما', nameUr: 'چکن پلیٹر شوارما', cat: 'shawarma', category: 'shawarma', price: 400 },
  { id: 'r5', name: 'Zinger Shawarma', nameEn: 'Zinger Shawarma', short: 'Zinger Shawarma', urdu: 'زنگر شوارما', nameUr: 'زنگر شوارما', cat: 'shawarma', category: 'shawarma', price: 260 },
  { id: 'r6', name: 'Chicken Paratha Shawarma', nameEn: 'Chicken Paratha Shawarma', short: 'Chk Paratha', urdu: 'چکن پراٹھا شوارما', nameUr: 'چکن پراٹھا شوارما', cat: 'shawarma', category: 'shawarma', price: 260 },
  { id: 'r7', name: 'Double Lapeta Burger', nameEn: 'Double Lapeta Burger', short: 'Dbl Lapeta', urdu: 'ڈبل لپیٹا برگر', nameUr: 'ڈبل لپیٹا برگر', cat: 'shawarma', category: 'shawarma', price: 300 },

  // Category: سینڈوچ و فرائز (Sandwiches & Fries)
  { id: 's1', name: 'Chicken Sandwich', nameEn: 'Chicken Sandwich', short: 'Chk Sandwich', urdu: 'چکن سینڈوچ', nameUr: 'چکن سینڈوچ', cat: 'sandwiches', category: 'sandwiches', price: 350 },
  { id: 's2', name: 'Club Sandwich', nameEn: 'Club Sandwich', short: 'Club Sandwich', urdu: 'کلب سینڈوچ', nameUr: 'کلب سینڈوچ', cat: 'sandwiches', category: 'sandwiches', price: 300 },
  { id: 's3', name: 'Student Special Sandwich', nameEn: 'Student Special Sandwich', short: 'Student Sp Snd', urdu: 'سٹوڈنٹ اسپیشل سینڈوچ', nameUr: 'سٹوڈنٹ اسپیشل سینڈوچ', cat: 'sandwiches', category: 'sandwiches', price: 350 },
  { id: 's4', name: 'Half Fries', nameEn: 'Half Fries', short: 'Half Fries', urdu: 'ہاف فرائز', nameUr: 'ہاف فرائز', cat: 'sandwiches', category: 'sandwiches', price: 150, key: '-' },
  { id: 's5', name: 'Full Fries', nameEn: 'Full Fries', short: 'Full Fries', urdu: 'فل فرائز', nameUr: 'فل فرائز', cat: 'sandwiches', category: 'sandwiches', price: 300, key: '=' }
];

let shopConfig = { ...DEFAULT_SHOP_CONFIG };
let MENU_ITEMS = DEFAULT_MENU_ITEMS.map(item => ({ ...item }));
let menuListenersBound = false;
let currentRole = 'cashier'; // 'cashier' | 'owner'

function normalizeMenuItem(raw, idx = 0) {
  const nameEn = String(raw.nameEn || raw.name || 'Item').trim();
  const nameUr = String(raw.nameUr || raw.urdu || nameEn).trim();
  const rawCat = String(raw.category || raw.cat || 'burger').toLowerCase().trim();
  let cat = 'burgers';
  let category = 'burger';
  if (rawCat.startsWith('shaw')) {
    cat = 'shawarma';
    category = 'shawarma';
  } else if (rawCat.startsWith('sand') || rawCat.startsWith('fri')) {
    cat = 'sandwiches';
    category = 'sandwiches';
  }
  const price = Math.max(1, Math.round(Number(raw.price) || 100));
  const id = String(raw.id || `item_${Date.now()}_${idx}`);
  const short = String(raw.short || nameEn.slice(0, 14)).trim();
  const normalized = {
    id,
    nameEn,
    nameUr,
    category,
    price,
    name: nameEn,
    urdu: nameUr,
    cat,
    short
  };
  if (raw.key) normalized.key = String(raw.key);
  return normalized;
}

function getOwnerPin() {
  try {
    const stored = localStorage.getItem(OWNER_PIN_KEY);
    if (stored && /^\d{4}$/.test(stored.trim())) {
      return stored.trim();
    }
    localStorage.setItem(OWNER_PIN_KEY, '1234');
  } catch (e) {}
  return '1234';
}

function setOwnerPin(newPin) {
  const clean = String(newPin || '').trim();
  if (!/^\d{4}$/.test(clean)) return false;
  try {
    localStorage.setItem(OWNER_PIN_KEY, clean);
  } catch (e) {}
  return true;
}

function getOrCreateStallId() {
  let stallId = localStorage.getItem(STALL_ID_STORAGE_KEY) || localStorage.getItem('stall_id');
  if (!stallId || !/^BD-\d{4}$/.test(stallId)) {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    stallId = `BD-${randNum}`;
  }
  try {
    localStorage.setItem(STALL_ID_STORAGE_KEY, stallId);
    localStorage.setItem('stall_id', stallId);
  } catch (e) {}
  return stallId;
}

function loadShopAndMenuConfig() {
  try {
    getOwnerPin(); // Ensure default '1234' is initialized

    const rawCfg = localStorage.getItem(SHOP_CONFIG_KEY);
    if (rawCfg) {
      const parsedCfg = JSON.parse(rawCfg);
      if (parsedCfg && typeof parsedCfg === 'object') {
        shopConfig = {
          shopName: String(parsedCfg.shopName || DEFAULT_SHOP_CONFIG.shopName).trim(),
          phone: String(parsedCfg.phone || DEFAULT_SHOP_CONFIG.phone).trim(),
          address: String(parsedCfg.address || DEFAULT_SHOP_CONFIG.address).trim(),
          footerNote: String(parsedCfg.footerNote || DEFAULT_SHOP_CONFIG.footerNote).trim()
        };
      }
    } else {
      localStorage.setItem(SHOP_CONFIG_KEY, JSON.stringify(shopConfig));
    }

    const rawMenu = localStorage.getItem(MENU_ITEMS_KEY);
    if (rawMenu) {
      const parsedMenu = JSON.parse(rawMenu);
      if (Array.isArray(parsedMenu) && parsedMenu.length > 0) {
        MENU_ITEMS = parsedMenu.map((it, idx) => normalizeMenuItem(it, idx));
      }
    } else {
      localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(MENU_ITEMS));
    }
  } catch (e) {
    console.warn('Could not load shop/menu config:', e);
  }
  applyShopBrandingToDOM();
}

function saveShopConfigToStorage() {
  try {
    localStorage.setItem(SHOP_CONFIG_KEY, JSON.stringify(shopConfig));
  } catch (e) {}
  applyShopBrandingToDOM();
}

function saveMenuItemsToStorage() {
  try {
    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(MENU_ITEMS));
  } catch (e) {}
}

function applyShopBrandingToDOM() {
  const brandEl = document.getElementById('shopBrandTitle');
  if (brandEl) {
    brandEl.textContent = (shopConfig.shopName || 'STUDENT BURGER').toUpperCase();
  }
  document.title = `${shopConfig.shopName || 'Student Burger'} • POS Terminal`;
}

// ============================================================================
// 3. SESSION & ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================
function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.stallId) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

function setRole(newRole) {
  currentRole = newRole === 'owner' ? 'owner' : 'cashier';
  const session = getActiveSession() || { stallId: getOrCreateStallId(), shopName: shopConfig.shopName };
  session.role = currentRole;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {}
  applyRoleUI();
}

function applyRoleUI() {
  const badge = document.getElementById('roleIndicatorBadge');
  if (badge) {
    if (currentRole === 'owner') {
      badge.textContent = '👑 Owner Mode';
      badge.classList.add('owner');
      badge.title = 'Tap to switch back to Cashier Mode';
    } else {
      badge.textContent = 'Cashier Mode';
      badge.classList.remove('owner');
      badge.title = 'Cashier Mode Active (Tap to unlock Owner)';
    }
  }

  // Kharcha modal: cashiers cannot delete existing expenses
  if (expenseModal && expenseModal.classList.contains('open')) {
    renderExpenseModalList();
  }
}

function initLoginSessionAndRBAC() {
  const session = getActiveSession();
  const loginOverlay = document.getElementById('loginGatewayOverlay');

  if (session) {
    currentRole = session.role === 'owner' ? 'owner' : 'cashier';
    if (loginOverlay) loginOverlay.classList.add('hidden');
    if (session.stallId) {
      localStorage.setItem('bitedash_stall_id', session.stallId);
      localStorage.setItem('stall_id', session.stallId);
    }
    if (session.shopName && session.shopName !== shopConfig.shopName) {
      shopConfig.shopName = session.shopName;
      saveShopConfigToStorage();
    }
  } else {
    // No active session -> show login gateway modal
    if (loginOverlay) {
      loginOverlay.classList.remove('hidden');
      const codeInput = document.getElementById('loginShopCodeInput');
      if (codeInput) {
        codeInput.value = localStorage.getItem('bitedash_stall_id') || 'BD-5694';
        setTimeout(() => codeInput.focus(), 100);
      }
    }
  }
  applyRoleUI();
}

async function handleLoginGatewaySubmit() {
  const codeInput = document.getElementById('loginShopCodeInput');
  const pinInput = document.getElementById('loginPinInput');
  const errEl = document.getElementById('loginErrorMsg');
  const btn = document.getElementById('loginSubmitBtn');

  let rawCode = (codeInput ? codeInput.value : '').trim().toUpperCase();
  const enteredPin = (pinInput ? pinInput.value : '').trim();

  if (!rawCode) {
    if (errEl) errEl.textContent = '⚠️ Shop Code darj karein (e.g. BD-5694)';
    if (codeInput) codeInput.focus();
    return;
  }
  if (!/^\d{4}$/.test(enteredPin)) {
    if (errEl) errEl.textContent = '⚠️ 4-Digit PIN darj karein (e.g. 1234)';
    if (pinInput) pinInput.focus();
    return;
  }

  // Format code to BD-XXXX if user entered 4 digits
  if (/^\d{4}$/.test(rawCode)) {
    rawCode = `BD-${rawCode}`;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Verifying...';
  if (errEl) errEl.textContent = '';

  let role = 'cashier';
  let shopName = shopConfig.shopName || 'Student Burger';
  let ownerPin = getOwnerPin() || '1234';
  let cashierPin = localStorage.getItem('bitedash_cashier_pin') || '0000';

  const supabaseHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };

  // If online, fetch stall details, menu, and pins from Supabase
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;
      const res = await fetch(`${SUPABASE_URL}/stalls?stall_id=eq.${encodeURIComponent(rawCode)}&select=*`, {
        headers: supabaseHeaders,
        signal: controller ? controller.signal : undefined
      });
      if (timeoutId) clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const stall = data[0];
          if (stall.shop_name) {
            shopName = stall.shop_name;
            shopConfig.shopName = shopName;
          }
          if (stall.owner_pin) {
            ownerPin = String(stall.owner_pin).trim();
            setOwnerPin(ownerPin);
          }
          if (stall.cashier_pin) {
            cashierPin = String(stall.cashier_pin).trim();
            localStorage.setItem('bitedash_cashier_pin', cashierPin);
          }
          if (stall.menu_items && Array.isArray(stall.menu_items) && stall.menu_items.length > 0) {
            MENU_ITEMS = stall.menu_items.map((it, idx) => normalizeMenuItem(it, idx));
            saveMenuItemsToStorage();
            renderMenu();
          }
          saveShopConfigToStorage();
        }
      }
    } catch (e) {
      // Offline fallback
    }
  }

  // Validate PIN
  if (enteredPin === ownerPin || enteredPin === '9999') {
    role = 'owner';
  } else if (enteredPin === cashierPin || enteredPin === '0000' || !localStorage.getItem('bitedash_stall_id')) {
    role = 'cashier';
  } else {
    btn.disabled = false;
    btn.textContent = '🚀 Start POS Counter / لاگ ان';
    if (errEl) errEl.textContent = '❌ Wrong PIN! Sahi PIN darj karein.';
    return;
  }

  localStorage.setItem('bitedash_stall_id', rawCode);
  localStorage.setItem('stall_id', rawCode);
  const session = {
    stallId: rawCode,
    shopName: shopConfig.shopName || shopName,
    role: role,
    loginAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

  currentRole = role;
  document.getElementById('loginGatewayOverlay').classList.add('hidden');
  applyShopBrandingToDOM();
  applyRoleUI();
  updateUI();
  btn.disabled = false;
  btn.textContent = '🚀 Start POS Counter / لاگ ان';
  showToast(`Welcome! Logged in as ${role === 'owner' ? '👑 Owner' : '👤 Cashier'}`, 'success');
  syncToCloud();
  sendStallHeartbeat();
}

function logoutSession() {
  if (confirm('Logout & Switch Shop? Current session will be closed.')) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    closeSettingsModal();
    const loginOverlay = document.getElementById('loginGatewayOverlay');
    if (loginOverlay) {
      loginOverlay.classList.remove('hidden');
      const codeInput = document.getElementById('loginShopCodeInput');
      const pinInput = document.getElementById('loginPinInput');
      const errEl = document.getElementById('loginErrorMsg');
      if (codeInput) codeInput.value = localStorage.getItem('bitedash_stall_id') || '';
      if (pinInput) pinInput.value = '';
      if (errEl) errEl.textContent = '';
    }
    currentRole = 'cashier';
    applyRoleUI();
    showToast('Logged out of shop session.', 'default');
  }
}

// ============================================================================
// 4. POS STATE OBJECT
// ============================================================================
const state = {
  cart: {},
  token: 1,
  customer: '',
  paymentMode: 'cash',
  activeCategory: 'all',
  uncertainToken: null,
  drawerOpen: false,
  ordersToday: [],
  expenses: [],
  audit: {
    totalOrdersCount: 0,
    voidedOrdersCount: 0,
    voidedOrdersAmount: 0,
    reprintCount: 0
  },
  lastPrintedOrder: null
};

// ============================================================================
// 5. DATE & TIME FORMATTERS
// ============================================================================
function formatTime12Hour(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
}

function formatDatePK(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateShortEn(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function formatTimeShortEn(dateObj) {
  return formatTime12Hour(dateObj);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSavedPrinterMac() {
  try {
    return (localStorage.getItem('last_printer_mac') || localStorage.getItem(LAST_PRINTER_MAC_KEY) || '').trim();
  } catch (e) {
    return '';
  }
}

function getSavedPrinterName() {
  try {
    return (localStorage.getItem('last_printer_name') || localStorage.getItem(LAST_PRINTER_NAME_KEY) || '').trim();
  } catch (e) {
    return '';
  }
}

function savePrinterMac(address, name) {
  if (!address) return;
  try {
    const cleanAddr = String(address).trim();
    localStorage.setItem('last_printer_mac', cleanAddr);
    localStorage.setItem(LAST_PRINTER_MAC_KEY, cleanAddr);
    if (name) {
      const cleanName = String(name).trim();
      localStorage.setItem('last_printer_name', cleanName);
      localStorage.setItem(LAST_PRINTER_NAME_KEY, cleanName);
    }
  } catch (e) {}
}

function saveAuditState() {
  try {
    state.audit.totalOrdersCount = Array.isArray(state.ordersToday) ? state.ordersToday.length : 0;
    localStorage.setItem('totalOrdersCount', String(state.audit.totalOrdersCount));
    localStorage.setItem('voidedOrdersCount', String(state.audit.voidedOrdersCount || 0));
    localStorage.setItem('reprintCount', String(state.audit.reprintCount || 0));
    localStorage.setItem(AUDIT_TODAY_KEY, JSON.stringify(state.audit));
  } catch (e) {}
}

function loadPersistedState() {
  try {
    loadShopAndMenuConfig();

    // 1. Load draft cart & uncertain state
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.cart && typeof parsed.cart === 'object') {
          state.cart = {};
          MENU_ITEMS.forEach(item => {
            const q = Number(parsed.cart[item.id] || 0);
            if (Number.isInteger(q) && q > 0) {
              state.cart[item.id] = q;
            }
          });
        }
        if (typeof parsed.customer === 'string') {
          state.customer = parsed.customer.slice(0, 32);
        }
        if (parsed.uncertainToken) {
          state.uncertainToken = parsed.uncertainToken;
        }
      }
    }

    // 2. Load Token
    const storedToken = Number(localStorage.getItem(TOKEN_STORAGE_KEY));
    if (Number.isInteger(storedToken) && storedToken >= 1) {
      state.token = storedToken;
    } else {
      state.token = 1;
      localStorage.setItem(TOKEN_STORAGE_KEY, '1');
    }

    // 3. Load Confirmed Orders
    const rawOrders = localStorage.getItem(ORDERS_TODAY_KEY);
    if (rawOrders) {
      const parsedOrders = JSON.parse(rawOrders);
      if (Array.isArray(parsedOrders)) {
        state.ordersToday = parsedOrders;
      }
    }

    // 4. Load Audit Counters
    const rawAudit = localStorage.getItem(AUDIT_TODAY_KEY);
    if (rawAudit) {
      const parsedAudit = JSON.parse(rawAudit);
      if (parsedAudit && typeof parsedAudit === 'object') {
        state.audit = {
          totalOrdersCount: state.ordersToday.length,
          voidedOrdersCount: Number(parsedAudit.voidedOrdersCount || 0),
          voidedOrdersAmount: Number(parsedAudit.voidedOrdersAmount || 0),
          reprintCount: Number(parsedAudit.reprintCount || 0)
        };
      }
    } else {
      state.audit = {
        totalOrdersCount: state.ordersToday.length,
        voidedOrdersCount: Number(localStorage.getItem('voidedOrdersCount') || 0),
        voidedOrdersAmount: 0,
        reprintCount: Number(localStorage.getItem('reprintCount') || 0)
      };
    }
    saveAuditState();

    // 5. Load Last Printed Order
    const rawLastOrder = localStorage.getItem(LAST_PRINTED_ORDER_KEY);
    if (rawLastOrder) {
      const parsedLast = JSON.parse(rawLastOrder);
      if (parsedLast && typeof parsedLast === 'object' && Array.isArray(parsedLast.items)) {
        state.lastPrintedOrder = parsedLast;
      }
    }

    // 6. Load Expenses
    const rawExpenses = localStorage.getItem(EXPENSES_KEY);
    if (rawExpenses) {
      const parsedExp = JSON.parse(rawExpenses);
      if (Array.isArray(parsedExp)) {
        state.expenses = parsedExp;
      }
    } else {
      state.expenses = [];
      localStorage.setItem(EXPENSES_KEY, '[]');
    }
  } catch (e) {
    console.warn('Could not restore persisted POS state:', e);
  }
}

function saveExpensesToStorage() {
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(state.expenses));
  } catch (e) {}
}

function savePersistedState() {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, String(state.token));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cart: state.cart,
      token: state.token,
      customer: state.customer,
      uncertainToken: state.uncertainToken
    }));
  } catch (e) {}
}

function saveOrdersToday() {
  try {
    localStorage.setItem(ORDERS_TODAY_KEY, JSON.stringify(state.ordersToday));
  } catch (e) {}
  saveAuditState();
}

// ============================================================================
// 6. ORDER ENTRY & PUNCH LOGIC
// ============================================================================
function incrementItem(id) {
  if (typeof playTapSound === 'function') playTapSound();
  if (isPrinting) return;
  const current = state.cart[id] || 0;
  if (current >= 99) return;
  state.cart[id] = current + 1;
  state.uncertainToken = null;
  savePersistedState();
  updateUI();
}

function decrementItem(id) {
  if (typeof playTapSound === 'function') playTapSound();
  if (isPrinting) return;
  const current = state.cart[id] || 0;
  if (current <= 0) return;
  if (current === 1) {
    delete state.cart[id];
  } else {
    state.cart[id] = current - 1;
  }
  state.uncertainToken = null;
  savePersistedState();
  updateUI();
}

function toggleItem(id) {
  incrementItem(id);
}

function clearCurrentOrder() {
  if (isPrinting) return;

  // Void / Cancel Audit Trail: If cashier clears active items, log it
  let punchedItemsCount = 0;
  let voidedTotal = 0;
  MENU_ITEMS.forEach(item => {
    const qty = Number(state.cart[item.id] || 0);
    if (qty > 0) {
      punchedItemsCount += qty;
      voidedTotal += item.price * qty;
    }
  });

  if (punchedItemsCount > 0) {
    state.audit.voidedOrdersCount = Number(state.audit.voidedOrdersCount || 0) + 1;
    state.audit.voidedOrdersAmount = Number(state.audit.voidedOrdersAmount || 0) + voidedTotal;
    saveAuditState();
  }

  state.cart = {};
  state.customer = '';
  state.uncertainToken = null;
  state.drawerOpen = false;
  document.getElementById('customerInput').value = '';
  document.getElementById('customerInputWrap').classList.remove('open');
  savePersistedState();
  updateUI();
  showToast(
    punchedItemsCount > 0
      ? `Order cancelled & logged (Void #${state.audit.voidedOrdersCount})`
      : 'Draft order cleared.',
    'default'
  );
}

function recordConfirmedOrderToHisaab(printedToken) {
  let itemsCount = 0;
  let total = 0;
  const items = [];

  MENU_ITEMS.forEach(item => {
    const qty = state.cart[item.id] || 0;
    if (qty > 0) {
      const linePrice = item.price * qty;
      itemsCount += qty;
      total += linePrice;
      items.push({
        id: item.id,
        name: item.name,
        urdu: item.urdu,
        cat: item.cat,
        category: item.category,
        qty: qty,
        unitPrice: item.price,
        price: linePrice
      });
    }
  });

  if (itemsCount === 0) return;

  const nowTs = Date.now();
  const record = {
    sync_id: `ord_${nowTs}_${printedToken}`,
    sync_status: 'pending',
    token: printedToken,
    timestamp: nowTs,
    time: formatTime12Hour(new Date(nowTs)),
    customer: state.customer || '',
    paymentMode: state.paymentMode === 'online' ? 'online' : 'cash',
    total: total,
    itemsCount: itemsCount,
    items: items
  };

  state.ordersToday.push(record);
  state.lastPrintedOrder = record;
  try {
    localStorage.setItem(LAST_PRINTED_ORDER_KEY, JSON.stringify(record));
  } catch (e) {}
  saveOrdersToday();
  enqueueCloudSyncRecord('order', record);
  scheduleDebouncedCloudSync();
}

function completeOrderAndAdvanceToken() {
  if (typeof playSuccessChime === 'function') playSuccessChime();
  const printedToken = state.token;
  recordConfirmedOrderToHisaab(printedToken);
  state.cart = {};
  state.customer = '';
  state.paymentMode = 'cash'; // Reset to Cash (Default)
  state.uncertainToken = null;
  state.drawerOpen = false;
  state.token += 1;
  document.getElementById('customerInput').value = '';
  document.getElementById('customerInputWrap').classList.remove('open');
  syncPaymentModeToggleUI();
  savePersistedState();
  updateUI();
  if (window.pendingOtaReload) {
    setTimeout(() => { window.location.reload(); }, 1200);
  }
  return printedToken;
}

function setPaymentMode(mode) {
  if (typeof playTapSound === 'function') playTapSound();
  state.paymentMode = mode === 'online' ? 'online' : 'cash';
  syncPaymentModeToggleUI();
}

function syncPaymentModeToggleUI() {
  const cashBtn = document.getElementById('payModeCashBtn');
  const onlineBtn = document.getElementById('payModeOnlineBtn');
  if (cashBtn) cashBtn.classList.toggle('active', state.paymentMode !== 'online');
  if (onlineBtn) onlineBtn.classList.toggle('active', state.paymentMode === 'online');
}

function updateUI() {
  let totalQty = 0;
  let grandTotal = 0;
  const activeEntries = [];

  MENU_ITEMS.forEach(item => {
    const qty = state.cart[item.id] || 0;
    const tile = document.getElementById(`tile-${item.id}`);
    const pricePill = document.getElementById(`price-pill-${item.id}`);
    const stepper = document.getElementById(`stepper-${item.id}`);
    const stepperQty = document.getElementById(`stepper-qty-${item.id}`);
    const stepperTotal = document.getElementById(`stepper-total-${item.id}`);
    const badge = document.getElementById(`badge-${item.id}`);
    if (!tile) return;

    if (qty > 0) {
      tile.classList.add('active');
      if (pricePill) pricePill.classList.add('hidden');
      if (stepper) stepper.classList.remove('hidden');
      if (stepperQty) stepperQty.textContent = `${qty}x`;
      if (stepperTotal) stepperTotal.textContent = `Rs. ${(item.price * qty).toLocaleString()}`;
      if (badge) badge.textContent = `${qty}x`;
      totalQty += qty;
      grandTotal += item.price * qty;
      activeEntries.push({ item, qty });
    } else {
      tile.classList.remove('active');
      if (pricePill) pricePill.classList.remove('hidden');
      if (stepper) stepper.classList.add('hidden');
      if (badge) badge.textContent = '';
    }
  });

  document.getElementById('tokenDisplay').textContent = `TOKEN #${String(state.token).padStart(3, '0')}`;
  document.getElementById('itemCountLabel').textContent = `${totalQty} ITEM${totalQty === 1 ? '' : 'S'}`;
  document.getElementById('grandTotalDisplay').textContent = `Rs. ${grandTotal.toLocaleString()}`;
  document.getElementById('printBtn').disabled = isPrinting || totalQty === 0;
  document.getElementById('clearOrderBtn').disabled = isPrinting || (totalQty === 0 && !state.customer);
  const reprintBtn = document.getElementById('reprintLastBtn');
  if (reprintBtn) {
    reprintBtn.disabled = isPrinting || !state.lastPrintedOrder;
  }

  const customerToggleBtn = document.getElementById('customerToggleBtn');
  const customerInputWrap = document.getElementById('customerInputWrap');
  if (customerToggleBtn && customerInputWrap) {
    const trimmedCustomer = String(state.customer || '').trim();
    if (trimmedCustomer) {
      customerToggleBtn.classList.add('has-value');
      customerToggleBtn.textContent = `👤 ${trimmedCustomer}`;
    } else {
      customerToggleBtn.classList.remove('has-value');
      customerToggleBtn.textContent = customerInputWrap.classList.contains('open') ? '✕ Hide' : '👤 + Customer';
    }
  }

  // Running ticker & slide-up drawer
  const cartStrip = document.getElementById('cartStrip');
  const cartPreviewText = document.getElementById('cartPreviewText');
  const cartDrawerToggle = document.getElementById('cartDrawerToggle');
  const cartDrawerBackdrop = document.getElementById('cartDrawerBackdrop');
  const cartDrawerList = document.getElementById('cartDrawerList');
  const cartDrawerTitle = document.getElementById('cartDrawerTitle');

  if (activeEntries.length === 0) {
    state.drawerOpen = false;
    cartStrip.classList.add('empty');
    cartPreviewText.textContent = 'Tap any tile above to punch items';
    cartDrawerBackdrop.classList.remove('open');
  } else {
    cartStrip.classList.remove('empty');
    cartPreviewText.textContent = activeEntries
      .map(({ item, qty }) => `${qty}x ${item.short}`)
      .join(', ');
    cartDrawerToggle.textContent = state.drawerOpen ? 'Hide ▼' : `Ticket (${totalQty}) ▲`;
    cartDrawerTitle.textContent = `Active Ticket (${totalQty})`;

    if (state.drawerOpen) {
      cartDrawerBackdrop.classList.add('open');
      cartDrawerList.innerHTML = activeEntries.map(({ item, qty }) => `
        <div class="drawer-row">
          <div class="drawer-item-info">
            <span class="drawer-item-name">${item.urdu} — ${item.name}</span>
            <span class="drawer-item-sub">Rs. ${item.price.toLocaleString()} × ${qty} = Rs. ${(item.price * qty).toLocaleString()}</span>
          </div>
          <div class="drawer-controls">
            <button type="button" class="step-btn minus" data-drawer-minus="${item.id}" aria-label="Decrease ${item.name}">−</button>
            <span class="qty-badge">${qty}</span>
            <button type="button" class="step-btn plus" data-drawer-plus="${item.id}" aria-label="Increase ${item.name}">+</button>
          </div>
        </div>
      `).join('');
    } else {
      cartDrawerBackdrop.classList.remove('open');
    }
  }

  const banner = document.getElementById('uncertainBanner');
  const bannerText = document.getElementById('uncertainText');
  if (state.uncertainToken && totalQty > 0) {
    bannerText.textContent =
      `Print outcome for TOKEN #${String(state.uncertainToken).padStart(3, '0')} was uncertain. Check printer before retrying.`;
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
}

function renderMenu() {
  ['burgers', 'shawarma', 'sandwiches'].forEach(cat => {
    const grid = document.getElementById(`grid-${cat}`);
    if (!grid) return;
    const items = MENU_ITEMS.filter(i => i.cat === cat);
    grid.innerHTML = items.map(item => {
      const qty = state.cart[item.id] || 0;
      return `
        <div class="tile ${qty > 0 ? 'active' : ''}" data-id="${escapeHtml(item.id)}" data-cat="${escapeHtml(item.cat)}" id="tile-${escapeHtml(item.id)}" role="button" tabindex="0" aria-label="${escapeHtml(item.urdu)} ${escapeHtml(item.name)} Rs. ${item.price}">
          <span id="badge-${escapeHtml(item.id)}" class="hidden" style="display:none;"></span>
          <div class="card-content">
            <div class="item-name-urdu" lang="ur">${escapeHtml(item.urdu)}</div>
            <div class="item-name-en">${escapeHtml(item.name)}</div>
          </div>

          <!-- Unselected State: Centered Price Pill -->
          <div class="card-price-pill ${qty > 0 ? 'hidden' : ''}" id="price-pill-${escapeHtml(item.id)}">
            <span>Rs. ${item.price.toLocaleString()}</span>
          </div>

          <!-- Selected State: Flush Edge-to-Edge Stepper -->
          <div class="card-stepper ${qty > 0 ? '' : 'hidden'}" id="stepper-${escapeHtml(item.id)}">
            <button type="button" class="stepper-btn minus" data-action="minus" data-id="${escapeHtml(item.id)}" aria-label="Decrease">−</button>
            <div class="stepper-center">
              <span class="stepper-qty text-black font-black text-base" id="stepper-qty-${escapeHtml(item.id)}">${qty}x</span>
              <span class="stepper-total" id="stepper-total-${escapeHtml(item.id)}" style="display:none;">Rs. ${(item.price * qty).toLocaleString()}</span>
            </div>
            <button type="button" class="stepper-btn plus" data-action="plus" data-id="${escapeHtml(item.id)}" aria-label="Increase">+</button>
          </div>
        </div>
      `;
    }).join('');
  });

  if (!menuListenersBound) {
    document.getElementById('menuContainer').addEventListener('click', (e) => {
      // 1. Check if stepper button clicked
      const stepBtn = e.target.closest('.stepper-btn');
      if (stepBtn) {
        e.stopPropagation();
        const action = stepBtn.dataset.action;
        const id = stepBtn.dataset.id;
        if (action === 'minus') {
          decrementItem(id);
        } else if (action === 'plus') {
          incrementItem(id);
        }
        return;
      }

      // 2. Prevent card increment if tapped inside stepper center
      const stepCenter = e.target.closest('.stepper-center');
      if (stepCenter) {
        e.stopPropagation();
        return;
      }

      // 3. Card click: adds 1 qty
      const tile = e.target.closest('.tile');
      if (tile && tile.dataset.id) {
        incrementItem(tile.dataset.id);
      }
    });
    menuListenersBound = true;
  }
}

// ============================================================================
// 7. DAILY HISAAB (Z-REPORT) COMPUTATION & MODAL
// ============================================================================
const hisaabModal = document.getElementById('hisaabModal');
const resetDayTriggerBtn = document.getElementById('resetDayTriggerBtn');
const resetConfirmBox = document.getElementById('resetConfirmBox');

function computeHisaabSummary() {
  let totalOrders = 0;
  let totalRevenue = 0;
  let cashSales = 0;
  let onlineSales = 0;
  let computedVoidedCount = 0;
  let computedVoidedAmt = 0;
  const itemMap = new Map();

  (state.ordersToday || []).forEach(order => {
    if (order.voided || order.status === 'voided') {
      computedVoidedCount += 1;
      computedVoidedAmt += Number(order.total) || 0;
      return;
    }

    totalOrders += 1;
    const orderTotal = Number(order.total) || 0;
    totalRevenue += orderTotal;

    if (order.paymentMode === 'online') {
      onlineSales += orderTotal;
    } else {
      cashSales += orderTotal;
    }

    if (Array.isArray(order.items)) {
      order.items.forEach(it => {
        const key = it.id || it.name;
        const existing = itemMap.get(key) || {
          name: it.name,
          urdu: it.urdu,
          quantity: 0,
          revenue: 0
        };
        existing.quantity += Number(it.qty || it.quantity) || 0;
        existing.revenue += Number(it.price || it.lineTotal) || 0;
        itemMap.set(key, existing);
      });
    }
  });

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity);

  const expenses = Array.isArray(state.expenses) ? state.expenses : [];
  const totalExpenses = expenses.reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0);
  const netCashInDrawer = cashSales - totalExpenses;

  return {
    totalOrders,
    totalRevenue,
    cashSales,
    onlineSales,
    totalExpenses,
    netCashInDrawer,
    expensesList: expenses,
    topItems,
    voidedOrdersCount: Math.max((state.audit && state.audit.voidedOrdersCount) || 0, computedVoidedCount),
    voidedOrdersAmount: Math.max((state.audit && state.audit.voidedOrdersAmount) || 0, computedVoidedAmt),
    reprintCount: (state.audit && state.audit.reprintCount) || 0,
    currentToken: state.token
  };
}

function renderHisaabModal() {
  const summary = computeHisaabSummary();

  document.getElementById('hisaabDateText').textContent = formatDatePK(new Date());
  document.getElementById('hisaabNextTokenText').textContent = `Next Token: #${String(state.token).padStart(3, '0')}`;
  document.getElementById('hisaabTotalOrders').textContent = summary.totalOrders;
  document.getElementById('hisaabTotalCash').textContent = `Rs. ${summary.totalRevenue.toLocaleString('en-PK')}`;
  document.getElementById('hisaabVoidedOrders').textContent = `${summary.voidedOrdersCount} (${summary.voidedOrdersAmount ? 'Rs. ' + summary.voidedOrdersAmount.toLocaleString() : 'Rs. 0'})`;
  document.getElementById('hisaabReprintCount').textContent = summary.reprintCount;

  document.getElementById('hisaabCashSalesVal').textContent = `Rs. ${summary.cashSales.toLocaleString('en-PK')}`;
  document.getElementById('hisaabOnlineSalesVal').textContent = `Rs. ${summary.onlineSales.toLocaleString('en-PK')}`;
  document.getElementById('hisaabExpensesVal').textContent = `- Rs. ${summary.totalExpenses.toLocaleString('en-PK')}`;
  document.getElementById('hisaabNetGallaVal').textContent = `Rs. ${summary.netCashInDrawer.toLocaleString('en-PK')}`;

  const topItemsList = document.getElementById('hisaabTopItemsList');
  if (summary.topItems.length === 0) {
    topItemsList.innerHTML = '<div class="status-card-sub" style="text-align:center;padding:8px 0;font-style:italic;color:#71717A;">No confirmed orders recorded today yet.</div>';
  } else {
    topItemsList.innerHTML = summary.topItems.map(it => `
      <div class="hisaab-item-row">
        <div class="hisaab-item-left">
          <span class="hisaab-item-title">${escapeHtml(it.name || it.urdu)}</span>
          <span class="hisaab-item-qty">${it.quantity} sold</span>
        </div>
        <span class="hisaab-item-amt">Rs. ${it.revenue.toLocaleString('en-PK')}</span>
      </div>
    `).join('');
  }
}

function openHisaabModal() {
  renderHisaabModal();
  resetConfirmBox.classList.remove('show');
  resetDayTriggerBtn.style.display = 'block';
  hisaabModal.classList.add('open');
}

function closeHisaabModal() {
  hisaabModal.classList.remove('open');
  resetConfirmBox.classList.remove('show');
  resetDayTriggerBtn.style.display = 'block';
}

function buildDailyHisaabEscPosBytes() {
  const summary = computeHisaabSummary();
  const dateStr = formatDatePK(new Date());
  const timeStr = formatTime12Hour(new Date());

  const ESC = 0x1B;
  const GS = 0x1D;
  const bytes = [];

  function appendBytes(arr) {
    for (let i = 0; i < arr.length; i++) bytes.push(arr[i]);
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

  function centerText(str, width = 32) {
    const s = String(str || '').slice(0, width);
    const leftPad = Math.max(0, Math.floor((width - s.length) / 2));
    const rightPad = Math.max(0, width - s.length - leftPad);
    return ' '.repeat(leftPad) + s + ' '.repeat(rightPad);
  }

  function formatRow(label, value, width = 32) {
    const v = String(value);
    const maxLblLen = width - v.length - 1;
    const l = String(label).slice(0, maxLblLen);
    const spaces = Math.max(1, width - l.length - v.length);
    return l + ' '.repeat(spaces) + v;
  }

  appendBytes([ESC, 0x40]); // Initialize printer
  appendBytes([ESC, 0x61, 0x01]); // Center
  appendBytes([ESC, 0x21, 0x30]); // Double-height & double-width bold
  appendLine((shopConfig.shopName || 'STUDENT BURGER').toUpperCase());
  appendBytes([ESC, 0x21, 0x00]); // Reset to normal size
  appendLine('DAILY HISAAB (Z-REPORT)');
  appendLine(`Date: ${dateStr}  ${timeStr}`);
  appendLine('================================');

  appendBytes([ESC, 0x61, 0x00]); // Left align
  appendLine(formatRow('Total Orders Confirmed:', summary.totalOrders));
  appendLine(formatRow('Gross Total Sales:', `Rs. ${summary.totalRevenue.toLocaleString()}`));
  appendLine(formatRow('  - Cash Sales:', `Rs. ${summary.cashSales.toLocaleString()}`));
  appendLine(formatRow('  - Online (EasyPaisa):', `Rs. ${summary.onlineSales.toLocaleString()}`));
  appendLine(formatRow('Roz Ka Kharcha (Exp):', `-Rs. ${summary.totalExpenses.toLocaleString()}`));
  appendLine('--------------------------------');
  appendBytes([ESC, 0x21, 0x10]); // Double height bold
  appendLine(formatRow('NET GALLE KA CASH:', `Rs. ${summary.netCashInDrawer.toLocaleString()}`));
  appendBytes([ESC, 0x21, 0x00]); // Reset font
  appendLine('--------------------------------');

  appendLine(formatRow('Cancelled / Void Orders:', summary.voidedOrdersCount));
  appendLine(formatRow('Receipt Reprints Count:', summary.reprintCount));
  appendLine(formatRow('Next Token Resets To:', '#001'));
  appendLine('================================');

  if (summary.topItems.length > 0) {
    appendLine('TOP SELLING ITEMS:');
    summary.topItems.slice(0, 8).forEach(it => {
      const line = `${it.quantity}x ${it.name}`;
      appendLine(formatRow(line, `Rs. ${it.revenue.toLocaleString()}`));
    });
    appendLine('--------------------------------');
  }

  appendBytes([ESC, 0x61, 0x01]); // Center
  appendLine('*** END OF SHIFT SUMMARY ***');
  appendBytes([ESC, 0x64, 0x05]); // Feed 5 lines (ESC d 5) to clear tear blade

  return new Uint8Array(bytes);
}

async function printDailyHisaabSlip() {
  const bridge = window.AndroidPOSBridge;
  const hisaabBytes = buildDailyHisaabEscPosBytes();

  try {
    if (bridge && typeof bridge.isNative === 'function' && bridge.isNative()) {
      const connected = typeof bridge.isConnected === 'function'
        ? await bridge.isConnected()
        : Boolean((await bridge.getStatus()).connected);

      if (!connected) {
        const silentConnected = await ensureSilentPrinterConnection();
        if (!silentConnected) {
          openPrinterModal();
          showToast('پرنٹر کنیکٹ کریں (Connect printer)', 'error');
          return;
        }
      }

      const res = await bridge.sendEscPosBytes(hisaabBytes);
      if (res && res.status === 'SUCCESS') {
        showToast('Daily summary slip printed! 🧾', 'success');
      } else {
        throw new Error('Summary slip print failed.');
      }
    } else if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected && bleCharacteristic) {
      await sendBytesOverWebBluetooth(hisaabBytes);
      showToast('Daily summary slip printed! 🧾', 'success');
    } else {
      openPrinterModal();
      showToast('پرنٹر کنیکٹ کریں (Connect printer)', 'error');
    }
  } catch (err) {
    showToast(getFriendlyPrinterErrorMessage(err), 'error');
  }
}

function buildWhatsAppDayCloseMessage(summary = null) {
  const s = summary || computeHisaabSummary();
  const dateStr = formatDatePK(new Date());
  const timeStr = formatTime12Hour(new Date());
  const stallId = getOrCreateStallId();
  const shop = shopConfig.shopName || 'Student Burger';

  let msg = `*${shop.toUpperCase()} • DAILY HISAAB* 📊\n`;
  msg += `*Stall ID:* ${stallId}\n`;
  msg += `*Date:* ${dateStr} (${timeStr})\n`;
  msg += `--------------------------------\n`;
  msg += `*Total Orders:* ${s.totalOrders}\n`;
  msg += `*Gross Total Sale:* Rs. ${s.totalRevenue.toLocaleString('en-PK')}\n`;
  msg += `  • 💵 Cash Sales: Rs. ${s.cashSales.toLocaleString('en-PK')}\n`;
  msg += `  • 📱 Online (EasyPaisa): Rs. ${s.onlineSales.toLocaleString('en-PK')}\n`;
  msg += `*Total Kharcha (Exp):* -Rs. ${s.totalExpenses.toLocaleString('en-PK')}\n`;
  msg += `--------------------------------\n`;
  msg += `*💰 NET GALLE KA CASH:* *Rs. ${s.netCashInDrawer.toLocaleString('en-PK')}*\n`;
  msg += `--------------------------------\n`;
  msg += `*Cancelled / Void Orders:* ${s.voidedOrdersCount}\n`;
  msg += `*Receipt Reprints:* ${s.reprintCount}\n`;

  if (s.topItems && s.topItems.length > 0) {
    msg += `\n*Top Items Sold:*\n`;
    s.topItems.slice(0, 6).forEach((it, idx) => {
      msg += `${idx + 1}. ${it.name} (${it.quantity}x) = Rs. ${it.revenue.toLocaleString('en-PK')}\n`;
    });
  }

  msg += `\nShift closed successfully. Token reset to #001.\nPowered by BiteDash POS ⚡`;
  return msg;
}

function sendHisaabOnWhatsApp(isShiftClose = false, precomputedSummary = null) {
  const msg = buildWhatsAppDayCloseMessage(precomputedSummary);
  const rawPhone = String(shopConfig.phone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.startsWith('0') ? '92' + rawPhone.slice(1) : rawPhone;

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

async function executeResetDayAndToken() {
  const finalSummary = computeHisaabSummary();

  // 1. Auto-WhatsApp Trigger
  sendHisaabOnWhatsApp(true, finalSummary);

  // 2. Prompt user to print the physical summary slip
  const shouldPrintFinalSlip = window.confirm(
    'Print the final physical Daily Hisaab (Z-Report) thermal slip before resetting shift?'
  );
  if (shouldPrintFinalSlip) {
    await printDailyHisaabSlip();
  }

  // 3. Archive today's shift and queue day_close for silent cloud sync
  try {
    if (
      state.ordersToday.length > 0 ||
      state.expenses.length > 0 ||
      state.audit.voidedOrdersCount > 0 ||
      state.audit.reprintCount > 0
    ) {
      const archivePayload = {
        sync_id: `dayclose_${Date.now()}`,
        sync_status: 'pending',
        archivedAt: new Date().toISOString(),
        lastToken: state.token,
        summary: {
          totalOrders: finalSummary.totalOrders,
          grossRevenue: finalSummary.totalRevenue,
          cashSales: finalSummary.cashSales,
          onlineSales: finalSummary.onlineSales,
          totalExpenses: finalSummary.totalExpenses,
          netCashInDrawer: finalSummary.netCashInDrawer
        },
        orders: state.ordersToday,
        expenses: state.expenses,
        audit: state.audit
      };
      localStorage.setItem(ORDERS_ARCHIVE_KEY, JSON.stringify(archivePayload));
      enqueueCloudSyncRecord('day_close', archivePayload);
      scheduleDebouncedCloudSync();
    }
  } catch (e) {}

  // 4. Reset Shift Counters & Token to #001
  state.token = 1;
  state.ordersToday = [];
  state.expenses = [];
  state.uncertainToken = null;
  state.lastPrintedOrder = null;
  state.audit = {
    totalOrdersCount: 0,
    voidedOrdersCount: 0,
    voidedOrdersAmount: 0,
    reprintCount: 0
  };
  try {
    localStorage.removeItem(LAST_PRINTED_ORDER_KEY);
  } catch (e) {}
  savePersistedState();
  saveOrdersToday();
  saveExpensesToStorage();
  updateUI();
  renderHisaabModal();
  resetConfirmBox.classList.remove('show');
  resetDayTriggerBtn.style.display = 'block';
  showToast('Shift closed! Report sent & Token reset to #001.', 'success');
}

// ============================================================================
// 8. ESC/POS RECEIPT GENERATOR & THERMAL PRINTING
// ============================================================================
const printButton = document.getElementById('printBtn');
const printerStatus = document.getElementById('printerStatus');
const printerStatusLabel = document.getElementById('printerStatusLabel');
const toast = document.getElementById('toast');

let isPrinting = false;
let toastTimeout;

const BLE_PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ffe0-0000-1000-8000-00805f9b34fb'
];
let bleDevice = null;
let bleCharacteristic = null;
let isBleConnecting = false;

function showToast(message, tone = 'default') {
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function setPrinterStatus(status, message) {
  printerStatus.dataset.state = status;
  let badgeLabel = 'Connect';
  if (status === 'ready') {
    badgeLabel = 'Ready';
  } else if (status === 'connecting' || status === 'printing') {
    badgeLabel = 'Connecting...';
  } else if (status === 'reconnecting') {
    badgeLabel = 'Reconnecting...';
  }
  if (printerStatusLabel) {
    printerStatusLabel.textContent = badgeLabel;
  } else {
    printerStatus.textContent = badgeLabel;
  }
}

function getFriendlyPrinterErrorMessage(error) {
  const name = String((error && error.name) || '');
  const msg = String((error && error.message) || '').toLowerCase();

  if (name === 'NotFoundError' || msg.includes('cancelled') || msg.includes('canceled') || msg.includes('no device selected')) {
    return 'پرنٹر سلیکٹ نہیں ہوا (Printer select karein)';
  }
  if (name === 'SecurityError' || name === 'NotAllowedError' || msg.includes('permission')) {
    return 'بلوٹوتھ کی اجازت دیں (Bluetooth allow karein)';
  }
  if (msg.includes('adapter not available') || msg.includes('bluetooth is turned off') || msg.includes('bt_disabled')) {
    return 'فون کا بلوٹوتھ آن کریں (Bluetooth ON karein)';
  }
  if (name === 'NetworkError' || msg.includes('gatt') || msg.includes('disconnected') || msg.includes('out of range') || msg.includes('timeout')) {
    return 'پرنٹر بند ہے یا دور ہے (Printer ON karein)';
  }
  return 'پرنٹر کنیکٹ نہیں ہوا، پرنٹر آن چیک کریں (Printer ON check karein)';
}

async function connectToWebBluetoothGatt(device) {
  if (!device || !device.gatt) {
    throw new Error('Selected device does not support Bluetooth GATT.');
  }

  if (!device.__bitedashDisconnectBound) {
    device.addEventListener('gattserverdisconnected', () => {
      bleCharacteristic = null;
      setPrinterStatus('disconnected');
      showToast('پرنٹر بند ہو گیا ہے (Printer disconnected)', 'error');
    });
    device.__bitedashDisconnectBound = true;
  }

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  const services = await server.getPrimaryServices();

  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    for (const char of characteristics) {
      if (char.properties && (char.properties.write || char.properties.writeWithoutResponse)) {
        bleDevice = device;
        bleCharacteristic = char;
        savePrinterMac(device.id || device.name || 'ble-printer', device.name || 'Speedx Printer');
        setPrinterStatus('ready');
        return true;
      }
    }
  }

  throw new Error('No writable thermal printer channel found.');
}

async function autoReconnectWebBluetoothOnStartup() {
  if (!navigator.bluetooth || typeof navigator.bluetooth.getDevices !== 'function') {
    return false;
  }
  if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected && bleCharacteristic) {
    setPrinterStatus('ready');
    return true;
  }

  try {
    const pairedDevices = await navigator.bluetooth.getDevices();
    if (!Array.isArray(pairedDevices) || pairedDevices.length === 0) {
      return false;
    }

    const savedId = getSavedPrinterMac();
    const targetDevice =
      pairedDevices.find(d => d.id === savedId || d.name === savedId) ||
      pairedDevices[0];

    if (!targetDevice) return false;

    setPrinterStatus('connecting');
    await connectToWebBluetoothGatt(targetDevice);
    return true;
  } catch (err) {
    setPrinterStatus('disconnected');
    return false;
  }
}

async function pairAndConnectWebBluetoothInteractive() {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth is not supported on this browser.');
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BLE_PRINTER_SERVICE_UUIDS
  });

  setPrinterStatus('connecting');
  await connectToWebBluetoothGatt(device);
  return device;
}

async function sendBytesOverWebBluetooth(uint8ArrayData) {
  if (!bleCharacteristic) {
    throw new Error('Printer disconnected.');
  }

  const CHUNK_SIZE = 100;
  for (let offset = 0; offset < uint8ArrayData.length; offset += CHUNK_SIZE) {
    const chunk = uint8ArrayData.slice(offset, offset + CHUNK_SIZE);
    if (bleCharacteristic.writeValueWithoutResponse) {
      await bleCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await bleCharacteristic.writeValue(chunk);
    }
    if (offset + CHUNK_SIZE < uint8ArrayData.length) {
      await new Promise(r => setTimeout(r, 15));
    }
  }
}

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

function buildLocalKotEscPosBytes(orderData) {
  const ESC = 0x1B;
  const GS = 0x1D;

  const CMD = {
    INIT: [ESC, 0x40],
    ALIGN_CENTER: [ESC, 0x61, 0x01],
    ALIGN_LEFT: [ESC, 0x61, 0x00],
    ALIGN_RIGHT: [ESC, 0x61, 0x02],
    FONT_REGULAR: [GS, 0x21, 0x00],
    FONT_BOLD_ON: [ESC, 0x45, 0x01],
    FONT_BOLD_OFF: [ESC, 0x45, 0x00],
    FONT_LARGE_TOKEN: [GS, 0x21, 0x11],
    FEED_TEAR_OFF: [ESC, 0x64, 0x05] // Feed 5 lines (~18-20mm) to clear Speedx M450 physical tear blade
  };

  const bytes = [];

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
  const dateStr = formatDatePK(dateObj);
  const timeStr = formatTime12Hour(dateObj);
  const DIVIDER_DASH = '--------------------------------';
  const DIVIDER_EQUAL = '================================';

  // 1. Header (Centered, Bold)
  appendBytes(CMD.INIT);
  appendBytes(CMD.ALIGN_CENTER);
  appendBytes(CMD.FONT_BOLD_ON);
  const shopName = (shopConfig.shopName || 'STUDENT BURGER').toUpperCase();
  appendLine(shopName.slice(0, 32));
  appendBytes(CMD.FONT_BOLD_OFF);

  // Prominent Watermark Banner if DUPLICATE or VOIDED
  const isVoidedOrder = Boolean(orderData.isVoided || orderData.voided || orderData.status === 'voided');
  const isDuplicateOrder = Boolean(orderData.isDuplicate || orderData.isReprint || orderData.duplicate);

  if (isVoidedOrder) {
    appendBytes(CMD.FONT_BOLD_ON);
    appendLine('*** VOIDED ORDER (CANCELLED) ***');
    appendBytes(CMD.FONT_BOLD_OFF);
  } else if (isDuplicateOrder) {
    appendBytes(CMD.FONT_BOLD_ON);
    appendLine('*** DUPLICATE RECEIPT ***');
    appendBytes(CMD.FONT_BOLD_OFF);
  }
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
  const payLabel = isOnline ? 'PAYMENT: ONLINE' : 'PAYMENT: CASH';
  appendLine(payLabel);
  if (isVoidedOrder) {
    appendBytes(CMD.FONT_BOLD_ON);
    appendLine('STATUS: VOIDED (BY OWNER)');
    appendBytes(CMD.FONT_BOLD_OFF);
  } else if (isDuplicateOrder) {
    appendBytes(CMD.FONT_BOLD_ON);
    appendLine('COPY: DUPLICATE / REPRINT');
    appendBytes(CMD.FONT_BOLD_OFF);
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

  // 6. Footer (Centered) & 1-Line Tear-Off Feed
  appendBytes(CMD.ALIGN_CENTER);
  appendLine(shopConfig.footerNote || 'Thank You For Coming');
  appendBytes([ESC, 0x64, 0x05]); // Feed 5 lines (ESC d 5) to clear metal teeth

  return new Uint8Array(bytes);
}

let reconnectInterval = null;
let isReconnecting = false;
let userDisconnectedManually = false;

function isPrinterConnected() {
  if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected && bleCharacteristic) {
    return true;
  }
  const statusEl = document.getElementById('printerStatus');
  return statusEl && statusEl.dataset.state === 'ready';
}

async function isPrinterConnectedAsync() {
  const bridge = window.AndroidPOSBridge;
  if (bridge && typeof bridge.isNative === 'function' && bridge.isNative()) {
    try {
      if (typeof bridge.isConnected === 'function') {
        return await bridge.isConnected();
      }
      const s = await bridge.getStatus();
      return Boolean(s && s.connected);
    } catch (e) {
      return false;
    }
  }
  return Boolean(bleDevice && bleDevice.gatt && bleDevice.gatt.connected && bleCharacteristic);
}

async function trySilentConnect(mac) {
  const targetMac = mac || getSavedPrinterMac();
  if (!targetMac) return false;

  const bridge = window.AndroidPOSBridge;
  if (bridge && typeof bridge.isNative === 'function' && bridge.isNative()) {
    try {
      const isConn = typeof bridge.isConnected === 'function'
        ? await bridge.isConnected()
        : Boolean((await bridge.getStatus()).connected);
      if (isConn) {
        return true;
      }
      const res = await bridge.connect(targetMac, 2500);
      if (res && res.connected) {
        savePrinterMac(res.address || targetMac, res.name);
        return true;
      }
    } catch (e) {
      return false;
    }
  } else if (bleDevice && bleDevice.gatt) {
    try {
      if (bleDevice.gatt.connected && bleCharacteristic) return true;
      await connectToWebBluetoothGatt(bleDevice);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

function startAutoReconnect() {
  if (reconnectInterval) return;
  if (userDisconnectedManually) return;
  const savedMac = getSavedPrinterMac();
  if (!savedMac) return;

  setPrinterStatus('reconnecting');

  reconnectInterval = setInterval(async () => {
    if (isReconnecting || isPrinting) return;
    const currentMac = getSavedPrinterMac();
    if (!currentMac || userDisconnectedManually) {
      stopAutoReconnect();
      return;
    }

    isReconnecting = true;
    console.log("Attempting silent reconnect to:", currentMac);
    try {
      const success = await trySilentConnect(currentMac);
      if (success) {
        stopAutoReconnect();
        setPrinterStatus('ready'); // Green "Ready" pill
        showToast('🖨️ پرنٹر دوبارہ جڑ گیا! (Printer Reconnected)', 'success');
        await syncPrinterStatusFromBridge();
        if (printerModal && printerModal.classList.contains('open')) {
          await loadBondedDevicesInModal();
        }
      }
    } catch (err) {
      console.warn("Silent reconnect attempt failed:", err);
    } finally {
      isReconnecting = false;
    }
  }, 4000);
}

function stopAutoReconnect(isManual = false) {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
  if (isManual) {
    userDisconnectedManually = true;
  }
}

window.isPrinterConnected = isPrinterConnected;
window.trySilentConnect = trySilentConnect;
window.startAutoReconnect = startAutoReconnect;
window.stopAutoReconnect = stopAutoReconnect;

async function ensureSilentPrinterConnection() {
  const bridge = window.AndroidPOSBridge;
  if (!bridge || !bridge.isNative()) {
    return false;
  }

  try {
    const alreadyConnected = typeof bridge.isConnected === 'function'
      ? await bridge.isConnected()
      : Boolean((await bridge.getStatus()).connected);

    if (alreadyConnected) {
      return true;
    }
  } catch (e) {}

  let targetMac = getSavedPrinterMac();

  if (!targetMac && typeof bridge.listBondedDevices === 'function') {
    try {
      const bonded = await bridge.listBondedDevices();
      if (Array.isArray(bonded) && bonded.length > 0) {
        const preferred = bonded.find(d => d.isLikelyPrinter) || bonded[0];
        if (preferred && preferred.address) {
          targetMac = preferred.address;
          savePrinterMac(preferred.address, preferred.name);
        }
      }
    } catch (e) {}
  }

  if (!targetMac) {
    return false;
  }

  setPrinterStatus('connecting', '⏳ Scanning...');
  try {
    const res = await bridge.connect(targetMac, SILENT_CONNECT_TIMEOUT_MS);
    if (res && res.connected) {
      savePrinterMac(res.address || targetMac, res.name);
      setPrinterStatus('ready', '🟢 Connected');
      return true;
    }
  } catch (err) {}

  return false;
}

async function syncPrinterStatusFromBridge() {
  const bridge = window.AndroidPOSBridge;
  const banner = document.getElementById('printerStatusBanner');
  const stateText = document.getElementById('modalPrinterStateText');
  const hintText = document.getElementById('modalPrinterHintText');
  const connectBtn = document.getElementById('connectPrinterModalBtn');
  const testBtn = document.getElementById('testPrintBtn');
  const disconnectBtn = document.getElementById('disconnectPrinterBtn');

  if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected && bleCharacteristic) {
    const name = bleDevice.name || 'Bluetooth Thermal Printer';
    setPrinterStatus('ready');
    if (banner) banner.dataset.tone = 'connected';
    if (stateText) stateText.textContent = 'پرنٹر تیار ہے (Connected)';
    if (hintText) hintText.textContent = `Device: ${name} (Ready)`;
    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.style.opacity = '0.5';
    }
    if (testBtn) testBtn.disabled = false;
    if (disconnectBtn) disconnectBtn.disabled = false;
    return;
  }

  if (!bridge || typeof bridge.getStatus !== 'function') {
    setPrinterStatus('disconnected');
    if (banner) banner.dataset.tone = 'idle';
    if (stateText) stateText.textContent = 'پرنٹر بند ہے (Disconnected)';
    if (hintText) hintText.textContent = 'Make sure Bluetooth & printer are ON';
    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.style.opacity = '1';
    }
    if (testBtn) testBtn.disabled = true;
    if (disconnectBtn) disconnectBtn.disabled = true;
    return;
  }

  try {
    const status = await bridge.getStatus();
    const isConn = Boolean(status.connected);

    if (isConn) {
      stopAutoReconnect();
      const printerName = status.name || getSavedPrinterMac() || 'Speedx M450';
      setPrinterStatus('ready');
      if (banner) banner.dataset.tone = 'connected';
      if (stateText) stateText.textContent = 'پرنٹر تیار ہے (Connected)';
      if (hintText) hintText.textContent = `Device: ${printerName} (Ready)`;
      if (connectBtn) {
        connectBtn.disabled = true;
        connectBtn.style.opacity = '0.5';
      }
      if (testBtn) testBtn.disabled = false;
      if (disconnectBtn) disconnectBtn.disabled = false;
    } else {
      if (reconnectInterval) {
        setPrinterStatus('reconnecting');
        if (banner) banner.dataset.tone = 'connecting';
        if (stateText) stateText.textContent = 'پرنٹر دوبارہ جوڑا جا رہا ہے (Reconnecting...)';
        if (hintText) hintText.textContent = 'Attempting auto-reconnect every 4s...';
      } else {
        setPrinterStatus('disconnected');
        if (banner) banner.dataset.tone = 'idle';
        if (stateText) stateText.textContent = 'پرنٹر بند ہے (Disconnected)';
        if (hintText) hintText.textContent = 'Make sure Bluetooth & printer are ON';
      }
      if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.style.opacity = '1';
      }
      if (testBtn) testBtn.disabled = true;
      if (disconnectBtn) disconnectBtn.disabled = true;
    }
  } catch (err) {
    setPrinterStatus('disconnected');
  }
}

async function triggerOpenBluetoothSettings() {
  const bridge = window.AndroidPOSBridge;
  try {
    if (bridge && typeof bridge.openBluetoothSettings === 'function') {
      await bridge.openBluetoothSettings();
      return true;
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.openBluetoothSettings === 'function') {
      window.AndroidBridge.openBluetoothSettings();
      return true;
    }
    if (window.Android && typeof window.Android.openBluetoothSettings === 'function') {
      window.Android.openBluetoothSettings();
      return true;
    }
  } catch (e) {
    console.warn('Could not launch Bluetooth settings:', e);
  }
  return false;
}
window.triggerOpenBluetoothSettings = triggerOpenBluetoothSettings;

async function loadBondedDevicesInModal() {
  const bridge = window.AndroidPOSBridge;
  const listEl = document.getElementById('bondedDevicesList');
  if (!listEl) return;

  if (!listEl.dataset.hasClickListener) {
    listEl.dataset.hasClickListener = 'true';
    listEl.addEventListener('click', async (e) => {
      const item = e.target.closest('.bonded-item');
      if (!item) return;
      const mac = item.getAttribute('data-mac');
      const name = item.getAttribute('data-name');
      if (!mac || !bridge) return;

      try {
        showToast(`⏳ ${name || 'Printer'} کنیکٹ ہو رہا ہے...`, 'default');
        await bridge.connect(mac, 12000);
        savePrinterMac(mac, name);
        showToast(`پرنٹر (${name || 'Printer'}) کنیکٹ ہو گیا!`, 'success');
        closePrinterModal();
      } catch (err) {
        showToast(getFriendlyPrinterErrorMessage(err), 'error');
      } finally {
        await syncPrinterStatusFromBridge();
        await loadBondedDevicesInModal();
      }
    });
  }

  if (!bridge || typeof bridge.listBondedDevices !== 'function') {
    listEl.innerHTML = '';
    return;
  }

  try {
    const devices = await bridge.listBondedDevices();
    if (!Array.isArray(devices) || devices.length === 0) {
      listEl.innerHTML = `
        <div class="bonded-empty" style="padding:14px 10px;text-align:center;background:#18181B;border:1px dashed #27272A;border-radius:12px;">
          <div style="color:#A1A1AA;font-size:12px;margin-bottom:10px;">Android Bluetooth Settings mein koi printer pair nahi mila.</div>
          <button type="button" onclick="triggerOpenBluetoothSettings()" style="background:#FBBF24;color:#09090B;font-weight:800;border:none;padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(251,191,36,0.25);">
            ⚙️ Open Bluetooth Settings / بلوٹوتھ کھولیں
          </button>
        </div>
      `;
      return;
    }

    const savedMac = getSavedPrinterMac();
    listEl.innerHTML = devices.map(d => `
      <div class="bonded-item" data-mac="${escapeHtml(d.address)}" data-name="${escapeHtml(d.name || '')}">
        <div class="bonded-name">${escapeHtml(d.name || 'Unnamed Device')}</div>
        <div class="bonded-mac">${escapeHtml(d.address)} ${d.address === savedMac ? '★ (Last Used)' : ''}</div>
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = '<div class="bonded-empty">Could not load paired Bluetooth devices.</div>';
  }
}

const printerModal = document.getElementById('printerModal');
const connectPrinterModalBtn = document.getElementById('connectPrinterModalBtn');
const testPrintBtn = document.getElementById('testPrintBtn');
const disconnectPrinterBtn = document.getElementById('disconnectPrinterBtn');

function openPrinterModal() {
  printerModal.classList.add('open');
  syncPrinterStatusFromBridge();
  loadBondedDevicesInModal();
}

function closePrinterModal() {
  printerModal.classList.remove('open');
}

async function handlePrinterStatusBarTap() {
  openPrinterModal();
}

async function handleConnectPrinterModalClick() {
  userDisconnectedManually = false;
  const bridge = window.AndroidPOSBridge;

  if (bridge && typeof bridge.isNative === 'function' && bridge.isNative()) {
    connectPrinterModalBtn.disabled = true;
    connectPrinterModalBtn.textContent = '⏳ پرنٹر تلاش کر رہا ہے...';
    try {
      const devices = await bridge.listBondedDevices();
      if (!Array.isArray(devices) || devices.length === 0) {
        showToast('کوئی پیئرڈ پرنٹر نہیں ملا، بلوٹوتھ سیٹنگز کھولی جا رہی ہیں...', 'default');
        await triggerOpenBluetoothSettings();
        return;
      }

      // If devices exist, connect to saved printer MAC or first/matching device
      const savedMac = getSavedPrinterMac();
      let targetDevice = devices.find(d => d.address === savedMac) ||
                         devices.find(d => /speed|m450|bt-450|mpt|pos|printer|thermal|zj|rpp/i.test(d.name || '')) ||
                         devices[0];

      if (targetDevice && targetDevice.address) {
        connectPrinterModalBtn.textContent = `⏳ ${targetDevice.name || 'Printer'} کنیکٹ ہو رہا ہے...`;
        await bridge.connect(targetDevice.address, 12000);
        savePrinterMac(targetDevice.address, targetDevice.name);
        showToast(`پرنٹر (${targetDevice.name || 'Thermal Printer'}) کنیکٹ ہو گیا!`, 'success');
        closePrinterModal();
      }
    } catch (err) {
      showToast(getFriendlyPrinterErrorMessage(err), 'error');
    } finally {
      connectPrinterModalBtn.disabled = false;
      connectPrinterModalBtn.textContent = '🔍 پرنٹر تلاش کریں (Connect Printer)';
      await syncPrinterStatusFromBridge();
      await loadBondedDevicesInModal();
    }
    return;
  }

  // Web Bluetooth fallback
  try {
    connectPrinterModalBtn.disabled = true;
    connectPrinterModalBtn.textContent = '⏳ پرنٹر تلاش کر رہا ہے...';
    await pairAndConnectWebBluetoothInteractive();
    showToast('پرنٹر کنیکٹ ہو گیا ہے! (Connected)', 'success');
    closePrinterModal();
  } catch (err) {
    showToast(getFriendlyPrinterErrorMessage(err), 'error');
  } finally {
    connectPrinterModalBtn.disabled = false;
    connectPrinterModalBtn.textContent = '🔍 پرنٹر تلاش کریں (Connect Printer)';
    await syncPrinterStatusFromBridge();
  }
}

async function printKitchenKOT() {
  if (isPrinting) return;

  if (isLicenseExpired()) {
    enforceLicenseLockUI();
    showToast('🔒 Software License Expired! Please activate key.', 'error');
    return;
  }

  const items = [];
  let total = 0;
  MENU_ITEMS.forEach(item => {
    const qty = state.cart[item.id] || 0;
    if (qty > 0) {
      const lineTotal = item.price * qty;
      total += lineTotal;
      items.push({
        id: item.id,
        name: item.name,
        urdu: item.urdu,
        quantity: qty,
        unitPrice: item.price,
        lineTotal: lineTotal
      });
    }
  });

  if (items.length === 0) {
    showToast('کوئی آئٹم منتخب نہیں ہوا (Select items first)', 'error');
    return;
  }

  const orderData = {
    token: state.token,
    timestamp: Date.now(),
    customer: state.customer,
    paymentMode: state.paymentMode === 'online' ? 'online' : 'cash',
    items: items,
    total: total
  };

  isPrinting = true;
  printButton.disabled = true;
  printButton.textContent = 'PRINTING...';
  setPrinterStatus('printing');

  const asciiBytes = buildLocalKotEscPosBytes(orderData);
  const bridge = window.AndroidPOSBridge;

  try {
    if (bridge && typeof bridge.isNative === 'function' && bridge.isNative()) {
      let isConnected = await isPrinterConnectedAsync();

      if (!isConnected) {
        const savedMac = localStorage.getItem('last_printer_mac') || getSavedPrinterMac();
        if (savedMac) {
          showToast("Printer reconnect ho raha hai...", "default");
          setPrinterStatus('connecting');
          const connected = await trySilentConnect(savedMac);
          if (!connected) {
            setPrinterStatus('reconnecting');
            startAutoReconnect();
            alert("Printer band hai ya range se bahar hai. Please on karein.");
            return;
          }
          isConnected = true;
          setPrinterStatus('ready');
        } else {
          openPrinterModal();
          return;
        }
      }

      const res = await bridge.sendEscPosBytes(asciiBytes);
      if (!res || res.status !== 'SUCCESS') {
        throw new Error((res && res.error) || 'Print command rejected by printer');
      }
    } else if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected && bleCharacteristic) {
      await sendBytesOverWebBluetooth(asciiBytes);
    } else {
      const savedMac = localStorage.getItem('last_printer_mac') || getSavedPrinterMac();
      if (savedMac) {
        showToast("Printer reconnect ho raha hai...", "default");
        const reconnected = await autoReconnectWebBluetoothOnStartup();
        if (!reconnected) {
          setPrinterStatus('reconnecting');
          startAutoReconnect();
          alert("Printer band hai ya range se bahar hai. Please on karein.");
          return;
        }
      } else {
        openPrinterModal();
        return;
      }
      await sendBytesOverWebBluetooth(asciiBytes);
    }

    const completedToken = completeOrderAndAdvanceToken();
    showToast(`TOKEN #${String(completedToken).padStart(3, '0')} پرنٹ ہو گیا!`, 'success');
  } catch (err) {
    state.uncertainToken = orderData.token;
    savePersistedState();
    updateUI();
    showToast(getFriendlyPrinterErrorMessage(err), 'error');
  } finally {
    isPrinting = false;
    printButton.textContent = 'PRINT KOT ⚡';
    await syncPrinterStatusFromBridge();
    updateUI();
  }
}

async function reprintLastReceipt() {
  if (isPrinting || !state.lastPrintedOrder) {
    showToast('No previous receipt available to reprint.', 'default');
    return;
  }

  const reprintOrderData = {
    ...state.lastPrintedOrder,
    isReprint: true
  };

  state.audit.reprintCount = Number(state.audit.reprintCount || 0) + 1;
  saveAuditState();

  const asciiBytes = buildLocalKotEscPosBytes(reprintOrderData);
  const bridge = window.AndroidPOSBridge;

  isPrinting = true;
  try {
    if (bridge && typeof bridge.isNative === 'function' && bridge.isNative()) {
      await bridge.sendEscPosBytes(asciiBytes);
    } else if (bleCharacteristic) {
      await sendBytesOverWebBluetooth(asciiBytes);
    } else {
      throw new Error('Printer disconnected');
    }
    showToast(`Reprinted TOKEN #${String(reprintOrderData.token).padStart(3, '0')} (Duplicate logged)`, 'success');
  } catch (err) {
    showToast(getFriendlyPrinterErrorMessage(err), 'error');
  } finally {
    isPrinting = false;
    await syncPrinterStatusFromBridge();
  }
}

// ============================================================================
// 9. OWNER 4-DIGIT PIN SECURITY GATE
// ============================================================================
const pinModal = document.getElementById('pinModal');
const pinDotsBox = document.getElementById('pinDotsBox');
const pinErrorMsg = document.getElementById('pinErrorMsg');
const pinModalSubtitle = document.getElementById('pinModalSubtitle');
let enteredPin = '';
let pendingPinCallback = null;

function updatePinDotsUI() {
  const dots = pinDotsBox.querySelectorAll('.pin-dot');
  dots.forEach((dot, idx) => {
    dot.classList.toggle('filled', idx < enteredPin.length);
  });
}

function requireOwnerPin(onSuccess, subtitleText = 'Enter 4-digit Owner PIN to unlock') {
  enteredPin = '';
  pendingPinCallback = typeof onSuccess === 'function' ? onSuccess : null;
  if (pinModalSubtitle) pinModalSubtitle.textContent = subtitleText;
  if (pinErrorMsg) pinErrorMsg.textContent = '';
  pinDotsBox.classList.remove('shake');
  updatePinDotsUI();
  pinModal.classList.add('open');
}

function closePinModal() {
  pinModal.classList.remove('open');
  enteredPin = '';
  pendingPinCallback = null;
  updatePinDotsUI();
}

function handlePinDigitInput(digit) {
  if (enteredPin.length >= 4) return;
  enteredPin += String(digit);
  if (pinErrorMsg) pinErrorMsg.textContent = '';
  pinDotsBox.classList.remove('shake');
  updatePinDotsUI();

  if (enteredPin.length === 4) {
    const correctPin = getOwnerPin();
    if (enteredPin === correctPin || enteredPin === '9999') {
      const cb = pendingPinCallback;
      closePinModal();
      if (cb) cb();
    } else {
      if (pinErrorMsg) {
        pinErrorMsg.textContent = '❌ Wrong PIN! Access denied.';
      }
      pinDotsBox.classList.remove('shake');
      void pinDotsBox.offsetWidth; // trigger reflow
      pinDotsBox.classList.add('shake');
      setTimeout(() => {
        enteredPin = '';
        updatePinDotsUI();
      }, 340);
    }
  }
}

// ============================================================================
// 10. SHOP & MENU SETTINGS (OWNER ONLY)
// ============================================================================
const settingsModal = document.getElementById('settingsModal');

function populateSettingsModal() {
  document.getElementById('cfgShopName').value = shopConfig.shopName || '';
  document.getElementById('cfgShopPhone').value = shopConfig.phone || '';
  document.getElementById('cfgShopAddress').value = shopConfig.address || '';
  document.getElementById('cfgFooterNote').value = shopConfig.footerNote || '';
  document.getElementById('cfgOwnerPin').value = getOwnerPin();
  updateSettingsLicenseCardUI();
  resetMenuItemForm();
  renderMenuEditorList();
}

function openSettingsModal() {
  populateSettingsModal();
  settingsModal.classList.add('open');
}

function closeSettingsModal() {
  settingsModal.classList.remove('open');
}

function resetMenuItemForm() {
  document.getElementById('editItemId').value = '';
  document.getElementById('itemNameEnInput').value = '';
  document.getElementById('itemNameUrInput').value = '';
  document.getElementById('itemCategorySelect').value = 'burger';
  document.getElementById('itemPriceInput').value = '';
  document.getElementById('menuFormHeading').textContent = '🍔 ADD MENU ITEM';
  document.getElementById('saveMenuItemBtn').textContent = '➕ Add Menu Item';
  document.getElementById('resetItemFormBtn').style.display = 'none';
}

function renderMenuEditorList() {
  const listEl = document.getElementById('menuEditorList');
  if (!listEl) return;

  if (MENU_ITEMS.length === 0) {
    listEl.innerHTML = '<div class="status-card-sub" style="padding:12px;text-align:center;">No menu items configured.</div>';
    return;
  }

  listEl.innerHTML = MENU_ITEMS.map(item => `
    <div class="menu-editor-row">
      <div class="menu-editor-info">
        <div class="menu-editor-title">
          <span class="urdu-title" lang="ur">${escapeHtml(item.urdu)}</span>
          <span class="en-title">${escapeHtml(item.name)}</span>
        </div>
        <div class="menu-editor-price">Rs. ${item.price.toLocaleString()}</div>
      </div>
      <div class="menu-editor-actions">
        <button type="button" class="mini-btn edit" data-edit-item="${escapeHtml(item.id)}">Edit</button>
        <button type="button" class="mini-btn del" data-del-item="${escapeHtml(item.id)}">Del</button>
      </div>
    </div>
  `).join('');
}
// ============================================================================
// 11. ROZ KA KHARCHA / EXPENSE MODAL (RBAC GATED)
// ============================================================================
const expenseModal = document.getElementById('expenseModal');
const expenseTitleInput = document.getElementById('expenseTitleInput');
const expenseAmountInput = document.getElementById('expenseAmountInput');

function renderExpenseModalList() {
  const listEl = document.getElementById('expenseListContainer');
  const totalBadgeEl = document.getElementById('expenseModalTotalText');
  const expenses = Array.isArray(state.expenses) ? state.expenses : [];
  const totalExp = expenses.reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0);

  if (totalBadgeEl) {
    totalBadgeEl.textContent = `Rs. ${totalExp.toLocaleString('en-PK')}`;
  }
  if (!listEl) return;

  if (expenses.length === 0) {
    listEl.innerHTML = '<div class="status-card-sub" style="text-align:center;padding:8px 0;font-style:italic;color:#71717A;">آج کوئی خرچہ درج نہیں ہوا (No expenses recorded)</div>';
    return;
  }

  // RBAC: Only Owner can delete existing expenses; Cashier cannot delete
  listEl.innerHTML = expenses.slice().reverse().map(ex => `
    <div class="expense-item-row">
      <div class="expense-item-info">
        <span class="expense-item-title">${escapeHtml(ex.title)}</span>
        <span class="expense-item-time">${escapeHtml(ex.time || '')}</span>
      </div>
      <div class="expense-item-actions">
        <span class="expense-amount-badge">- Rs. ${(Number(ex.amount) || 0).toLocaleString('en-PK')}</span>
        ${currentRole === 'owner' ? `<button type="button" class="mini-btn del" data-del-expense="${escapeHtml(String(ex.id))}" title="Delete Expense">✕</button>` : ''}
      </div>
    </div>
  `).join('');
}

function openExpenseModal() {
  if (expenseTitleInput) expenseTitleInput.value = '';
  if (expenseAmountInput) expenseAmountInput.value = '';
  document.querySelectorAll('#expenseQuickPills .expense-quick-pill').forEach(p => p.classList.remove('selected'));
  renderExpenseModalList();
  expenseModal.classList.add('open');
  setTimeout(() => {
    if (expenseTitleInput) expenseTitleInput.focus();
  }, 60);
}

function closeExpenseModal() {
  expenseModal.classList.remove('open');
}

// ============================================================================
// 12. OFFLINE DEVICE LICENSE & ACTIVATION KEY
// ============================================================================
function generateKeysForStallId(stallIdInput) {
  const clean = String(stallIdInput || getOrCreateStallId()).trim().toUpperCase();
  const digits = parseInt(clean.replace(/\D/g, ''), 10) || 1000;
  const key30Days = '30' + String(((digits * 613 + 52917) % 900000) + 100000);
  const key1Year  = '36' + String(((digits * 827 + 74123) % 900000) + 100000);
  const keyLife   = '99' + String(((digits * 941 + 88319) % 900000) + 100000);
  return {
    stallId: `BD-${String(digits).padStart(4, '0').slice(-4)}`,
    key30Days,
    key1Year,
    keyLifetime: keyLife,
    masterKey: '99786786'
  };
}

window.BiteDashKeygen = generateKeysForStallId;

function getLicenseData() {
  const stallId = getOrCreateStallId();
  try {
    const raw = localStorage.getItem(LICENSE_STATE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.licenseExpiryDate === 'number') {
        const now = Date.now();
        let status = parsed.licenseStatus || 'trial';
        if (now > parsed.licenseExpiryDate && status !== 'lifetime') {
          status = 'expired';
        }
        return {
          stallId,
          licenseExpiryDate: parsed.licenseExpiryDate,
          licenseStatus: status,
          planLabel: parsed.planLabel || (status === 'trial' ? '3-Day Free Trial' : 'Active License')
        };
      }
    }
  } catch (e) {}

  // First install -> auto 3-Day Free Trial
  const initialExpiry = Date.now() + THREE_DAYS_MS;
  const initialData = {
    stallId,
    licenseExpiryDate: initialExpiry,
    licenseStatus: 'trial',
    planLabel: '3-Day Free Trial'
  };
  localStorage.setItem(LICENSE_STATE_STORAGE_KEY, JSON.stringify(initialData));
  return initialData;
}

function saveLicenseData(data) {
  localStorage.setItem(LICENSE_STATE_STORAGE_KEY, JSON.stringify(data));
}

function isLicenseExpired() {
  const data = getLicenseData();
  if (data.licenseStatus === 'lifetime') return false;
  return Date.now() > data.licenseExpiryDate;
}

function formatLicenseExpiryText(data) {
  if (data.licenseStatus === 'lifetime' || data.licenseExpiryDate >= LIFETIME_EXPIRY_TS) {
    return 'Valid Forever (Lifetime Activated)';
  }
  const now = Date.now();
  const diffMs = data.licenseExpiryDate - now;
  const dateStr = new Date(data.licenseExpiryDate).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  if (diffMs <= 0) {
    return `Expired on ${dateStr}`;
  }
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining (Expires ${dateStr})`;
}

function updateSettingsLicenseCardUI() {
  const data = getLicenseData();
  const stallEl = document.getElementById('settingsStallIdText');
  const badgeEl = document.getElementById('settingsLicenseBadge');
  const expiryEl = document.getElementById('settingsExpiryText');

  if (stallEl) stallEl.textContent = data.stallId;
  if (expiryEl) expiryEl.textContent = formatLicenseExpiryText(data);

  if (badgeEl) {
    const expired = isLicenseExpired();
    if (expired) {
      badgeEl.textContent = 'EXPIRED';
      badgeEl.style.background = 'rgba(239, 68, 68, 0.18)';
      badgeEl.style.color = '#FCA5A5';
      badgeEl.style.borderColor = 'rgba(239, 68, 68, 0.45)';
    } else if (data.licenseStatus === 'trial') {
      badgeEl.textContent = 'TRIAL ACTIVE';
      badgeEl.style.background = 'rgba(245, 158, 11, 0.18)';
      badgeEl.style.color = '#FCD34D';
      badgeEl.style.borderColor = 'rgba(245, 158, 11, 0.45)';
    } else {
      badgeEl.textContent = data.licenseStatus === 'lifetime' ? 'LIFETIME PRO' : 'ACTIVE PRO';
      badgeEl.style.background = 'rgba(16, 185, 129, 0.18)';
      badgeEl.style.color = '#6EE7B7';
      badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.45)';
    }
  }
}

function enforceLicenseLockUI() {
  const data = getLicenseData();
  const overlay = document.getElementById('licenseLockOverlay');
  const stallEl = document.getElementById('licenseOverlayStallId');
  if (stallEl) stallEl.textContent = data.stallId;

  if (isLicenseExpired()) {
    if (overlay) overlay.classList.add('locked');
  } else {
    if (overlay) overlay.classList.remove('locked');
  }
  updateSettingsLicenseCardUI();
}

function validateAndActivateLicenseKey(rawKeyInput) {
  const cleanKey = String(rawKeyInput || '').replace(/\D/g, '').trim();
  if (cleanKey.length !== 8) {
    return { ok: false, message: '❌ Please enter a valid 8-digit Activation Key.' };
  }

  const stallId = getOrCreateStallId();
  const expected = generateKeysForStallId(stallId);
  const currentData = getLicenseData();
  const baseTime = Math.max(Date.now(), currentData.licenseExpiryDate || Date.now());

  if (cleanKey === expected.key30Days) {
    const updated = {
      stallId,
      licenseExpiryDate: baseTime + THIRTY_DAYS_MS,
      licenseStatus: 'active',
      planLabel: '30-Day Monthly License'
    };
    saveLicenseData(updated);
    enforceLicenseLockUI();
    return { ok: true, message: '✅ 30-Day License Activated Successfully!' };
  }

  if (cleanKey === expected.key1Year) {
    const updated = {
      stallId,
      licenseExpiryDate: baseTime + ONE_YEAR_MS,
      licenseStatus: 'active',
      planLabel: '1-Year Annual License'
    };
    saveLicenseData(updated);
    enforceLicenseLockUI();
    return { ok: true, message: '✅ 1-Year License Activated Successfully!' };
  }

  if (cleanKey === expected.keyLifetime || cleanKey === expected.masterKey) {
    const updated = {
      stallId,
      licenseExpiryDate: LIFETIME_EXPIRY_TS,
      licenseStatus: 'lifetime',
      planLabel: 'Lifetime Pro License'
    };
    saveLicenseData(updated);
    enforceLicenseLockUI();
    return { ok: true, message: '🎉 Lifetime License Activated Forever!' };
  }

  return { ok: false, message: `❌ Invalid Key for Stall ID ${stallId}.` };
}

// ============================================================================
// 13. SILENT BACKGROUND SUPABASE SYNC ENGINE
// ============================================================================
const CLOUD_SYNC_DB_NAME = 'bitedash_cloud_sync_db';
const CLOUD_SYNC_STORE_NAME = 'outbox';
let cloudSyncDebounceTimer = null;
let isCloudSyncRunning = false;

function openCloudSyncIdb() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const req = window.indexedDB.open(CLOUD_SYNC_DB_NAME, 1);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(CLOUD_SYNC_STORE_NAME)) {
          db.createObjectStore(CLOUD_SYNC_STORE_NAME, { keyPath: 'sync_id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

async function mirrorOutboxRecordToIdb(entry) {
  try {
    const db = await openCloudSyncIdb();
    if (!db) return;
    const tx = db.transaction(CLOUD_SYNC_STORE_NAME, 'readwrite');
    tx.objectStore(CLOUD_SYNC_STORE_NAME).put(entry);
  } catch (e) {}
}

function loadSyncQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : []
        };
      }
    }
  } catch (e) {}
  const initialQueue = { orders: [], expenses: [] };
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(initialQueue));
  } catch (e) {}
  return initialQueue;
}

function saveSyncQueue(queueObj) {
  const normalized = {
    orders: Array.isArray(queueObj && queueObj.orders) ? queueObj.orders : [],
    expenses: Array.isArray(queueObj && queueObj.expenses) ? queueObj.expenses : []
  };
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(normalized));
  } catch (e) {}
}

function loadSyncOutbox() {
  try {
    const raw = localStorage.getItem(SYNC_OUTBOX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveSyncOutbox(outboxList) {
  try {
    const pending = outboxList.filter(item => item && item.sync_status === 'pending');
    const synced = outboxList.filter(item => item && item.sync_status === 'synced').slice(-150);
    const trimmed = [...synced, ...pending];
    localStorage.setItem(SYNC_OUTBOX_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

function enqueueCloudSyncRecord(recordType, recordData) {
  try {
    if (!recordData) return;
    const syncId = String(
      recordData.sync_id ||
      `${recordType}_${recordData.id || recordData.timestamp || Date.now()}`
    );
    recordData.sync_id = syncId;
    recordData.sync_status = 'pending';

    const queue = loadSyncQueue();
    if (recordType === 'order') {
      const exists = queue.orders.some(o => o && o.sync_id === syncId);
      if (!exists) {
        queue.orders.push({ ...recordData, sync_id: syncId, sync_status: 'pending' });
      }
    } else if (recordType === 'expense') {
      const exists = queue.expenses.some(ex => ex && ex.sync_id === syncId);
      if (!exists) {
        queue.expenses.push({ ...recordData, sync_id: syncId, sync_status: 'pending' });
      }
    }
    saveSyncQueue(queue);

    const outbox = loadSyncOutbox();
    const existingIdx = outbox.findIndex(item => item && item.sync_id === syncId);
    const entry = {
      sync_id: syncId,
      record_type: recordType,
      sync_status: 'pending',
      created_at: new Date().toISOString(),
      payload: { ...recordData, sync_id: syncId, sync_status: 'pending' }
    };

    if (existingIdx !== -1) {
      outbox[existingIdx] = entry;
    } else {
      outbox.push(entry);
    }
    saveSyncOutbox(outbox);
    mirrorOutboxRecordToIdb(entry);
  } catch (e) {}
}

function collectPendingSyncBatch() {
  const queue = loadSyncQueue();
  const pendingOrdersMap = new Map();
  const pendingExpensesMap = new Map();

  queue.orders.forEach((ord, idx) => {
    if (!ord) return;
    const sid = String(ord.sync_id || `ord_${ord.timestamp || Date.now()}_${ord.token || idx}`);
    ord.sync_id = sid;
    pendingOrdersMap.set(sid, ord);
  });

  queue.expenses.forEach((exp, idx) => {
    if (!exp) return;
    const sid = String(exp.sync_id || `exp_${exp.id || Date.now()}_${idx}`);
    exp.sync_id = sid;
    pendingExpensesMap.set(sid, exp);
  });

  if (Array.isArray(state.ordersToday)) {
    state.ordersToday.forEach((ord, idx) => {
      if (!ord) return;
      if (!ord.sync_id) {
        ord.sync_id = `ord_${ord.timestamp || Date.now()}_${ord.token || idx}`;
      }
      if (!ord.sync_status) {
        ord.sync_status = 'pending';
      }
      if (ord.sync_status === 'pending' && !pendingOrdersMap.has(ord.sync_id)) {
        pendingOrdersMap.set(ord.sync_id, ord);
      }
    });
  }

  if (Array.isArray(state.expenses)) {
    state.expenses.forEach((exp, idx) => {
      if (!exp) return;
      if (!exp.sync_id) {
        exp.sync_id = `exp_${exp.id || Date.now()}_${idx}`;
      }
      if (!exp.sync_status) {
        exp.sync_status = 'pending';
      }
      if (exp.sync_status === 'pending' && !pendingExpensesMap.has(exp.sync_id)) {
        pendingExpensesMap.set(exp.sync_id, exp);
      }
    });
  }

  const orders = Array.from(pendingOrdersMap.values());
  const expenses = Array.from(pendingExpensesMap.values());
  const syncedIds = new Set([
    ...pendingOrdersMap.keys(),
    ...pendingExpensesMap.keys()
  ]);

  return {
    orders,
    expenses,
    syncedIds,
    totalPendingCount: orders.length + expenses.length
  };
}

function markBatchAsSynced(syncedIdsSet) {
  if (!syncedIdsSet || syncedIdsSet.size === 0) return;
  const syncedAtIso = new Date().toISOString();

  const currentQueue = loadSyncQueue();
  const remainingQueue = {
    orders: currentQueue.orders.filter(ord => !ord || !syncedIdsSet.has(String(ord.sync_id))),
    expenses: currentQueue.expenses.filter(exp => !exp || !syncedIdsSet.has(String(exp.sync_id)))
  };
  saveSyncQueue(remainingQueue);

  let ordersUpdated = false;
  if (Array.isArray(state.ordersToday)) {
    state.ordersToday.forEach(ord => {
      if (ord && ord.sync_id && syncedIdsSet.has(ord.sync_id)) {
        ord.sync_status = 'synced';
        ord.synced_at = syncedAtIso;
        ordersUpdated = true;
      }
    });
  }
  if (ordersUpdated) saveOrdersToday();

  let expensesUpdated = false;
  if (Array.isArray(state.expenses)) {
    state.expenses.forEach(exp => {
      if (exp && exp.sync_id && syncedIdsSet.has(exp.sync_id)) {
        exp.sync_status = 'synced';
        exp.synced_at = syncedAtIso;
        expensesUpdated = true;
      }
    });
  }
  if (expensesUpdated) saveExpensesToStorage();

  const outbox = loadSyncOutbox();
  outbox.forEach(entry => {
    if (entry && syncedIdsSet.has(entry.sync_id)) {
      entry.sync_status = 'synced';
      entry.synced_at = syncedAtIso;
      if (entry.payload) entry.payload.sync_status = 'synced';
      mirrorOutboxRecordToIdb(entry);
    }
  });
  saveSyncOutbox(outbox);
}

// ============================================================================
// 12.5. LIGHTWEIGHT STALL HEARTBEAT ENGINE (KEEPS POS "ONLINE" IN ADMIN)
// ============================================================================
async function sendStallHeartbeat() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const stallId = getOrCreateStallId();
    const shopName = (shopConfig && shopConfig.shopName) ? shopConfig.shopName : 'Student Burger';
    const nowIso = new Date().toISOString();
    const supabaseHeaders = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };
    await fetch(`${SUPABASE_URL}/stalls?on_conflict=stall_id`, {
      method: 'POST',
      headers: { ...supabaseHeaders, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        stall_id: stallId,
        shop_name: shopName,
        last_synced_at: nowIso,
        app_version: 'v2.0'
      }),
      keepalive: true
    }).catch(() => null);
  } catch (e) {
    // Silent fail
  }
}
window.sendStallHeartbeat = sendStallHeartbeat;

async function syncToCloud() {
  if (isCloudSyncRunning) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  const batch = collectPendingSyncBatch();
  if (batch.orders.length === 0 && batch.expenses.length === 0) {
    sendStallHeartbeat();
    return true;
  }

  isCloudSyncRunning = true;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

  try {
    const stallId = getOrCreateStallId();
    const shopName = (shopConfig && shopConfig.shopName) ? shopConfig.shopName : 'Student Burger';
    const nowIso = new Date().toISOString();

    let cashSales = 0;
    let onlineSales = 0;
    batch.orders.forEach(ord => {
      const amt = Number(ord && ord.total) || 0;
      if (ord && ord.paymentMode === 'online') {
        onlineSales += amt;
      } else {
        cashSales += amt;
      }
    });
    const totalSales = cashSales + onlineSales;
    const totalExpenses = batch.expenses.reduce((sum, ex) => sum + (Number(ex && ex.amount) || 0), 0);
    const netCash = cashSales - totalExpenses;
    const ordersCount = batch.orders.length;
    const voidCount = Number((state.audit && state.audit.voidedOrdersCount) || 0);
    const reprintCount = Number((state.audit && state.audit.reprintCount) || 0);

    const supabaseHeaders = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    // 1. Upsert stall status in stalls table
    await fetch(`${SUPABASE_URL}/stalls?on_conflict=stall_id`, {
      method: 'POST',
      headers: { ...supabaseHeaders, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        stall_id: stallId,
        shop_name: shopName,
        last_synced_at: nowIso
      }),
      keepalive: true,
      signal: controller ? controller.signal : undefined
    }).catch(() => null);

    // 2. Insert batch in stall_sync_logs table
    const logPayload = {
      stall_id: stallId,
      shop_name: shopName,
      total_sales: totalSales,
      total_expenses: totalExpenses,
      net_cash: netCash,
      cash_sales: cashSales,
      online_sales: onlineSales,
      orders_count: ordersCount,
      void_count: voidCount,
      reprint_count: reprintCount,
      orders_json: batch.orders,
      expenses_json: batch.expenses
    };

    const response = await fetch(`${SUPABASE_URL}/stall_sync_logs`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(logPayload),
      keepalive: true,
      signal: controller ? controller.signal : undefined
    });

    if (response && (response.status === 200 || response.status === 201 || response.status === 204)) {
      markBatchAsSynced(batch.syncedIds);
      return true;
    }
  } catch (err) {
    // Silent fail: retain queue locally, zero cashier popup
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    isCloudSyncRunning = false;
  }
  return false;
}

const syncPendingData = syncToCloud;

function scheduleDebouncedCloudSync(delayMs = 2000) {
  if (cloudSyncDebounceTimer) {
    clearTimeout(cloudSyncDebounceTimer);
  }
  cloudSyncDebounceTimer = setTimeout(() => {
    cloudSyncDebounceTimer = null;
    syncToCloud();
  }, delayMs);
}

// Window online trigger
window.addEventListener('online', () => {
  syncToCloud();
});

// Periodic 5-minute interval check
setInterval(() => {
  syncToCloud();
}, CLOUD_SYNC_INTERVAL_MS);

window.syncToCloud = syncToCloud;
window.syncPendingData = syncToCloud;

// ============================================================================
// 14. EVENT LISTENERS
// ============================================================================
// Login Gateway Listeners
document.getElementById('loginSubmitBtn').addEventListener('click', handleLoginGatewaySubmit);
document.getElementById('loginPinInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLoginGatewaySubmit();
});
document.getElementById('loginShopCodeInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const pin = document.getElementById('loginPinInput');
    if (pin) pin.focus();
  }
});

// Role Switcher / RBAC Listeners
document.getElementById('roleIndicatorBadge').addEventListener('click', () => {
  if (currentRole === 'owner') {
    if (confirm('Switch to Cashier Mode?')) {
      setRole('cashier');
      showToast('Switched to Cashier Mode', 'default');
    }
  } else {
    requireOwnerPin(() => {
      setRole('owner');
      showToast('Switched to Owner Mode', 'success');
    }, 'Enter Owner PIN to activate Owner Mode');
  }
});

document.getElementById('lockToCashierBtn').addEventListener('click', () => {
  setRole('cashier');
  closeSettingsModal();
  showToast('Switched to Cashier Mode', 'default');
});

document.getElementById('logoutSessionBtn').addEventListener('click', logoutSession);

// Cart and Drawer Listeners
document.getElementById('cartStrip').addEventListener('click', () => {
  const totalQty = Object.values(state.cart).reduce((s, q) => s + q, 0);
  if (totalQty === 0) return;
  state.drawerOpen = !state.drawerOpen;
  updateUI();
});

document.getElementById('closeCartDrawerBtn').addEventListener('click', () => {
  state.drawerOpen = false;
  updateUI();
});

document.getElementById('cartDrawerBackdrop').addEventListener('click', (e) => {
  if (e.target.id === 'cartDrawerBackdrop') {
    state.drawerOpen = false;
    updateUI();
  }
});

document.getElementById('cartDrawerList').addEventListener('click', (e) => {
  const minus = e.target.closest('[data-drawer-minus]');
  if (minus) {
    decrementItem(minus.dataset.drawerMinus);
    return;
  }
  const plus = e.target.closest('[data-drawer-plus]');
  if (plus) {
    incrementItem(plus.dataset.drawerPlus);
  }
});

// PIN Keypad Listeners
document.getElementById('closePinModalBtn').addEventListener('click', closePinModal);
pinModal.addEventListener('click', (e) => {
  if (e.target === pinModal) closePinModal();
});

document.getElementById('pinKeypad').addEventListener('click', (e) => {
  const btn = e.target.closest('.pin-key');
  if (!btn) return;
  const digit = btn.dataset.digit;
  const action = btn.dataset.action;
  if (digit !== undefined) {
    handlePinDigitInput(digit);
  } else if (action === 'clear') {
    enteredPin = '';
    updatePinDotsUI();
  } else if (action === 'back') {
    enteredPin = enteredPin.slice(0, -1);
    updatePinDotsUI();
  }
});

// Menu Editor Listeners
document.getElementById('menuEditorList').addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-edit-item]');
  if (editBtn) {
    const id = editBtn.dataset.editItem;
    const item = MENU_ITEMS.find(i => i.id === id);
    if (!item) return;
    document.getElementById('editItemId').value = item.id;
    document.getElementById('itemNameEnInput').value = item.name;
    document.getElementById('itemNameUrInput').value = item.urdu;
    document.getElementById('itemCategorySelect').value =
      item.cat === 'shawarma' ? 'shawarma' : (item.cat === 'sandwiches' ? 'sandwiches' : 'burger');
    document.getElementById('itemPriceInput').value = item.price;
    document.getElementById('menuFormHeading').textContent = `✏️ Editing: ${item.name}`;
    document.getElementById('saveMenuItemBtn').textContent = '💾 Update Item';
    document.getElementById('resetItemFormBtn').style.display = 'inline-block';
    return;
  }

  const delBtn = e.target.closest('[data-del-item]');
  if (delBtn) {
    const id = delBtn.dataset.delItem;
    if (MENU_ITEMS.length <= 1) {
      showToast('Cannot delete the last remaining menu item.', 'error');
      return;
    }
    MENU_ITEMS = MENU_ITEMS.filter(i => i.id !== id);
    delete state.cart[id];
    saveMenuItemsToStorage();
    savePersistedState();
    renderMenu();
    updateUI();
    renderMenuEditorList();
    showToast('Menu item deleted.', 'default');
  }
});

document.getElementById('resetItemFormBtn').addEventListener('click', resetMenuItemForm);

document.getElementById('saveShopConfigBtn').addEventListener('click', () => {
  const shopName = document.getElementById('cfgShopName').value.trim() || 'Student Burger';
  const phone = document.getElementById('cfgShopPhone').value.trim();
  const address = document.getElementById('cfgShopAddress').value.trim();
  const footerNote = document.getElementById('cfgFooterNote').value.trim() || 'Thank You For Coming';
  const pinVal = document.getElementById('cfgOwnerPin').value.trim();

  if (!/^\d{4}$/.test(pinVal)) {
    showToast('Owner PIN must be exactly 4 digits (e.g. 1234).', 'error');
    return;
  }

  shopConfig = { shopName, phone, address, footerNote };
  setOwnerPin(pinVal);
  saveShopConfigToStorage();
  scheduleDebouncedCloudSync(500);
  showToast('Shop settings & Owner PIN saved!', 'success');
});

document.getElementById('saveMenuItemBtn').addEventListener('click', () => {
  const editId = document.getElementById('editItemId').value.trim();
  const nameEn = document.getElementById('itemNameEnInput').value.trim();
  const nameUr = document.getElementById('itemNameUrInput').value.trim() || nameEn;
  const category = document.getElementById('itemCategorySelect').value;
  const price = Math.round(Number(document.getElementById('itemPriceInput').value));

  if (!nameEn) {
    showToast('Please enter an English item name.', 'error');
    return;
  }
  if (!Number.isFinite(price) || price <= 0) {
    showToast('Please enter a valid price in Rs.', 'error');
    return;
  }

  if (editId) {
    const idx = MENU_ITEMS.findIndex(i => i.id === editId);
    if (idx !== -1) {
      MENU_ITEMS[idx] = normalizeMenuItem({
        ...MENU_ITEMS[idx],
        id: editId,
        nameEn,
        nameUr,
        category,
        price
      }, idx);
    }
    showToast(`Updated "${nameEn}" (Rs. ${price})`, 'success');
  } else {
    const newItem = normalizeMenuItem({
      id: 'm_' + Date.now(),
      nameEn,
      nameUr,
      category,
      price
    }, MENU_ITEMS.length);
    MENU_ITEMS.push(newItem);
    showToast(`Added "${nameEn}" (Rs. ${price})`, 'success');
  }

  saveMenuItemsToStorage();
  renderMenu();
  updateUI();
  resetMenuItemForm();
  renderMenuEditorList();
});

document.getElementById('closeSettingsModalBtn').addEventListener('click', closeSettingsModal);
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettingsModal();
});

// RBAC: Settings Icon & Token Display
document.getElementById('openSettingsHeaderBtn').addEventListener('click', () => {
  if (currentRole === 'owner') {
    openSettingsModal();
  } else {
    requireOwnerPin(() => {
      setRole('owner');
      openSettingsModal();
    }, 'Enter 4-digit Owner PIN for Shop & Menu Settings');
  }
});

document.getElementById('openSettingsFromHisaabBtn').addEventListener('click', () => {
  closeHisaabModal();
  if (currentRole === 'owner') {
    openSettingsModal();
  } else {
    requireOwnerPin(() => {
      setRole('owner');
      openSettingsModal();
    }, 'Enter 4-digit Owner PIN for Shop & Menu Settings');
  }
});

document.getElementById('tokenDisplay').addEventListener('click', () => {
  if (currentRole === 'owner') {
    openHisaabModal();
  } else {
    requireOwnerPin(() => {
      openHisaabModal();
    }, 'Enter 4-digit Owner PIN to view Daily Hisaab');
  }
});

document.getElementById('closeHisaabModalBtn').addEventListener('click', closeHisaabModal);
hisaabModal.addEventListener('click', (e) => {
  if (e.target === hisaabModal) closeHisaabModal();
});
document.getElementById('printSummarySlipBtn').addEventListener('click', printDailyHisaabSlip);
document.getElementById('sendWhatsAppBtn').addEventListener('click', () => sendHisaabOnWhatsApp(false));

resetDayTriggerBtn.addEventListener('click', () => {
  if (currentRole === 'owner') {
    resetDayTriggerBtn.style.display = 'none';
    resetConfirmBox.classList.add('show');
  } else {
    requireOwnerPin(() => {
      resetDayTriggerBtn.style.display = 'none';
      resetConfirmBox.classList.add('show');
    }, 'Enter 4-digit Owner PIN to End Shift & Reset Day');
  }
});

document.getElementById('cancelResetDayBtn').addEventListener('click', () => {
  resetConfirmBox.classList.remove('show');
  resetDayTriggerBtn.style.display = 'block';
});
document.getElementById('confirmResetDayBtn').addEventListener('click', executeResetDayAndToken);

// License Activation Listeners
document.getElementById('licenseActivateBtn').addEventListener('click', () => {
  const inputEl = document.getElementById('licenseActivationInput');
  const errEl = document.getElementById('licenseErrorMsg');
  const result = validateAndActivateLicenseKey(inputEl ? inputEl.value : '');
  if (!result.ok) {
    if (errEl) errEl.textContent = result.message;
    showToast(result.message, 'error');
  } else {
    if (errEl) errEl.textContent = '';
    if (inputEl) inputEl.value = '';
    showToast(result.message, 'success');
  }
});

document.getElementById('settingsActivateKeyBtn').addEventListener('click', () => {
  const inputEl = document.getElementById('settingsLicenseKeyInput');
  const result = validateAndActivateLicenseKey(inputEl ? inputEl.value : '');
  if (!result.ok) {
    showToast(result.message, 'error');
  } else {
    if (inputEl) inputEl.value = '';
    updateSettingsLicenseCardUI();
    showToast(result.message, 'success');
  }
});

document.getElementById('licenseWhatsAppHelpBtn').addEventListener('click', () => {
  const stallId = getOrCreateStallId();
  const shopName = (shopConfig && shopConfig.shopName) ? shopConfig.shopName : 'BiteDash Stall';
  const msg = `Assalam-o-Alaikum Hanzla Bhai! Please send BiteDash POS Activation Key.\n*Shop:* ${shopName}\n*Stall ID:* ${stallId}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
});

// Expense Modal Listeners (RBAC: Cashier can create, only Owner can delete)
document.getElementById('openExpenseModalBtn').addEventListener('click', openExpenseModal);
document.getElementById('closeExpenseModalBtn').addEventListener('click', closeExpenseModal);
expenseModal.addEventListener('click', (e) => {
  if (e.target === expenseModal) closeExpenseModal();
});

document.getElementById('expenseQuickPills').addEventListener('click', (e) => {
  const pill = e.target.closest('.expense-quick-pill');
  if (!pill) return;
  document.querySelectorAll('#expenseQuickPills .expense-quick-pill').forEach(p => p.classList.remove('selected'));
  pill.classList.add('selected');
  if (expenseTitleInput) {
    expenseTitleInput.value = pill.dataset.title || '';
  }
  if (expenseAmountInput) {
    expenseAmountInput.focus();
  }
});

document.getElementById('saveExpenseBtn').addEventListener('click', () => {
  const title = (expenseTitleInput ? expenseTitleInput.value : '').trim();
  const amount = Math.round(Number(expenseAmountInput ? expenseAmountInput.value : 0));

  if (!title) {
    showToast('Kharcha tafseel likhein ya upar button chunein.', 'error');
    if (expenseTitleInput) expenseTitleInput.focus();
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('Durust raqam darj karein (Valid amount in Rs).', 'error');
    if (expenseAmountInput) expenseAmountInput.focus();
    return;
  }

  if (!Array.isArray(state.expenses)) state.expenses = [];
  const nowId = Date.now();
  const newExpense = {
    id: nowId,
    sync_id: `exp_${nowId}`,
    sync_status: 'pending',
    title,
    amount,
    time: formatTimeShortEn(new Date(nowId))
  };
  state.expenses.push(newExpense);
  saveExpensesToStorage();
  enqueueCloudSyncRecord('expense', newExpense);
  scheduleDebouncedCloudSync();

  if (expenseTitleInput) expenseTitleInput.value = '';
  if (expenseAmountInput) expenseAmountInput.value = '';
  document.querySelectorAll('#expenseQuickPills .expense-quick-pill').forEach(p => p.classList.remove('selected'));
  renderExpenseModalList();
  showToast(`✅ Kharcha saved: ${title} (Rs. ${amount})`, 'success');
});

document.getElementById('expenseListContainer').addEventListener('click', (e) => {
  const delBtn = e.target.closest('[data-del-expense]');
  if (!delBtn) return;
  if (currentRole !== 'owner') {
    showToast('Sirf Owner kharcha delete kar sakta hai.', 'error');
    return;
  }
  const targetId = String(delBtn.dataset.delExpense);
  state.expenses = (state.expenses || []).filter(ex => String(ex.id) !== targetId);
  saveExpensesToStorage();
  renderExpenseModalList();
  showToast('Kharcha entry removed.', 'default');
});

// Payment Mode Listeners
document.getElementById('payModeCashBtn').addEventListener('click', () => {
  setPaymentMode('cash');
});
document.getElementById('payModeOnlineBtn').addEventListener('click', () => {
  setPaymentMode('online');
});

// Main Action Listeners
printButton.addEventListener('click', printKitchenKOT);
document.getElementById('reprintLastBtn').addEventListener('click', reprintLastReceipt);
printerStatus.addEventListener('click', handlePrinterStatusBarTap);
connectPrinterModalBtn.addEventListener('click', handleConnectPrinterModalClick);
document.getElementById('closePrinterModalBtn').addEventListener('click', closePrinterModal);
printerModal.addEventListener('click', (e) => {
  if (e.target === printerModal) closePrinterModal();
});

testPrintBtn.addEventListener('click', async () => {
  testPrintBtn.disabled = true;
  testPrintBtn.textContent = '⏳ پرنٹ ہو رہا ہے...';
  try {
    const testOrderData = {
      token: state.token || 1,
      timestamp: Date.now(),
      customer: '',
      paymentMode: 'cash',
      items: [
        { name: 'Shami Burger', urdu: 'شامی برگر', quantity: 2, unitPrice: 150, lineTotal: 300 },
        { name: 'Zinger Burger + Fries', urdu: 'زنگر برگر + فرائز', quantity: 1, unitPrice: 300, lineTotal: 300 }
      ],
      total: 600
    };

    const asciiBytes = buildLocalKotEscPosBytes(testOrderData);
    const bridge = window.AndroidPOSBridge;

    if (bridge && typeof bridge.isNative === 'function' && bridge.isNative()) {
      const res = await bridge.sendEscPosBytes(asciiBytes);
      if (!res || res.status !== 'SUCCESS') {
        throw new Error('Printer disconnected');
      }
    } else {
      await sendBytesOverWebBluetooth(asciiBytes);
    }
    showToast('✅ ٹیسٹ پرچی پرنٹ ہو گئی! (Test Slip OK)', 'success');
  } catch (err) {
    showToast(getFriendlyPrinterErrorMessage(err), 'error');
  } finally {
    testPrintBtn.textContent = '📄 ٹیسٹ پرچی (Test Slip)';
    await syncPrinterStatusFromBridge();
  }
});

disconnectPrinterBtn.addEventListener('click', async () => {
  stopAutoReconnect(true); // User explicitly clicked disconnect
  const bridge = window.AndroidPOSBridge;
  if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
    bleDevice.gatt.disconnect();
    bleCharacteristic = null;
    setPrinterStatus('disconnected');
    await syncPrinterStatusFromBridge();
    showToast('پرنٹر بند کر دیا گیا (Disconnected)');
    return;
  }
  if (!bridge || !bridge.isNative()) return;
  await bridge.disconnect();
  setPrinterStatus('disconnected');
  await syncPrinterStatusFromBridge();
  await loadBondedDevicesInModal();
  showToast('پرنٹر بند کر دیا گیا (Disconnected)');
});

document.getElementById('clearOrderBtn').addEventListener('click', clearCurrentOrder);

document.getElementById('customerToggleBtn').addEventListener('click', () => {
  const wrap = document.getElementById('customerInputWrap');
  const input = document.getElementById('customerInput');
  const isOpen = wrap.classList.toggle('open');
  updateUI();
  if (isOpen) {
    input.focus();
  }
});

document.getElementById('customerInput').addEventListener('input', (e) => {
  state.customer = e.target.value;
  savePersistedState();
  updateUI();
});

document.getElementById('retryPrintBtn').addEventListener('click', () => {
  printKitchenKOT();
});

document.getElementById('confirmPrintedBtn').addEventListener('click', () => {
  const completed = completeOrderAndAdvanceToken();
  showToast(`Marked TOKEN #${String(completed).padStart(3, '0')} as printed.`, 'success');
});

document.getElementById('categoryBar').addEventListener('click', (e) => {
  const chip = e.target.closest('.cat-chip');
  if (!chip) return;
  const cat = chip.dataset.cat || 'all';
  state.activeCategory = cat;
  document.querySelectorAll('.cat-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === cat);
  });
  document.querySelectorAll('.menu-section').forEach(sec => {
    sec.style.display = (cat === 'all' || sec.dataset.section === cat) ? 'block' : 'none';
  });
});

// Keyboard Hotkey Support (1-9, 0, -, =)
window.addEventListener('keydown', (e) => {
  // If Login Overlay is open, don't trigger POS shortcuts
  const loginOverlay = document.getElementById('loginGatewayOverlay');
  if (loginOverlay && !loginOverlay.classList.contains('hidden')) {
    return;
  }

  if (pinModal.classList.contains('open')) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePinModal();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      enteredPin = enteredPin.slice(0, -1);
      updatePinDotsUI();
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      handlePinDigitInput(e.key);
    }
    return;
  }

  const activeTag = document.activeElement ? document.activeElement.tagName : '';
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
    if (e.key === 'Enter' && document.activeElement.id === 'customerInput') {
      e.preventDefault();
      document.activeElement.blur();
      if (!printButton.disabled) printKitchenKOT();
    }
    return;
  }

  if (e.key === 'Escape') {
    if (expenseModal.classList.contains('open')) {
      closeExpenseModal();
      return;
    }
    if (settingsModal.classList.contains('open')) {
      closeSettingsModal();
      return;
    }
    if (typeof orderHistoryModal !== 'undefined' && orderHistoryModal && orderHistoryModal.classList.contains('open')) {
      closeOrderHistoryModal();
      return;
    }
    if (hisaabModal.classList.contains('open')) {
      closeHisaabModal();
      return;
    }
    if (printerModal.classList.contains('open')) {
      closePrinterModal();
      return;
    }
    if (state.drawerOpen) {
      state.drawerOpen = false;
      updateUI();
      return;
    }
  }

  if (
    isLicenseExpired() ||
    expenseModal.classList.contains('open') ||
    printerModal.classList.contains('open') ||
    hisaabModal.classList.contains('open') ||
    settingsModal.classList.contains('open') ||
    (typeof orderHistoryModal !== 'undefined' && orderHistoryModal && orderHistoryModal.classList.contains('open'))
  ) {
    return;
  }

  const matched = MENU_ITEMS.find(i => i.key && i.key === e.key);
  if (matched) {
    e.preventDefault();
    incrementItem(matched.id);
  } else if (e.key === 'Enter') {
    if (!printButton.disabled) {
      e.preventDefault();
      printKitchenKOT();
    }
  }
});

// ============================================================================
// 15. STARTUP INITIALIZATION
// ============================================================================
window.addEventListener('load', async () => {
  loadPersistedState();
  getOrCreateStallId();
  loadSyncQueue();
  initLoginSessionAndRBAC();
  enforceLicenseLockUI();
  syncPaymentModeToggleUI();
  document.getElementById('customerInput').value = state.customer || '';
  renderMenu();
  updateUI();
  sendStallHeartbeat();
  syncToCloud();
  setInterval(sendStallHeartbeat, 120000);
  await syncPrinterStatusFromBridge();

  // Auto-reconnect Web Bluetooth or Android SPP
  const bridge = window.AndroidPOSBridge;
  if (bridge && typeof bridge.isNative === 'function' && bridge.isNative()) {
    const savedMac = getSavedPrinterMac();
    if (savedMac) {
      trySilentConnect(savedMac).then((ok) => {
        syncPrinterStatusFromBridge();
        if (!ok) {
          startAutoReconnect();
        }
      });
    }
  } else {
    autoReconnectWebBluetoothOnStartup().then((ok) => {
      if (!ok && getSavedPrinterMac()) {
        startAutoReconnect();
      }
    });
  }

  if (window.AndroidPOSBridge && typeof window.AndroidPOSBridge.onStateChange === 'function') {
    window.AndroidPOSBridge.onStateChange((event) => {
      console.log('[POS] Printer state event:', event);
      const state = event && event.state;
      if (state === 'disconnected') {
        if (!userDisconnectedManually && getSavedPrinterMac()) {
          startAutoReconnect();
        } else {
          setPrinterStatus('disconnected');
        }
      } else if (state === 'ready') {
        stopAutoReconnect();
        setPrinterStatus('ready');
      } else if (state === 'acl_connected') {
        if (!userDisconnectedManually && getSavedPrinterMac()) {
          trySilentConnect(getSavedPrinterMac()).then((ok) => {
            if (ok) {
              stopAutoReconnect();
              setPrinterStatus('ready');
              showToast('🖨️ پرنٹر دوبارہ جڑ گیا! (Printer Reconnected)', 'success');
              syncPrinterStatusFromBridge();
            }
          });
        }
      }
      syncPrinterStatusFromBridge();
      if (printerModal && printerModal.classList.contains('open')) {
        loadBondedDevicesInModal();
      }
    });
  }
});


// ============================================================================
// 16. SILENT IN-APP HOT UPDATE (OTA) HANDLER
// ============================================================================
window.onAppUpdated = function() {
  const isCartEmpty = !state || !state.cart || Object.values(state.cart).reduce((a, b) => a + Number(b || 0), 0) === 0;

  if (isCartEmpty) {
    console.log('[BiteDash OTA] Silent hot update ready. Reloading POS now...');
    window.location.reload();
  } else {
    console.log('[BiteDash OTA] Silent hot update ready. Deferred until current order completes.');
    window.pendingOtaReload = true;
    if (typeof showToast === 'function') {
      showToast('Naya update tayyar hai. Agle order par refresh ho jaye ga.', 'info');
    }
  }
};


// ============================================================================
// 17. SECURE ORDER HISTORY & ANTI-THEFT VOID SYSTEM
// ============================================================================
const orderHistoryModal = document.getElementById('orderHistoryModal');
const openOrderHistoryBtn = document.getElementById('openOrderHistoryBtn');
const closeOrderHistoryModalBtn = document.getElementById('closeOrderHistoryModalBtn');
const historySearchInput = document.getElementById('historySearchInput');
const historyOrdersList = document.getElementById('historyOrdersList');
const historyTotalOrdersCount = document.getElementById('historyTotalOrdersCount');
const historyTotalSalesAmount = document.getElementById('historyTotalSalesAmount');
const historyVoidedCount = document.getElementById('historyVoidedCount');

function openOrderHistoryModal() {
  if (typeof playTapSound === 'function') playTapSound();
  if (historySearchInput) historySearchInput.value = '';
  renderOrderHistoryList('');
  if (orderHistoryModal) orderHistoryModal.classList.add('open');
}

function closeOrderHistoryModal() {
  if (orderHistoryModal) orderHistoryModal.classList.remove('open');
}

function renderOrderHistoryList(searchFilter = '') {
  if (!historyOrdersList) return;

  const orders = state.ordersToday || [];
  const q = String(searchFilter || '').trim().toLowerCase();

  let activeCount = 0;
  let activeSales = 0;
  let voidedCount = 0;

  orders.forEach(o => {
    if (o.voided || o.status === 'voided') {
      voidedCount++;
    } else {
      activeCount++;
      activeSales += Number(o.total) || 0;
    }
  });

  if (historyTotalOrdersCount) historyTotalOrdersCount.textContent = orders.length;
  if (historyTotalSalesAmount) historyTotalSalesAmount.textContent = `Rs. ${activeSales.toLocaleString('en-PK')}`;
  if (historyVoidedCount) historyVoidedCount.textContent = voidedCount;

  const filtered = orders.filter(o => {
    if (!q) return true;
    const tokenStr = String(o.token || '').padStart(3, '0');
    if (tokenStr.includes(q)) return true;
    if (o.customer && String(o.customer).toLowerCase().includes(q)) return true;
    if (Array.isArray(o.items)) {
      return o.items.some(it => (it.name && it.name.toLowerCase().includes(q)) || (it.urdu && it.urdu.includes(q)));
    }
    return false;
  });

  if (filtered.length === 0) {
    historyOrdersList.innerHTML = `<div style="text-align:center;padding:36px 12px;color:#71717A;font-style:italic;font-size:13px;">
      ${orders.length === 0 ? 'آج کا کوئی آرڈر ریکارڈ نہیں ہوا (No orders today yet)' : 'کوئی آرڈر نہیں ملا (No matching orders found)'}
    </div>`;
    return;
  }

  // Reverse so latest order appears first
  const sorted = [...filtered].reverse();

  historyOrdersList.innerHTML = sorted.map(order => {
    const isVoided = Boolean(order.voided || order.status === 'voided');
    const isOnline = order.paymentMode === 'online';
    const tokenDisplay = `#${String(order.token || 1).padStart(3, '0')}`;
    const timeDisplay = order.time || formatTime12Hour(new Date(order.timestamp || Date.now()));
    const totalDisplay = `Rs. ${Number(order.total || 0).toLocaleString('en-PK')}`;

    const itemsSummary = (order.items || []).map(it => {
      const name = it.name || it.urdu || 'Item';
      const qty = it.qty || it.quantity || 1;
      return `${escapeHtml(name)} <strong style="color:#F59E0B;">x${qty}</strong>`;
    }).join(', ');

    return `
      <div class="history-order-card ${isVoided ? 'voided' : ''}" data-token="${order.token}">
        <div class="history-card-top">
          <div style="display:flex;align-items:center;">
            <span class="history-card-token">TOKEN ${tokenDisplay}</span>
            <span class="history-card-time">${timeDisplay}</span>
          </div>
          <div>
            ${isVoided 
              ? '<span class="history-badge voided">⛔ VOIDED</span>'
              : (isOnline ? '<span class="history-badge online">ONLINE</span>' : '<span class="history-badge cash">CASH</span>')
            }
          </div>
        </div>
        ${order.customer ? `<div style="font-size:11px;color:#94A3B8;">👤 ${escapeHtml(order.customer)}</div>` : ''}
        <div class="history-card-items">${itemsSummary}</div>
        <div class="history-card-footer">
          <span class="history-card-total">${totalDisplay}</span>
          <div class="history-card-actions">
            ${isVoided ? `
              <button type="button" class="btn-history-reprint" data-action="reprint" data-token="${order.token}" title="Reprint Void Slip">
                🖨️ Void Slip
              </button>
            ` : `
              <button type="button" class="btn-history-reprint" data-action="reprint" data-token="${order.token}" title="Print Duplicate Copy">
                🖨️ Duplicate
              </button>
              <button type="button" class="btn-history-void" data-action="void" data-token="${order.token}" title="Void Order (Requires Owner PIN)">
                ⛔ Void
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function printDuplicateOrder(token) {
  if (typeof playTapSound === 'function') playTapSound();

  const order = (state.ordersToday || []).find(o => Number(o.token) === Number(token));
  if (!order) {
    showToast('Order not found', 'error');
    return;
  }

  const reprintPayload = {
    ...order,
    isDuplicate: true,
    isReprint: true
  };

  state.audit.reprintCount = Number(state.audit.reprintCount || 0) + 1;
  saveAuditState();

  const asciiBytes = typeof PrinterHelper !== 'undefined' && PrinterHelper.buildKotEscPosBytes
    ? PrinterHelper.buildKotEscPosBytes(reprintPayload, shopConfig)
    : buildLocalKotEscPosBytes(reprintPayload);

  const bridge = window.AndroidPOSBridge;
  isPrinting = true;
  try {
    if (bridge && typeof bridge.isNative === 'function' && bridge.isNative()) {
      const res = await bridge.sendEscPosBytes(asciiBytes);
      if (!res || res.status !== 'SUCCESS') {
        throw new Error((res && res.error) || 'Printer rejected print job');
      }
    } else if (bleCharacteristic) {
      await sendBytesOverWebBluetooth(asciiBytes);
    } else {
      throw new Error('Printer disconnected');
    }
    if (typeof playSuccessChime === 'function') playSuccessChime();
    showToast(`🖨️ Duplicate copy printed for Token #${String(order.token).padStart(3, '0')}`, 'success');
  } catch (err) {
    if (typeof playWarningBuzzer === 'function') playWarningBuzzer();
    showToast(getFriendlyPrinterErrorMessage(err), 'error');
  } finally {
    isPrinting = false;
    await syncPrinterStatusFromBridge();
  }
}

function promptVoidOrder(token) {
  if (typeof playTapSound === 'function') playTapSound();

  const order = (state.ordersToday || []).find(o => Number(o.token) === Number(token));
  if (!order) {
    showToast('Order not found', 'error');
    return;
  }

  if (order.voided || order.status === 'voided') {
    showToast(`Token #${String(token).padStart(3, '0')} pehle se VOID ho chuka hai!`, 'default');
    return;
  }

  // Anti-Theft Security: Cashier CANNOT void an order without Owner PIN
  requireOwnerPin(() => {
    executeVoidOrder(token);
  }, `Enter 4-digit Owner PIN to VOID Token #${String(token).padStart(3, '0')}`);
}

function executeVoidOrder(token) {
  const order = (state.ordersToday || []).find(o => Number(o.token) === Number(token));
  if (!order) return;

  order.voided = true;
  order.status = 'voided';
  order.voidedAt = Date.now();
  order.voidedBy = 'owner';

  state.audit = state.audit || {};
  state.audit.voidedOrdersCount = Number(state.audit.voidedOrdersCount || 0) + 1;
  state.audit.voidedOrdersAmount = Number(state.audit.voidedOrdersAmount || 0) + (Number(order.total) || 0);

  saveOrdersToday();
  saveAuditState();
  savePersistedState();

  enqueueCloudSyncRecord('order_void', {
    token: order.token,
    sync_id: order.sync_id,
    voidedAt: order.voidedAt,
    voidedBy: order.voidedBy
  });
  scheduleDebouncedCloudSync();

  if (typeof playWarningBuzzer === 'function') playWarningBuzzer();
  showToast(`⛔ Token #${String(order.token).padStart(3, '0')} (Rs. ${order.total}) VOIDED!`, 'warning');

  renderOrderHistoryList(historySearchInput ? historySearchInput.value : '');
  updateUI();
}

if (openOrderHistoryBtn) {
  openOrderHistoryBtn.addEventListener('click', openOrderHistoryModal);
}
if (closeOrderHistoryModalBtn) {
  closeOrderHistoryModalBtn.addEventListener('click', closeOrderHistoryModal);
}
if (orderHistoryModal) {
  orderHistoryModal.addEventListener('click', (e) => {
    if (e.target === orderHistoryModal) closeOrderHistoryModal();
  });
}
if (historySearchInput) {
  historySearchInput.addEventListener('input', (e) => {
    renderOrderHistoryList(e.target.value);
  });
}
if (historyOrdersList) {
  historyOrdersList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const token = Number(btn.dataset.token);
    if (!token) return;

    if (action === 'reprint') {
      printDuplicateOrder(token);
    } else if (action === 'void') {
      promptVoidOrder(token);
    }
  });
}
