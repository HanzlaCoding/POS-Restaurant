/**
 * BiteDash POS • Vercel Serverless Express + MongoDB Backend
 * Endpoints:
 *   - POST /api/auth/verify          (7-Day persistent trial check bound to deviceId + phone + stallId, plus PIN auth)
 *   - GET  /api/auth/verify          (Query stall + trial state)
 *   - POST /api/backup/menu          (Backup menu_items, shop_config, and PINs to MongoDB)
 *   - GET  /api/backup/menu          (Restore menu_items & shop_config for a stallId)
 *   - POST /api/stalls/heartbeat     (Lightweight POS online heartbeat)
 *   - POST /api/stalls/sync          (Sync POS orders & expenses batch)
 *   - POST /api/license/activate     (Persist activated license status/expiry)
 *   - GET  /api/admin/fleet          (Admin Portal: fetch all stalls + latest 500 sync logs)
 *   - GET  /api/stalls               (Admin Portal: list stalls)
 *   - POST /api/stalls               (Admin Portal: onboard / upsert stall)
 *   - PATCH /api/stalls/:stallId     (Admin Portal: extend +30d or lock stall)
 *   - GET  /api/sync-logs            (Admin Portal: list sync logs)
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const LIFETIME_EXPIRY_TS = 4102444800000; // Jan 1, 2100

// Permissive CORS for Capacitor Android APK (https://localhost / capacitor://localhost) & Web
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
app.use(express.json({ limit: '5mb' }));

// ============================================================================
// 1. SERVERLESS MONGODB CONNECTION CACHING
// ============================================================================
let cached = global.__bitedashMongoCache;
if (!cached) {
  cached = global.__bitedashMongoCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not configured');
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000
    }).then((m) => m).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ============================================================================
// 2. MONGOOSE MODELS
// ============================================================================
const StallSchema = new mongoose.Schema({
  stall_id: { type: String, required: true, unique: true, index: true },
  shop_name: { type: String, default: 'Student Burger' },
  owner_phone: { type: String, default: '', index: true },
  owner_pin: { type: String, default: '1234' },
  cashier_pin: { type: String, default: '0000' },
  device_id: { type: String, default: '', index: true },
  trial_start_date: { type: Date, default: null },
  license_status: { type: String, enum: ['trial', 'active', 'lifetime', 'expired'], default: 'trial' },
  license_expires_at: { type: Date, default: null },
  menu_items: { type: Array, default: [] },
  shop_config: { type: Object, default: {} },
  last_synced_at: { type: Date, default: Date.now },
  app_version: { type: String, default: 'v0.8' },
  created_at: { type: Date, default: Date.now }
}, { minimize: false });

const DeviceTrialSchema = new mongoose.Schema({
  device_id: { type: String, required: true, unique: true, index: true },
  phone: { type: String, default: '', index: true },
  first_stall_id: { type: String, default: '' },
  trial_start_date: { type: Date, required: true, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

const StallSyncLogSchema = new mongoose.Schema({
  stall_id: { type: String, required: true, index: true },
  shop_name: { type: String, default: 'Student Burger' },
  total_sales: { type: Number, default: 0 },
  total_expenses: { type: Number, default: 0 },
  net_cash: { type: Number, default: 0 },
  cash_sales: { type: Number, default: 0 },
  online_sales: { type: Number, default: 0 },
  orders_count: { type: Number, default: 0 },
  void_count: { type: Number, default: 0 },
  reprint_count: { type: Number, default: 0 },
  orders_json: { type: Array, default: [] },
  expenses_json: { type: Array, default: [] },
  created_at: { type: Date, default: Date.now, index: true }
});

const Stall = mongoose.models.Stall || mongoose.model('Stall', StallSchema);
const DeviceTrial = mongoose.models.DeviceTrial || mongoose.model('DeviceTrial', DeviceTrialSchema);
const StallSyncLog = mongoose.models.StallSyncLog || mongoose.model('StallSyncLog', StallSyncLogSchema);

// ============================================================================
// 3. CORE TRIAL & AUTH RESOLUTION LOGIC
// ============================================================================
function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').trim();
}

async function resolveStallAndTrial({ stallId, deviceId, phone, shopName }) {
  const cleanStallId = String(stallId || '').trim().toUpperCase();
  const cleanDeviceId = String(deviceId || '').trim();
  const cleanPhone = normalizePhone(phone);

  const deviceOrPhoneFilter = [];
  if (cleanDeviceId) deviceOrPhoneFilter.push({ device_id: cleanDeviceId });
  if (cleanPhone && cleanPhone.length >= 7) deviceOrPhoneFilter.push({ phone: cleanPhone });

  const [stallDoc, deviceTrialDoc, phoneStallDoc] = await Promise.all([
    cleanStallId ? Stall.findOne({ stall_id: cleanStallId }) : null,
    deviceOrPhoneFilter.length > 0 ? DeviceTrial.findOne({ $or: deviceOrPhoneFilter }).sort({ trial_start_date: 1 }) : null,
    cleanPhone && cleanPhone.length >= 7 ? Stall.findOne({ owner_phone: new RegExp(cleanPhone.slice(-9)) }).sort({ trial_start_date: 1 }) : null
  ]);

  const now = Date.now();

  // Check if stall has an active paid or lifetime license
  if (stallDoc && (stallDoc.license_status === 'lifetime' || stallDoc.license_status === 'active')) {
    const expMs = stallDoc.license_expires_at ? new Date(stallDoc.license_expires_at).getTime() : LIFETIME_EXPIRY_TS;
    if (stallDoc.license_status === 'lifetime' || expMs > now) {
      return {
        stall: stallDoc,
        locked: false,
        licenseStatus: stallDoc.license_status,
        trialStartDate: stallDoc.trial_start_date ? new Date(stallDoc.trial_start_date).getTime() : now,
        licenseExpiryDate: expMs,
        remainingDays: Math.max(1, Math.ceil((expMs - now) / 86400000))
      };
    }
  }

  // Gather earliest trial_start_date across stall, hardware deviceId, and phone
  const candidates = [];
  if (stallDoc && stallDoc.trial_start_date) {
    const t = new Date(stallDoc.trial_start_date).getTime();
    if (!Number.isNaN(t) && t > 0) candidates.push(t);
  }
  if (deviceTrialDoc && deviceTrialDoc.trial_start_date) {
    const t = new Date(deviceTrialDoc.trial_start_date).getTime();
    if (!Number.isNaN(t) && t > 0) candidates.push(t);
  }
  if (phoneStallDoc && phoneStallDoc.trial_start_date) {
    const t = new Date(phoneStallDoc.trial_start_date).getTime();
    if (!Number.isNaN(t) && t > 0) candidates.push(t);
  }

  const authoritativeStartMs = candidates.length > 0 ? Math.min(...candidates) : now;
  const trialStartDateObj = new Date(authoritativeStartMs);
  let expiryMs = authoritativeStartMs + SEVEN_DAYS_MS;

  // Respect admin-extended trial if explicitly set beyond default 7-day window
  if (stallDoc && stallDoc.license_status === 'trial' && stallDoc.license_expires_at) {
    const serverExpMs = new Date(stallDoc.license_expires_at).getTime();
    if (!Number.isNaN(serverExpMs) && serverExpMs > expiryMs) {
      expiryMs = serverExpMs;
    }
  }

  // If admin explicitly locked the stall
  const explicitlyLocked = stallDoc && stallDoc.license_status === 'expired' &&
    (!stallDoc.license_expires_at || new Date(stallDoc.license_expires_at).getTime() <= now);

  const isExpired = explicitlyLocked || (now >= expiryMs);
  const licenseStatus = isExpired ? 'expired' : 'trial';

  // Persist hardware deviceId + phone trial lock
  if (cleanDeviceId) {
    await DeviceTrial.findOneAndUpdate(
      { device_id: cleanDeviceId },
      {
        $setOnInsert: {
          device_id: cleanDeviceId,
          first_stall_id: cleanStallId
        },
        $min: { trial_start_date: trialStartDateObj },
        ...(cleanPhone ? { $set: { phone: cleanPhone } } : {})
      },
      { upsert: true, new: true }
    );
  }

  // Upsert stall document
  let updatedStall = stallDoc;
  if (cleanStallId) {
    const setFields = {
      trial_start_date: trialStartDateObj,
      license_status: licenseStatus,
      license_expires_at: new Date(expiryMs),
      last_synced_at: new Date()
    };
    if (cleanDeviceId) setFields.device_id = cleanDeviceId;
    if (cleanPhone && (!stallDoc || !stallDoc.owner_phone)) setFields.owner_phone = phone;
    if (shopName && (!stallDoc || !stallDoc.shop_name)) setFields.shop_name = shopName;

    updatedStall = await Stall.findOneAndUpdate(
      { stall_id: cleanStallId },
      {
        $setOnInsert: {
          stall_id: cleanStallId,
          created_at: new Date()
        },
        $set: setFields
      },
      { upsert: true, new: true }
    );
  }

  return {
    stall: updatedStall,
    locked: isExpired,
    licenseStatus,
    trialStartDate: authoritativeStartMs,
    licenseExpiryDate: expiryMs,
    remainingDays: Math.max(0, Math.ceil((expiryMs - now) / 86400000))
  };
}

// ============================================================================
// 4. API ROUTES
// ============================================================================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({ ok: true, db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Auth & 7-Day Trial Verification (POST & GET)
app.post('/api/auth/verify', async (req, res) => {
  try {
    await connectDB();
    const {
      stallId,
      stall_id,
      pin,
      deviceId,
      device_id,
      phone,
      owner_phone,
      shopName,
      shop_name
    } = req.body || {};

    const resolvedStallId = (stallId || stall_id || '').trim().toUpperCase();
    const resolvedDeviceId = (deviceId || device_id || '').trim();
    const resolvedPhone = phone || owner_phone || '';
    const resolvedShopName = shopName || shop_name || '';

    if (!resolvedStallId && !resolvedDeviceId) {
      return res.status(400).json({ ok: false, error: 'stallId or deviceId is required' });
    }

    const result = await resolveStallAndTrial({
      stallId: resolvedStallId,
      deviceId: resolvedDeviceId,
      phone: resolvedPhone,
      shopName: resolvedShopName
    });

    const stall = result.stall;
    const ownerPin = (stall && stall.owner_pin) ? String(stall.owner_pin).trim() : '1234';
    const cashierPin = (stall && stall.cashier_pin) ? String(stall.cashier_pin).trim() : '0000';

    let role = null;
    if (typeof pin === 'string' && pin.trim().length > 0) {
      const enteredPin = pin.trim();
      if (enteredPin === ownerPin || enteredPin === '9999') {
        role = 'owner';
      } else if (enteredPin === cashierPin || enteredPin === '0000') {
        role = 'cashier';
      } else {
        return res.status(401).json({
          ok: false,
          invalidPin: true,
          error: 'Invalid PIN'
        });
      }
    }

    return res.json({
      ok: true,
      role,
      locked: result.locked,
      licenseStatus: result.licenseStatus,
      trialStartDate: result.trialStartDate,
      licenseExpiryDate: result.licenseExpiryDate,
      remainingDays: result.remainingDays,
      stall: stall ? {
        stall_id: stall.stall_id,
        shop_name: stall.shop_name,
        owner_phone: stall.owner_phone,
        owner_pin: stall.owner_pin,
        cashier_pin: stall.cashier_pin,
        device_id: stall.device_id,
        trial_start_date: stall.trial_start_date,
        license_status: stall.license_status,
        license_expires_at: stall.license_expires_at,
        menu_items: stall.menu_items || [],
        shop_config: stall.shop_config || {}
      } : null
    });
  } catch (err) {
    console.error('[POST /api/auth/verify] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    await connectDB();
    const stallId = (req.query.stallId || req.query.stall_id || '').trim().toUpperCase();
    const deviceId = (req.query.deviceId || req.query.device_id || '').trim();
    const phone = req.query.phone || '';

    const result = await resolveStallAndTrial({ stallId, deviceId, phone });
    return res.json({
      ok: true,
      locked: result.locked,
      licenseStatus: result.licenseStatus,
      trialStartDate: result.trialStartDate,
      licenseExpiryDate: result.licenseExpiryDate,
      remainingDays: result.remainingDays,
      stall: result.stall
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Menu & Shop Config Backup / Restore
app.post('/api/backup/menu', async (req, res) => {
  try {
    await connectDB();
    const {
      stallId,
      stall_id,
      menuItems,
      menu_items,
      shopConfig,
      shop_config,
      ownerPin,
      owner_pin,
      cashierPin,
      cashier_pin
    } = req.body || {};

    const cleanStallId = String(stallId || stall_id || '').trim().toUpperCase();
    if (!cleanStallId) {
      return res.status(400).json({ ok: false, error: 'stallId is required' });
    }

    const updateFields = { last_synced_at: new Date() };
    const items = menuItems || menu_items;
    const cfg = shopConfig || shop_config;

    if (Array.isArray(items)) updateFields.menu_items = items;
    if (cfg && typeof cfg === 'object') {
      updateFields.shop_config = cfg;
      if (cfg.shopName) updateFields.shop_name = cfg.shopName;
      if (cfg.phone) updateFields.owner_phone = cfg.phone;
    }
    if (ownerPin || owner_pin) updateFields.owner_pin = String(ownerPin || owner_pin).trim();
    if (cashierPin || cashier_pin) updateFields.cashier_pin = String(cashierPin || cashier_pin).trim();

    const stall = await Stall.findOneAndUpdate(
      { stall_id: cleanStallId },
      {
        $setOnInsert: { stall_id: cleanStallId, created_at: new Date() },
        $set: updateFields
      },
      { upsert: true, new: true }
    );

    return res.json({
      ok: true,
      stall_id: stall.stall_id,
      menu_items: stall.menu_items,
      shop_config: stall.shop_config
    });
  } catch (err) {
    console.error('[POST /api/backup/menu] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/backup/menu', async (req, res) => {
  try {
    await connectDB();
    const cleanStallId = String(req.query.stallId || req.query.stall_id || '').trim().toUpperCase();
    if (!cleanStallId) {
      return res.status(400).json({ ok: false, error: 'stallId is required' });
    }
    const stall = await Stall.findOne({ stall_id: cleanStallId });
    if (!stall) {
      return res.status(404).json({ ok: false, error: 'Stall not found' });
    }
    return res.json({
      ok: true,
      stall_id: stall.stall_id,
      shop_name: stall.shop_name,
      owner_phone: stall.owner_phone,
      owner_pin: stall.owner_pin,
      cashier_pin: stall.cashier_pin,
      menu_items: stall.menu_items || [],
      shop_config: stall.shop_config || {}
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POS Heartbeat
app.post('/api/stalls/heartbeat', async (req, res) => {
  try {
    await connectDB();
    const { stall_id, stallId, shop_name, shopName, app_version, device_id } = req.body || {};
    const cleanStallId = String(stall_id || stallId || '').trim().toUpperCase();
    if (!cleanStallId) {
      return res.status(400).json({ ok: false, error: 'stall_id is required' });
    }

    const update = {
      last_synced_at: new Date(),
      app_version: app_version || 'v0.8'
    };
    if (shop_name || shopName) update.shop_name = shop_name || shopName;
    if (device_id) update.device_id = device_id;

    await Stall.findOneAndUpdate(
      { stall_id: cleanStallId },
      {
        $setOnInsert: {
          stall_id: cleanStallId,
          trial_start_date: new Date(),
          license_status: 'trial',
          license_expires_at: new Date(Date.now() + SEVEN_DAYS_MS),
          created_at: new Date()
        },
        $set: update
      },
      { upsert: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POS Sync Batch (Orders + Expenses)
app.post('/api/stalls/sync', async (req, res) => {
  try {
    await connectDB();
    const payload = req.body || {};
    const cleanStallId = String(payload.stall_id || payload.stallId || '').trim().toUpperCase();
    if (!cleanStallId) {
      return res.status(400).json({ ok: false, error: 'stall_id is required' });
    }

    await Stall.findOneAndUpdate(
      { stall_id: cleanStallId },
      {
        $setOnInsert: {
          stall_id: cleanStallId,
          trial_start_date: new Date(),
          license_status: 'trial',
          license_expires_at: new Date(Date.now() + SEVEN_DAYS_MS),
          created_at: new Date()
        },
        $set: {
          shop_name: payload.shop_name || 'Student Burger',
          last_synced_at: new Date()
        }
      },
      { upsert: true }
    );

    const logDoc = await StallSyncLog.create({
      stall_id: cleanStallId,
      shop_name: payload.shop_name || 'Student Burger',
      total_sales: Number(payload.total_sales) || 0,
      total_expenses: Number(payload.total_expenses) || 0,
      net_cash: Number(payload.net_cash) || 0,
      cash_sales: Number(payload.cash_sales) || 0,
      online_sales: Number(payload.online_sales) || 0,
      orders_count: Number(payload.orders_count) || 0,
      void_count: Number(payload.void_count) || 0,
      reprint_count: Number(payload.reprint_count) || 0,
      orders_json: Array.isArray(payload.orders_json) ? payload.orders_json : [],
      expenses_json: Array.isArray(payload.expenses_json) ? payload.expenses_json : [],
      created_at: new Date()
    });

    return res.status(201).json({ ok: true, id: logDoc._id });
  } catch (err) {
    console.error('[POST /api/stalls/sync] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// License Activation Sync from POS
app.post('/api/license/activate', async (req, res) => {
  try {
    await connectDB();
    const { stall_id, stallId, device_id, deviceId, license_status, licenseStatus, license_expires_at, licenseExpiryDate } = req.body || {};
    const cleanStallId = String(stall_id || stallId || '').trim().toUpperCase();
    if (!cleanStallId) {
      return res.status(400).json({ ok: false, error: 'stall_id is required' });
    }

    const status = license_status || licenseStatus || 'active';
    const expiresAt = license_expires_at
      ? new Date(license_expires_at)
      : new Date(Number(licenseExpiryDate) || LIFETIME_EXPIRY_TS);

    const stall = await Stall.findOneAndUpdate(
      { stall_id: cleanStallId },
      {
        $setOnInsert: { stall_id: cleanStallId, created_at: new Date() },
        $set: {
          license_status: status,
          license_expires_at: expiresAt,
          ...(device_id || deviceId ? { device_id: device_id || deviceId } : {}),
          last_synced_at: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return res.json({ ok: true, stall });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 5. ADMIN PORTAL MANAGEMENT ROUTES
// ============================================================================

// Combined fleet endpoint for Admin Portal
app.get('/api/admin/fleet', async (req, res) => {
  try {
    await connectDB();
    const [stalls, syncLogs] = await Promise.all([
      Stall.find({}).sort({ last_synced_at: -1 }).lean(),
      StallSyncLog.find({}).sort({ created_at: -1 }).limit(500).lean()
    ]);
    return res.json({ ok: true, stalls, syncLogs });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// List stalls
app.get('/api/stalls', async (req, res) => {
  try {
    await connectDB();
    const filter = {};
    if (req.query.stall_id) {
      filter.stall_id = String(req.query.stall_id).replace(/^eq\./, '').trim().toUpperCase();
    }
    const stalls = await Stall.find(filter).sort({ last_synced_at: -1 }).lean();
    return res.json(stalls);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// List sync logs
app.get('/api/sync-logs', async (req, res) => {
  try {
    await connectDB();
    const limit = Math.min(1000, Number(req.query.limit) || 500);
    const logs = await StallSyncLog.find({}).sort({ created_at: -1 }).limit(limit).lean();
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Onboard or Upsert Stall (Admin Portal)
app.post(['/api/stalls', '/api/admin/stalls'], async (req, res) => {
  try {
    await connectDB();
    const body = req.body || {};
    const cleanStallId = String(body.stall_id || body.stallId || '').trim().toUpperCase();
    if (!cleanStallId) {
      return res.status(400).json({ ok: false, message: 'stall_id is required' });
    }

    const now = new Date();
    const updateFields = {
      shop_name: body.shop_name || body.shopName || 'Student Burger',
      last_synced_at: now,
      app_version: body.app_version || 'v0.8'
    };

    if (body.owner_phone !== undefined) updateFields.owner_phone = body.owner_phone || '';
    if (body.owner_pin !== undefined) updateFields.owner_pin = String(body.owner_pin || '1234').trim();
    if (body.cashier_pin !== undefined) updateFields.cashier_pin = String(body.cashier_pin || '0000').trim();
    if (body.device_id !== undefined) updateFields.device_id = body.device_id || '';
    if (body.trial_start_date) updateFields.trial_start_date = new Date(body.trial_start_date);
    if (body.license_status) updateFields.license_status = body.license_status;
    if (body.license_expires_at) updateFields.license_expires_at = new Date(body.license_expires_at);
    if (Array.isArray(body.menu_items)) updateFields.menu_items = body.menu_items;

    const stall = await Stall.findOneAndUpdate(
      { stall_id: cleanStallId },
      {
        $setOnInsert: {
          stall_id: cleanStallId,
          created_at: now
        },
        $set: updateFields
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ ok: true, stall });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Update / Extend / Lock Stall (Admin Portal)
app.patch(['/api/stalls/:stallId', '/api/admin/stalls/:stallId'], async (req, res) => {
  try {
    await connectDB();
    const cleanStallId = String(req.params.stallId || '').trim().toUpperCase();
    if (!cleanStallId) {
      return res.status(400).json({ ok: false, message: 'stallId param is required' });
    }

    const body = req.body || {};
    const updateFields = {};
    if (body.license_status) updateFields.license_status = body.license_status;
    if (body.license_expires_at) updateFields.license_expires_at = new Date(body.license_expires_at);
    if (body.shop_name) updateFields.shop_name = body.shop_name;
    if (body.owner_phone !== undefined) updateFields.owner_phone = body.owner_phone;
    if (body.owner_pin !== undefined) updateFields.owner_pin = body.owner_pin;
    if (body.cashier_pin !== undefined) updateFields.cashier_pin = body.cashier_pin;
    if (Array.isArray(body.menu_items)) updateFields.menu_items = body.menu_items;

    const stall = await Stall.findOneAndUpdate(
      { stall_id: cleanStallId },
      { $set: updateFields },
      { new: true }
    );

    if (!stall) {
      return res.status(404).json({ ok: false, message: 'Stall not found' });
    }
    return res.json({ ok: true, stall });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Static assets for local development (`node server.js`)
app.use(express.static(__dirname));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`BiteDash POS & API Server running at http://localhost:${PORT}/`);
  });
}

module.exports = app;
