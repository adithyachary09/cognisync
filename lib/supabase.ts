import { createBrowserClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase public environment variables")
}

/**
 * Client-side Supabase instance
 * UPDATED: Uses createBrowserClient for Cookie Support
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

/**
 * Server-side Supabase Admin instance
 * Kept as standard client for Admin tasks
 */
export const supabaseAdmin =
  typeof window === "undefined"
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : (null as any)