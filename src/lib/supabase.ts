import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';
import type { Database } from '@/types/supabase';

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!client) {
    client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
}
