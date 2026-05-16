import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only client with full DB access (never exposed to browser)
export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
