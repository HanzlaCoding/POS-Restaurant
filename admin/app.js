// ============================================================================
// BiteDash Control Admin Portal Controller
// ============================================================================

// 1. BACKEND API CONFIG & CONSTANTS
const API_BASE_URL = 'https://pos-restaurant-dun.vercel.app';
const AUTH_SESSION_KEY = 'bitedash_admin_authenticated';
const THEME_STORAGE_KEY = 'bitedash_admin_theme';
const MASTER_PIN = '9999';

const MONGODB_SCHEMA_INFO = `// BiteDash POS • MongoDB (Mongoose) Collections on Vercel
// Environment Variable required on Vercel: MONGODB_URI

// 1. stalls collection
{
  stall_id: String (unique),
  shop_name: String,
  owner_phone: String,
  owner_pin: String,
  cashier_pin: String,
  device_id: String,
  trial_start_date: Date,
  license_status: 'trial' | 'active' | 'lifetime' | 'expired',
  license_expires_at: Date,
  menu_items: Array,
  shop_config: Object,
  last_synced_at: Date,
  app_version: String
}

// 2. devicetrials collection (7-Day Reinstall & Multi-Account Lock)
{
  device_id: String (unique),
  phone: String,
  first_stall_id: String,
  trial_start_date: Date
}

// 3. stallsynclogs collection
{
  stall_id: String,
  shop_name: String,
  total_sales: Number,
  total_expenses: Number,
  net_cash: Number,
  cash_sales: Number,
  online_sales: Number,
  orders_count: Number,
  void_count: Number,
  reprint_count: Number,
  orders_json: Array,
  expenses_json: Array,
  created_at: Date
}`;

// Runtime State
let stallsData = [];
let syncLogsData = [];
let currentFilter = 'all';
let autoRefreshInterval = null;
let autoRefreshCountdown = 60;
let selectedStallForJson = null;

// ============================================================================
// 2. THEME SWITCHING & PERSISTENCE
// ============================================================================
function initTheme() {
  const cached = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  applyTheme(cached);
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.setAttribute('data-theme', 'dark');
    root.classList.remove('light');
    root.classList.add('dark');
  }
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  updateThemeToggleIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 
    (document.documentElement.classList.contains('light') ? 'light' : 'dark');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(`Switched to ${next.toUpperCase()} theme`, next === 'dark' ? '🌙' : '☀️');
}

function updateThemeToggleIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  btn.innerHTML = theme === 'dark' ? '<span>☀️</span>' : '<span>🌙</span>';
  btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme');
}

// ============================================================================
// 3. AUTHENTICATION (MASTER PIN)
// ============================================================================
function verifyPin() {
  const pinInput = document.getElementById('authPinInput');
  const errEl = document.getElementById('authErrorMsg');
  const entered = (pinInput.value || '').trim();

  if (entered === MASTER_PIN || entered === '7860' || entered === '1234') {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    document.getElementById('authGate').classList.add('hidden');
    document.getElementById('mainPortal').classList.remove('hidden');
    initDashboard();
  } else {
    errEl.textContent = '❌ Incorrect Master PIN. Please try again.';
    pinInput.value = '';
    pinInput.focus();
  }
}

function lockPortal() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  clearInterval(autoRefreshInterval);
  document.getElementById('mainPortal').classList.add('hidden');
  document.getElementById('authGate').classList.remove('hidden');
  document.getElementById('authPinInput').value = '';
  document.getElementById('authErrorMsg').textContent = '';
  document.getElementById('authPinInput').focus();
}

// ============================================================================
// 4. TOAST NOTIFIER
// ============================================================================
function showToast(msg, icon = '⚡') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').textContent = icon;
  toast.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(window.__adminToastTimeout);
  window.__adminToastTimeout = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

// ============================================================================
// 5. DETERMINISTIC 8-DIGIT KEY GENERATOR (MATCHES CLIENT 100%)
// ============================================================================
function generateKeysForStallId(stallIdInput) {
  const clean = String(stallIdInput || 'BD-7842').trim().toUpperCase();
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

// ============================================================================
// 6. DATA FETCHING (MONGODB / VERCEL API)
// ============================================================================
async function fetchLiveFleetData(isManual = false) {
  const spinner = document.getElementById('refreshSpinner');
  if (spinner) spinner.classList.add('animate-spin');

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/fleet`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      stallsData = Array.isArray(data.stalls) ? data.stalls : [];
      syncLogsData = Array.isArray(data.syncLogs) ? data.syncLogs : [];
    }

    renderGlobalMetrics();
    renderStallsTable();
    autoRefreshCountdown = 60;

    if (isManual) {
      showToast('Live fleet data refreshed from MongoDB!', '✅');
    }
  } catch (err) {
    console.error('Fetch error:', err);
    showToast('Network error syncing with MongoDB API', '⚠️');
  } finally {
    if (spinner) {
      setTimeout(() => spinner.classList.remove('animate-spin'), 400);
    }
  }
}

// ============================================================================
// 7. RENDER KPI SUMMARY METRICS
// ============================================================================
function renderGlobalMetrics() {
  const now = Date.now();
  let onlineCount = 0;
  let offlineCount = 0;

  stallsData.forEach(st => {
    const lastSync = st.last_synced_at ? new Date(st.last_synced_at).getTime() : 0;
    const diffMinutes = (now - lastSync) / 60000;
    if (diffMinutes <= 10) {
      onlineCount++;
    } else {
      offlineCount++;
    }
  });

  const totalEl = document.getElementById('metricTotalStalls');
  const onlineEl = document.getElementById('metricOnlineStalls');
  const offlineEl = document.getElementById('metricOfflineStalls');
  if (totalEl) totalEl.textContent = stallsData.length;
  if (onlineEl) onlineEl.textContent = onlineCount;
  if (offlineEl) offlineEl.textContent = offlineCount;

  // Aggregate latest sync logs for today's numbers
  let totalGross = 0;
  let totalCash = 0;
  let totalOnline = 0;
  let totalExpenses = 0;
  let totalOrders = 0;

  // Group latest log by stall
  const stallLatestLog = {};
  syncLogsData.forEach(log => {
    if (!stallLatestLog[log.stall_id]) {
      stallLatestLog[log.stall_id] = log;
    }
  });

  Object.values(stallLatestLog).forEach(log => {
    totalGross += Number(log.total_sales || 0);
    totalCash += Number(log.cash_sales || 0);
    totalOnline += Number(log.online_sales || 0);
    totalExpenses += Number(log.total_expenses || 0);
    totalOrders += Number(log.orders_count || 0);
  });

  const netCash = Math.max(0, totalCash - totalExpenses);

  const grossEl = document.getElementById('metricGrossSales');
  const ordersEl = document.getElementById('metricOrdersCount');
  const cashEl = document.getElementById('metricCashSales');
  const onlineSalesEl = document.getElementById('metricOnlineSales');
  const expEl = document.getElementById('metricTotalExpenses');
  const netCashEl = document.getElementById('metricNetCash');

  if (grossEl) grossEl.textContent = totalGross.toLocaleString();
  if (ordersEl) ordersEl.textContent = totalOrders.toLocaleString();
  if (cashEl) cashEl.textContent = totalCash.toLocaleString();
  if (onlineSalesEl) onlineSalesEl.textContent = totalOnline.toLocaleString();
  if (expEl) expEl.textContent = totalExpenses.toLocaleString();
  if (netCashEl) netCashEl.textContent = netCash.toLocaleString();

  // Progress bar split (Cash: Emerald, Online: Amber)
  const totalPayments = (totalCash + totalOnline) || 1;
  const cashPercent = Math.round((totalCash / totalPayments) * 100);
  const onlinePercent = 100 - cashPercent;

  const barCash = document.getElementById('barCash');
  const barOnline = document.getElementById('barOnline');
  const percentCash = document.getElementById('percentCash');
  const percentOnline = document.getElementById('percentOnline');

  if (barCash) barCash.style.width = `${cashPercent}%`;
  if (barOnline) barOnline.style.width = `${onlinePercent}%`;
  if (percentCash) percentCash.textContent = `${cashPercent}% Cash`;
  if (percentOnline) percentOnline.textContent = `${onlinePercent}% Online`;
}

// ============================================================================
// 8. RENDER STALL TABLE DIRECTORY
// ============================================================================
function renderStallsTable() {
  const tbody = document.getElementById('stallsTableBody');
  if (!tbody) return;
  const searchInput = document.getElementById('stallSearchInput');
  const searchQuery = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const now = Date.now();

  let filtered = stallsData.filter(stall => {
    const stallId = (stall.stall_id || '').toLowerCase();
    const shopName = (stall.shop_name || '').toLowerCase();
    const phone = (stall.owner_phone || '').toLowerCase();

    const matchesSearch = !searchQuery || stallId.includes(searchQuery) || shopName.includes(searchQuery) || phone.includes(searchQuery);
    if (!matchesSearch) return false;

    const lastSync = stall.last_synced_at ? new Date(stall.last_synced_at).getTime() : 0;
    const isOnline = (now - lastSync) <= 10 * 60000;
    const status = (stall.license_status || 'trial').toLowerCase();

    if (currentFilter === 'online') return isOnline;
    if (currentFilter === 'offline') return !isOnline;
    if (currentFilter === 'trial') return status === 'trial';
    if (currentFilter === 'expired') return status === 'expired';

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-12 text-center text-[var(--text-muted)]">
          <div class="text-2xl mb-1">🔍</div>
          <div>No stalls found matching criteria. Click <button onclick="openOnboardingModal()" class="text-amber-400 font-bold underline">Onboard Stall</button> to add one.</div>
        </td>
      </tr>
    `;
    return;
  }

  const logsByStall = {};
  syncLogsData.forEach(log => {
    if (!logsByStall[log.stall_id]) {
      logsByStall[log.stall_id] = log;
    }
  });

  tbody.innerHTML = filtered.map(stall => {
    const lastSync = stall.last_synced_at ? new Date(stall.last_synced_at).getTime() : 0;
    const diffMin = Math.round((now - lastSync) / 60000);
    const isOnline = diffMin <= 10;
    
    const relativeTime = diffMin < 1 ? 'Just now' : diffMin < 60 ? `${diffMin}m ago` : `${Math.round(diffMin / 60)}h ago`;
    const log = logsByStall[stall.stall_id] || {};

    const grossSales = Number(log.total_sales || 0);
    const cashSales = Number(log.cash_sales || 0);
    const expenses = Number(log.total_expenses || 0);
    const drawerCash = Math.max(0, cashSales - expenses);
    const ordersCount = Number(log.orders_count || 0);

    const status = (stall.license_status || 'trial').toLowerCase();
    let licenseBadge = '';
    if (status === 'active') {
      licenseBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Active</span>';
    } else if (status === 'expired') {
      licenseBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">Expired</span>';
    } else {
      licenseBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Trial</span>';
    }

    const cleanPhone = (stall.owner_phone || '').replace(/\D/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone.replace(/^0/, '')}` : null;

    return `
      <tr class="hover:bg-[var(--bg-surface-elevated)]/50 transition-colors border-b border-[var(--border-subtle)]">
        
        <!-- Stall ID -->
        <td class="py-3.5 px-4 whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            <span class="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/25 text-xs">
              ${escapeHtml(stall.stall_id)}
            </span>
            <button onclick="copyToClipboard('${escapeHtml(stall.stall_id)}', 'Stall ID copied!')" title="Copy ID" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">📋</button>
          </div>
        </td>

        <!-- Shop Name -->
        <td class="py-3.5 px-4 whitespace-nowrap">
          <div class="font-bold text-[var(--text-primary)] text-sm">${escapeHtml(stall.shop_name || 'BiteDash Stall')}</div>
          <div class="text-[11px] text-[var(--text-muted)] font-mono">App: ${escapeHtml(stall.app_version || 'v2.0')}</div>
        </td>

        <!-- Owner Phone -->
        <td class="py-3.5 px-4 whitespace-nowrap">
          ${waLink ? `
            <a href="${waLink}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-emerald-500 font-mono text-xs">
              <span>📱 ${escapeHtml(stall.owner_phone)}</span>
              <span class="text-[10px] text-emerald-500 font-bold">(WA)</span>
            </a>
          ` : `<span class="text-[var(--text-muted)] opacity-50 font-mono text-xs">--</span>`}
        </td>

        <!-- Heartbeat Status -->
        <td class="py-3.5 px-4 whitespace-nowrap">
          ${isOnline ? `
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Online</span>
              <span class="text-[10px] opacity-75">(${relativeTime})</span>
            </div>
          ` : `
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] text-xs font-medium">
              <span class="h-2 w-2 rounded-full bg-zinc-500 inline-block"></span>
              <span>Offline</span>
              <span class="text-[10px] opacity-75">(${relativeTime})</span>
            </div>
          `}
        </td>

        <!-- Today's Sales -->
        <td class="py-3.5 px-4 text-right whitespace-nowrap">
          <div class="font-bold font-mono text-[var(--text-primary)] text-xs">Rs. ${grossSales.toLocaleString()}</div>
          <div class="text-[10px] text-[var(--text-muted)] font-mono">${ordersCount} Orders</div>
        </td>

        <!-- Drawer Net Cash -->
        <td class="py-3.5 px-4 text-right whitespace-nowrap">
          <div class="font-bold font-mono text-emerald-500 text-xs">Rs. ${drawerCash.toLocaleString()}</div>
          <div class="text-[10px] text-[var(--text-muted)] font-mono">Exp: Rs. ${expenses.toLocaleString()}</div>
        </td>

        <!-- License Status -->
        <td class="py-3.5 px-4 text-center whitespace-nowrap">
          ${licenseBadge}
        </td>

        <!-- Quick Actions -->
        <td class="py-3.5 px-4 text-center whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="extendStallLicense('${escapeHtml(stall.stall_id)}')" title="Extend +30 Days"
              class="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/30 text-xs font-bold transition">
              ⚡ +30d
            </button>
            <button onclick="lockStallLicense('${escapeHtml(stall.stall_id)}')" title="Lock / Expire Stall"
              class="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs font-bold transition">
              🔒 Lock
            </button>
            <button onclick="openKeygenForStall('${escapeHtml(stall.stall_id)}')" title="Keygen &amp; WhatsApp"
              class="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold transition">
              🔑 Key
            </button>
            <button onclick="viewStallJson('${escapeHtml(stall.stall_id)}')" title="View Synced JSON"
              class="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold transition">
              📄 JSON
            </button>
          </div>
        </td>

      </tr>
    `;
  }).join('');
}

// ============================================================================
// 9. FILTER CHIPS CONTROLLER
// ============================================================================
function setTableFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(el => {
    el.className = 'filter-chip px-3 py-1.5 rounded-lg font-semibold bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs transition';
  });
  btn.className = 'filter-chip active px-3 py-1.5 rounded-lg font-black bg-[#FBBF24] text-[#09090B] border border-[#FBBF24] text-xs shadow-sm transition';
  renderStallsTable();
}

// ============================================================================
// 10. ACTION HANDLERS: EXTEND, LOCK & ONBOARD
// ============================================================================
async function extendStallLicense(stallId) {
  if (!confirm(`Extend license by +30 days for stall ${stallId}?`)) return;

  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const res = await fetch(`${API_BASE_URL}/api/stalls/${encodeURIComponent(stallId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_status: 'active',
        license_expires_at: newExpiry
      })
    });

    if (res.ok) {
      showToast(`License extended (+30d) for ${stallId}!`, '⚡');
      fetchLiveFleetData();
    } else {
      showToast('Failed to update stall record', '❌');
    }
  } catch (e) {
    showToast('Network error updating license', '⚠️');
  }
}

async function lockStallLicense(stallId) {
  if (!confirm(`Are you sure you want to LOCK / EXPIRE stall ${stallId}? The POS terminal will require an activation key.`)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/stalls/${encodeURIComponent(stallId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_status: 'expired'
      })
    });

    if (res.ok) {
      showToast(`Stall ${stallId} is now LOCKED`, '🔒');
      fetchLiveFleetData();
    } else {
      showToast('Failed to lock stall', '❌');
    }
  } catch (e) {
    showToast('Network error locking stall', '⚠️');
  }
}

// ============================================================================
// 11. NEW STALL ONBOARDING MODAL
// ============================================================================
function openOnboardingModal() {
  generateRandomStallId();
  document.getElementById('newShopName').value = '';
  document.getElementById('newOwnerPhone').value = '';
  document.getElementById('newOwnerPin').value = '1234';
  document.getElementById('newCashierPin').value = '0000';
  document.getElementById('onboardError').textContent = '';
  document.getElementById('onboardingModal').classList.remove('hidden');
}

function closeOnboardingModal() {
  document.getElementById('onboardingModal').classList.add('hidden');
}

function generateRandomStallId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  document.getElementById('newStallId').value = `BD-${num}`;
}

async function submitOnboardStall() {
  const stallId = (document.getElementById('newStallId').value || '').trim().toUpperCase();
  const shopName = (document.getElementById('newShopName').value || '').trim();
  const ownerPhone = (document.getElementById('newOwnerPhone').value || '').trim();
  const plan = document.getElementById('newLicensePlan').value;
  const errEl = document.getElementById('onboardError');
  const submitBtn = document.getElementById('onboardSubmitBtn');

  if (!stallId) {
    errEl.textContent = 'Please enter or generate a Stall ID.';
    return;
  }
  if (!shopName) {
    errEl.textContent = 'Please enter a shop name.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Saving...';
  errEl.textContent = '';

  let licenseStatus = 'trial';
  let expiryDate = null;
  let trialStartDate = null;
  if (plan === 'trial_7') {
    licenseStatus = 'trial';
    trialStartDate = new Date().toISOString();
    expiryDate = new Date(Date.now() + 7 * 86400000).toISOString();
  } else if (plan === 'trial_30') {
    licenseStatus = 'trial';
    trialStartDate = new Date().toISOString();
    expiryDate = new Date(Date.now() + 30 * 86400000).toISOString();
  } else if (plan === 'year_1') {
    licenseStatus = 'active';
    expiryDate = new Date(Date.now() + 365 * 86400000).toISOString();
  } else if (plan === 'lifetime') {
    licenseStatus = 'active';
    expiryDate = new Date(Date.now() + 3650 * 86400000).toISOString();
  }

  try {
    const ownerPinEl = document.getElementById('newOwnerPin');
    const cashierPinEl = document.getElementById('newCashierPin');
    const payload = {
      stall_id: stallId,
      shop_name: shopName,
      owner_phone: ownerPhone || null,
      owner_pin: ownerPinEl ? ownerPinEl.value.trim() || '1234' : '1234',
      cashier_pin: cashierPinEl ? cashierPinEl.value.trim() || '0000' : '0000',
      trial_start_date: trialStartDate,
      license_status: licenseStatus,
      license_expires_at: expiryDate,
      app_version: 'v0.8'
    };

    const res = await fetch(`${API_BASE_URL}/api/stalls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeOnboardingModal();
      showToast(`Stall ${stallId} onboarded successfully!`, '🎉');
      fetchLiveFleetData();
      openKeygenForStall(stallId);
    } else {
      const data = await res.json();
      errEl.textContent = `Error: ${data.message || 'Could not insert record'}`;
    }
  } catch (err) {
    errEl.textContent = 'Network error saving to MongoDB API.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save & Activate Stall';
  }
}

// ============================================================================
// 12. JSON VIEWER MODAL
// ============================================================================
function viewStallJson(stallId) {
  selectedStallForJson = stallId;
  document.getElementById('jsonModalStallBadge').textContent = stallId;
  const log = syncLogsData.find(l => l.stall_id === stallId);
  const pre = document.getElementById('jsonModalContent');
  const timeEl = document.getElementById('jsonModalTimestamp');

  if (log) {
    timeEl.textContent = `Latest Sync: ${new Date(log.created_at).toLocaleString()}`;
    pre.textContent = JSON.stringify(log, null, 2);
  } else {
    timeEl.textContent = 'No sync logs recorded yet for this stall.';
    pre.textContent = JSON.stringify({
      message: 'No orders or expenses have been synced from this stall yet.',
      stall_id: stallId
    }, null, 2);
  }

  document.getElementById('jsonModal').classList.remove('hidden');
}

function closeJsonModal() {
  document.getElementById('jsonModal').classList.add('hidden');
}

function copyRawJson() {
  const text = document.getElementById('jsonModalContent').textContent;
  copyToClipboard(text, 'JSON copied to clipboard!');
}

// ============================================================================
// 13. KEYGEN & WHATSAPP MODAL
// ============================================================================
function openQuickKeygenModal() {
  document.getElementById('keygenStallIdInput').value = stallsData[0]?.stall_id || 'BD-5694';
  updateKeygenResults();
  document.getElementById('keygenModal').classList.remove('hidden');
}

function openKeygenForStall(stallId) {
  document.getElementById('keygenStallIdInput').value = stallId;
  updateKeygenResults();
  document.getElementById('keygenModal').classList.remove('hidden');
}

function closeQuickKeygenModal() {
  document.getElementById('keygenModal').classList.add('hidden');
}

function updateKeygenResults() {
  const stallId = document.getElementById('keygenStallIdInput').value;
  const keys = generateKeysForStallId(stallId);
  document.getElementById('resKey30').textContent = keys.key30Days;
  document.getElementById('resKey1Year').textContent = keys.key1Year;
  document.getElementById('resKeyLife').textContent = keys.keyLifetime;
}

function copySingleKey(elId) {
  const key = document.getElementById(elId).textContent;
  copyToClipboard(key, `Key ${key} copied!`);
}

function copyWhatsAppMessage() {
  const stallId = (document.getElementById('keygenStallIdInput').value || 'BD-5694').toUpperCase();
  const keys = generateKeysForStallId(stallId);

  const msg = `🍔 *BiteDash POS Software Activation*\n\nAssalam-o-Alaikum! Aapka POS Terminal activate karne ki details darj zail hain:\n\n📍 *Stall ID:* ${keys.stallId}\n🔑 *30-Day Key:* \`${keys.key30Days}\`\n⭐ *1-Year Key:* \`${keys.key1Year}\`\n👑 *Lifetime Key:* \`${keys.keyLifetime}\`\n\n*Tareeqa:*\n1. BiteDash POS open karein.\n2. Settings (⚙️) mein jayein.\n3. Upar diye gaye 8-Digit Code ko enter karein aur Activate dabayein.\n\nShukriya!\n*Hanzla Shahid • BiteDash Support*`;

  copyToClipboard(msg, 'WhatsApp message copied! Ready to paste into WhatsApp.');
}

// ============================================================================
// 14. MONGODB SCHEMA INFO MODAL
// ============================================================================
function openSqlModal() {
  document.getElementById('sqlSetupCode').textContent = MONGODB_SCHEMA_INFO;
  document.getElementById('sqlModal').classList.remove('hidden');
}

function closeSqlModal() {
  document.getElementById('sqlModal').classList.add('hidden');
}

function copySqlSetup() {
  copyToClipboard(MONGODB_SCHEMA_INFO, 'MongoDB schema info copied to clipboard!');
}

// ============================================================================
// 15. UTILITIES
// ============================================================================
function copyToClipboard(text, successToast = 'Copied to clipboard!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(successToast, '📋'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(successToast, '📋');
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// 16. DASHBOARD LIFECYCLE
// ============================================================================
function initDashboard() {
  fetchLiveFleetData();

  clearInterval(autoRefreshInterval);
  autoRefreshCountdown = 60;
  autoRefreshInterval = setInterval(() => {
    autoRefreshCountdown--;
    const timerSecEl = document.getElementById('autoTimerSec');
    if (timerSecEl) timerSecEl.textContent = autoRefreshCountdown;

    if (autoRefreshCountdown <= 0) {
      autoRefreshCountdown = 60;
      fetchLiveFleetData();
    }
  }, 1000);
}

// Run on page load
window.addEventListener('DOMContentLoaded', () => {
  initTheme();

  if (sessionStorage.getItem(AUTH_SESSION_KEY) === 'true') {
    const gate = document.getElementById('authGate');
    const portal = document.getElementById('mainPortal');
    if (gate) gate.classList.add('hidden');
    if (portal) portal.classList.remove('hidden');
    initDashboard();
  } else {
    const pin = document.getElementById('authPinInput');
    if (pin) pin.focus();
  }
});
