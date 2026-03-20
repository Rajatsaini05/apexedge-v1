// src/config/supabase.js
// Single Supabase client instance shared across the whole app.
// Import `supabase` anywhere you need DB or Auth access.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    '[APEXEDGE] Missing Supabase env vars.\n' +
    'Copy .env.example → .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    'Find them at: Supabase Dashboard → Project Settings → API'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    // Persist session in localStorage so users stay logged in on refresh
    persistSession: true,
    autoRefreshToken: true,
  },
});
