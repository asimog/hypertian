import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv, getSupabasePublishableKey } from '@/lib/env';

export function createAdminClient() {
  const env = getServerEnv();
  const key = env.SUPABASE_SERVICE_ROLE_KEY || getSupabasePublishableKey(env);
  if (!key) {
    throw new Error('Supabase server client requires SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
