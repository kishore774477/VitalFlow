// Local "demo mode" stand-in for Supabase.
//
// Used automatically when EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
// are not set. It keeps every table in device storage, mimics the parts of the
// supabase-js API this app uses (auth, query builder, realtime channels, storage)
// and runs a small wearable-sensor simulator so the dashboard shows live data.

const newId = () => Math.random().toString(36).slice(2, 11);
const nowIso = () => new Date().toISOString();
const tableKey = (table) => `mock_table_${table}`;

const SIMULATOR_INTERVAL_MS = 5000;
const MAX_READINGS_PER_USER = 1500;

export function createMockSupabase(storage) {
  // ── Storage helpers (work with sync or async adapters) ─────────────────────
  const getItem = async (key) => {
    try {
      return await storage.getItem(key);
    } catch (_) {
      return null;
    }
  };
  const setItem = async (key, value) => {
    try {
      await storage.setItem(key, value);
    } catch (_) {}
  };
  const removeItem = async (key) => {
    try {
      await storage.removeItem(key);
    } catch (_) {}
  };
  const readTable = async (table) => {
    try {
      return JSON.parse((await getItem(tableKey(table))) || '[]');
    } catch (_) {
      return [];
    }
  };
  const writeTable = (table, rows) => setItem(tableKey(table), JSON.stringify(rows));

  // ── Realtime: in-process postgres_changes emulation ─────────────────────────
  const realtimeListeners = new Set();

  const matchesFilter = (row, filter) => {
    if (!filter) return true;
    const m = /^(\w+)=eq\.(.+)$/.exec(filter);
    if (!m) return true;
    return String(row?.[m[1]]) === m[2];
  };

  const emitChange = (table, eventType, newRow, oldRow) => {
    const row = newRow || oldRow;
    realtimeListeners.forEach((l) => {
      if (l.table && l.table !== table) return;
      if (l.event !== '*' && l.event !== eventType) return;
      if (!matchesFilter(row, l.filter)) return;
      try {
        l.callback({
          schema: 'public',
          table,
          eventType,
          new: newRow || {},
          old: oldRow || {},
        });
      } catch (err) {
        console.error('Mock realtime listener error:', err);
      }
    });
  };

  const createChannel = () => {
    const own = [];
    const channel = {
      on(type, opts, callback) {
        if (type === 'postgres_changes') {
          own.push({
            table: opts?.table,
            event: opts?.event || '*',
            filter: opts?.filter,
            callback,
          });
        }
        return channel;
      },
      subscribe(statusCallback) {
        own.forEach((l) => realtimeListeners.add(l));
        if (typeof statusCallback === 'function') {
          setTimeout(() => statusCallback('SUBSCRIBED'), 0);
        }
        return channel;
      },
      unsubscribe() {
        own.forEach((l) => realtimeListeners.delete(l));
        return Promise.resolve('ok');
      },
    };
    return channel;
  };

  // ── Query builder ───────────────────────────────────────────────────────────
  class MockQueryBuilder {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.orderField = null;
      this.ascending = true;
      this.isSingle = false;
      this.limitCount = null;
      this.updateData = null;
      this.insertData = null;
      this.isDelete = false;
      this.countMode = false;
      this.headOnly = false;
    }

    select(_fields, options = {}) {
      if (options.count) this.countMode = true;
      if (options.head) this.headOnly = true;
      return this;
    }
    eq(field, value) { this.filters.push({ op: 'eq', field, value }); return this; }
    neq(field, value) { this.filters.push({ op: 'neq', field, value }); return this; }
    gt(field, value) { this.filters.push({ op: 'gt', field, value }); return this; }
    gte(field, value) { this.filters.push({ op: 'gte', field, value }); return this; }
    lt(field, value) { this.filters.push({ op: 'lt', field, value }); return this; }
    lte(field, value) { this.filters.push({ op: 'lte', field, value }); return this; }
    in(field, values) { this.filters.push({ op: 'in', field, value: values }); return this; }
    order(field, options = {}) {
      this.orderField = field;
      this.ascending = options.ascending !== false;
      return this;
    }
    limit(count) { this.limitCount = count; return this; }
    single() { this.isSingle = true; return this; }
    maybeSingle() { this.isSingle = true; this.maybe = true; return this; }
    update(updates) { this.updateData = updates; return this; }
    insert(records) { this.insertData = records; return this; }
    upsert(records) { this.insertData = records; this.isUpsert = true; return this; }
    delete() { this.isDelete = true; return this; }

    then(onFulfilled, onRejected) {
      return this.execute()
        .catch((err) => ({ data: null, error: err }))
        .then(onFulfilled, onRejected);
    }

    rowMatches(row) {
      return this.filters.every(({ op, field, value }) => {
        const v = row[field];
        switch (op) {
          case 'eq': return v === value;
          case 'neq': return v !== value;
          case 'in': return Array.isArray(value) && value.includes(v);
          case 'gt': return compare(v, value) > 0;
          case 'gte': return compare(v, value) >= 0;
          case 'lt': return compare(v, value) < 0;
          case 'lte': return compare(v, value) <= 0;
          default: return true;
        }
      });
    }

    async execute() {
      let rows = await readTable(this.table);

      if (this.insertData) {
        const input = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
        const inserted = [];
        for (const r of input) {
          const existingIdx = this.isUpsert && r.id ? rows.findIndex((x) => x.id === r.id) : -1;
          if (existingIdx >= 0) {
            rows[existingIdx] = { ...rows[existingIdx], ...r, updated_at: nowIso() };
            inserted.push(rows[existingIdx]);
          } else {
            const row = { id: newId(), created_at: nowIso(), ...r };
            if (this.table === 'alerts' && row.read === undefined) row.read = false;
            rows.push(row);
            inserted.push(row);
          }
        }
        await writeTable(this.table, rows);
        inserted.forEach((row) => emitChange(this.table, 'INSERT', row));
        const data = this.isSingle || inserted.length === 1 ? inserted[0] : inserted;
        return { data, error: null };
      }

      if (this.updateData) {
        const updated = [];
        const before = [];
        rows = rows.map((r) => {
          if (!this.rowMatches(r)) return r;
          before.push(r);
          const next = { ...r, ...this.updateData, updated_at: nowIso() };
          updated.push(next);
          return next;
        });
        await writeTable(this.table, rows);
        updated.forEach((row, i) => emitChange(this.table, 'UPDATE', row, before[i]));
        if (this.isSingle) return { data: updated[0] || null, error: null };
        return { data: updated, error: null };
      }

      if (this.isDelete) {
        const removed = rows.filter((r) => this.rowMatches(r));
        rows = rows.filter((r) => !this.rowMatches(r));
        await writeTable(this.table, rows);
        removed.forEach((row) => emitChange(this.table, 'DELETE', null, row));
        return { data: removed, error: null };
      }

      rows = rows.filter((r) => this.rowMatches(r));
      const count = rows.length;

      if (this.orderField) {
        const f = this.orderField;
        rows.sort((a, b) => (this.ascending ? 1 : -1) * compare(a[f], b[f]));
      }
      if (this.limitCount) rows = rows.slice(0, this.limitCount);

      if (this.headOnly) return { data: null, count, error: null };

      if (this.isSingle) {
        if (rows.length === 0) {
          if (this.maybe) return { data: null, error: null };
          const err = new Error('No rows found');
          err.code = 'PGRST116';
          return { data: null, error: err };
        }
        return { data: rows[0], error: null };
      }

      return this.countMode ? { data: rows, count, error: null } : { data: rows, error: null };
    }
  }

  // ── Demo data ───────────────────────────────────────────────────────────────
  const seedUserData = async (userId, name) => {
    const profiles = await readTable('user_profiles');
    if (!profiles.some((p) => p.user_id === userId)) {
      profiles.push({
        id: newId(),
        user_id: userId,
        full_name: name || 'Demo User',
        date_of_birth: '1994-06-15',
        age: 32,
        gender: 'Male',
        blood_type: 'O+',
        weight: 78,
        height: 180,
        phone: '+1-555-0199',
        emergency_contact_name: 'Sarah Connor',
        emergency_contact_phone: '+1-555-9111',
        emergency_contact_relationship: 'Spouse',
        insurance_provider: 'Blue Cross Blue Shield',
        insurance_number: 'BCBS-987654321',
        organ_donor: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      });
      await writeTable('user_profiles', profiles);
    }

    const seedIfEmpty = async (table, items) => {
      const rows = await readTable(table);
      if (rows.some((r) => r.user_id === userId)) return;
      items.forEach((item) => rows.push({ id: newId(), user_id: userId, created_at: nowIso(), ...item }));
      await writeTable(table, rows);
    };

    await seedIfEmpty('emergency_contacts', [
      { name: 'John Doe', relationship: 'Brother', country_code: '+1', phone: '5551234', is_primary: false },
    ]);
    await seedIfEmpty('medications', [
      { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily' },
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Every morning' },
    ]);
    await seedIfEmpty('medical_conditions', [
      { name: 'Hypertension', severity: 'Moderate', diagnosed_date: '2023-04-12' },
    ]);
    await seedIfEmpty('allergies', [
      { name: 'Penicillin', severity: 'High', reaction: 'Hives and swelling' },
    ]);
    await seedIfEmpty('alerts', [
      {
        type: 'system',
        title: 'Welcome to VitalFlow',
        message: 'Demo mode is on: vitals come from a built-in sensor simulator. Add Supabase keys in .env to use your real device data.',
        severity: 'low',
        source: 'system',
        read: false,
      },
    ]);

    // 30 days of history, two readings per day.
    const readings = await readTable('health_readings');
    if (!readings.some((r) => r.user_id === userId)) {
      const now = Date.now();
      for (let i = 60; i >= 1; i--) {
        let risk = 0.05 + Math.random() * 0.1;
        if (i === 15 || i === 42) risk = 0.72;
        else if (i === 30) risk = 0.55;
        readings.push({
          id: newId(),
          user_id: userId,
          heart_rate: Math.floor(65 + Math.sin(i / 5) * 8 + Math.random() * 4),
          spo2: Math.floor(96 + Math.cos(i / 10) * 2 + Math.random() * 2),
          temperature: 36.2 + Math.sin(i / 8) * 0.4 + Math.random() * 0.2, // °C
          gsr_value: 0.4 + Math.sin(i / 6) * 0.3 + Math.random() * 0.2,
          heart_attack_risk: risk,
          created_at: new Date(now - i * 12 * 60 * 60 * 1000).toISOString(),
          latitude: 28.6139 + (Math.random() - 0.5) * 0.02,
          longitude: 77.209 + (Math.random() - 0.5) * 0.02,
        });
      }
      await writeTable('health_readings', readings);
    }
  };

  // ── Live sensor simulator ───────────────────────────────────────────────────
  const sim = { timer: null, userId: null, state: null, tick: 0 };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const drift = (v, target, step, rate) => v + (target - v) * rate + (Math.random() - 0.5) * step;

  const simulateReading = async () => {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) {
      stopSimulator();
      return;
    }
    if (!sim.state || sim.userId !== userId) {
      sim.userId = userId;
      sim.state = { hr: 72, spo2: 97.5, temp: 36.7, gsr: 0.5 };
      sim.tick = 0;
    }
    sim.tick += 1;
    const s = sim.state;

    // Every 2 minutes (24 ticks), simulate a 30-second stress episode so the
    // risk card and alert pipeline have something to react to.
    const episode = sim.tick % 24 >= 18;
    const rate = episode ? 0.35 : 0.25;
    s.hr = clamp(drift(s.hr, episode ? 140 : 74, 4, rate), 48, 170);
    s.spo2 = clamp(drift(s.spo2, episode ? 90.5 : 97.5, 0.8, rate), 85, 100);
    s.temp = clamp(drift(s.temp, episode ? 37.9 : 36.7, 0.1, rate), 35.5, 39.5);
    s.gsr = clamp(drift(s.gsr, episode ? 1.4 : 0.5, 0.1, rate), 0.1, 2);

    const risk = clamp(
      0.05 + Math.max(0, s.hr - 100) / 90 + Math.max(0, 95 - s.spo2) / 12 + Math.max(0, s.gsr - 0.9) / 3,
      0.02,
      0.95
    );

    await new MockQueryBuilder('health_readings').insert({
      user_id: userId,
      heart_rate: Math.round(s.hr),
      spo2: Math.round(s.spo2),
      temperature: Math.round(s.temp * 10) / 10,
      gsr_value: Math.round(s.gsr * 100) / 100,
      heart_attack_risk: Math.round(risk * 100) / 100,
      latitude: 28.6139,
      longitude: 77.209,
    });

    // Keep storage bounded.
    if (sim.tick % 20 === 0) {
      const rows = await readTable('health_readings');
      const mine = rows.filter((r) => r.user_id === userId);
      if (mine.length > MAX_READINGS_PER_USER) {
        const keep = new Set(
          mine
            .sort((a, b) => compare(b.created_at, a.created_at))
            .slice(0, MAX_READINGS_PER_USER)
            .map((r) => r.id)
        );
        await writeTable('health_readings', rows.filter((r) => r.user_id !== userId || keep.has(r.id)));
      }
    }
  };

  const startSimulator = () => {
    if (sim.timer || typeof window === 'undefined') return;
    sim.timer = setInterval(() => {
      simulateReading().catch((err) => console.error('Simulator error:', err));
    }, SIMULATOR_INTERVAL_MS);
  };

  function stopSimulator() {
    if (sim.timer) clearInterval(sim.timer);
    sim.timer = null;
    sim.state = null;
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authListeners = new Set();

  async function getSession() {
    try {
      const raw = await getItem('mock_session');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  const buildSession = (user) => ({
    user: { id: user.id, email: user.email, user_metadata: user.user_metadata || {} },
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
  });

  const startSession = async (user) => {
    await seedUserData(user.id, user.user_metadata?.full_name);
    const session = buildSession(user);
    await setItem('mock_session', JSON.stringify(session));
    authListeners.forEach((l) => l('SIGNED_IN', session));
    startSimulator();
    return session;
  };

  const authError = (message, status = 400) => {
    const err = new Error(message);
    err.status = status;
    return err;
  };

  const readUsers = async () => {
    try {
      return JSON.parse((await getItem('mock_users')) || '[]');
    } catch (_) {
      return [];
    }
  };

  const auth = {
    getSession: async () => {
      const session = await getSession();
      if (session) startSimulator();
      return { data: { session }, error: null };
    },
    getUser: async () => {
      const session = await getSession();
      if (!session) return { data: { user: null }, error: authError('No user session', 401) };
      return { data: { user: session.user }, error: null };
    },
    setSession: async () => {
      const session = await getSession();
      if (!session) return { data: { session: null }, error: authError('Session expired', 401) };
      return { data: { session }, error: null };
    },
    onAuthStateChange: (callback) => {
      authListeners.add(callback);
      getSession().then((session) => callback('INITIAL_SESSION', session));
      return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
    },
    signInWithPassword: async ({ email, password }) => {
      const users = await readUsers();
      const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
      if (!user || user.password !== password) {
        return { data: { session: null, user: null }, error: authError('Invalid login credentials') };
      }
      const session = await startSession(user);
      return { data: { session, user: session.user }, error: null };
    },
    signUp: async ({ email, password, options }) => {
      const users = await readUsers();
      if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
        return { data: { session: null, user: null }, error: authError('User already registered', 422) };
      }
      const user = { id: newId(), email, password, user_metadata: options?.data || {} };
      users.push(user);
      await setItem('mock_users', JSON.stringify(users));
      const session = await startSession(user);
      return { data: { session, user: session.user }, error: null };
    },
    signOut: async () => {
      stopSimulator();
      await removeItem('mock_session');
      authListeners.forEach((l) => l('SIGNED_OUT', null));
      return { error: null };
    },
    resetPasswordForEmail: async () => ({
      data: {},
      error: authError('Password reset emails are not available in demo mode. Connect Supabase to enable it.'),
    }),
  };

  // ── Storage buckets (avatars are kept as data URLs) ─────────────────────────
  const bucketKey = (bucket, path) => `mock_bucket_${bucket}_${path}`;
  const toDataUrl = (body, contentType) => {
    try {
      if (body instanceof Uint8Array || body instanceof ArrayBuffer) {
        const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = typeof btoa === 'function' ? btoa(binary) : globalThis.Buffer?.from(bytes).toString('base64');
        return b64 ? `data:${contentType || 'image/jpeg'};base64,${b64}` : null;
      }
    } catch (_) {}
    return null;
  };
  const uploadedUrls = {};

  const storageApi = {
    from: (bucket) => ({
      upload: async (path, body, options) => {
        const url = toDataUrl(body, options?.contentType);
        if (url) {
          uploadedUrls[bucketKey(bucket, path)] = url;
          await setItem(bucketKey(bucket, path), url);
        }
        return { data: { path }, error: null };
      },
      remove: async (paths) => {
        for (const p of paths || []) {
          delete uploadedUrls[bucketKey(bucket, p)];
          await removeItem(bucketKey(bucket, p));
        }
        return { data: paths, error: null };
      },
      getPublicUrl: (path) => ({
        data: { publicUrl: uploadedUrls[bucketKey(bucket, path)] || '' },
      }),
    }),
  };

  return {
    auth,
    from: (table) => new MockQueryBuilder(table),
    channel: () => createChannel(),
    removeChannel: (channel) => {
      channel?.unsubscribe?.();
      return Promise.resolve('ok');
    },
    storage: storageApi,
  };
}

function compare(a, b) {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  return a < b ? -1 : 1;
}
