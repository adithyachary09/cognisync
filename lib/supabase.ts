import { createBrowserClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase public environment variables")
}

// ✅ CRITICAL: Client factory with proper cookie handling
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return undefined
        const cookies = document.cookie.split('; ')
        const cookie = cookies.find(c => c.startsWith(`${name}=`))
        return cookie?.split('=')[1]
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return
        let cookieString = `${name}=${value}; path=/; SameSite=Lax; Secure`
        if (options?.maxAge) cookieString += `; max-age=${options.maxAge}`
        document.cookie = cookieString
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; Secure`
      },
    },
  })
}

// Legacy export for backward compatibility
export const supabase = createClient()

// Server-side Admin instance
export const supabaseAdmin =
  typeof window === "undefined"
    ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : (null as any)