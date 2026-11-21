import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { createMockSupabase } from './mockSupabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project-ref')
);
export const isDemoMode = !hasSupabaseConfig;

if (isDemoMode) {
  console.warn('Supabase keys not set: running VitalFlow in local demo mode.');
}

export const supabase = isDemoMode
  ? createMockSupabase(AsyncStorage)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 10 } },
      global: { headers: { 'X-Client-Info': 'vitalflow' } },
    });
