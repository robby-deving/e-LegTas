// config/supabase.js

// Import the 'path' module to help with resolving file paths
const path = require('path');

// Load environment variables, explicitly pointing to the .env file's location.
// __dirname is the directory of the current file (config/supabase.js).
// We go up two levels (../../) from 'src/config' to reach the 'server' root directory,
// where the .env file is located.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Regular client for general operations


// Crucial check: Ensure environment variables are loaded before initializing Supabase client.
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Supabase URL or Anon Key not found in environment variables.');
 
    process.exit(1);
}

// Create and export the Supabase client instance
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = { 
  supabase, 
  supabaseAdmin 
};
