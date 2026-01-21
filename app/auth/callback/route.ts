import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
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
            // Handled by response
          },
          remove(name: string, options: CookieOptions) {
            // Handled by response
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)
      const supabaseResponse = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) { return '' },
            set(name: string, value: string, options: CookieOptions) {
                response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
                response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )
      await supabaseResponse.auth.getSession()
      return response
    }
  }
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}