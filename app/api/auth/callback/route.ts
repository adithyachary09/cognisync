import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = {
        getAll() { return [] },
        set() {}
    }; 

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.headers.get('cookie')?.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1]
          },
          set(name: string, value: string, options: CookieOptions) {
            // Note: This is handled by the response headers below in Next.js App Router
          },
          remove(name: string, options: CookieOptions) {
            // Note: This is handled by the response headers below
          },
        },
      }
    )
    
    // Exchange the auth code for a user session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Create response with redirect
      const response = NextResponse.redirect(`${origin}${next}`)
      
      // Copy cookies from supabase client to response
      const supabaseResponse = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) { return '' }, // Not needed for setting
            set(name: string, value: string, options: CookieOptions) {
                response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
                response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )
      
      // This dummy call triggers the 'set' and 'remove' methods above to apply cookies to the response
      await supabaseResponse.auth.getSession()

      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}