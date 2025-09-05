// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Correct way to access environment variables in Vite:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // You might want a more user-friendly error message or
  // fallback for production builds if these are genuinely missing.
  // For development, this error is good to catch misconfiguration.
  throw new Error('Supabase URL and Anon Key must be provided in environment variables (e.g., VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);