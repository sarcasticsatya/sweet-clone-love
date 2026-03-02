import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Cloudflare Worker proxy URL – routes traffic through an unblocked domain
// so Indian users can reach the backend without hitting the DNS block on *.supabase.co
const PROXY_URL = 'https://snowy-hat-87c1.aiwasinc-06d.workers.dev';

const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(PROXY_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
