import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://acbodnbcpsbgdenmfjlu.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_r7aFLiYPVf57RrahGo6UDQ_QrhUdIdt';

// Server-side admin client for general operations (signup/login)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Create a client scoped to a specific user's JWT token for RLS
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
