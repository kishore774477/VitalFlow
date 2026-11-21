import { createClient } from '@supabase/supabase-js';
import { createMockSupabase } from './mockSupabase';

// Web build: localStorage in the browser, an in-memory store during static rendering.
const isBrowser = typeof window !== 'undefined';
const memoryStore = {};

const webStorage = {
  getItem: async (key) => (isBrowser ? window.localStorage.getItem(key) : memoryStore[key] ?? null),
  setItem: async (key, value) => {
    if (isBrowser) window.localStorage.setItem(key, value);
    else memoryStore[key] = value;
  },
  removeItem: async (key) => {
    if (isBrowser) window.localStorage.removeItem(key);
    else delete memoryStore[key];
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project-ref')
);
export const isDemoMode = !hasSupabaseConfig;

if (isDemoMode && isBrowser) {
  console.warn('Supabase keys not set: running VitalFlow in local demo mode.');
}

export const supabase = isDemoMode
  ? createMockSupabase(webStorage)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: webStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: isBrowser,
      },
      realtime: { params: { eventsPerSecond: 10 } },
      global: { headers: { 'X-Client-Info': 'vitalflow' } },
    });
