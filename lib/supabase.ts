import { createBrowserClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase public environment variables")
}

// UPDATED: Uses createBrowserClient for proper Cookie Sync
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side Admin instance (unchanged)
export const supabaseAdmin =
  typeof window === "undefined"
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : (null as any)