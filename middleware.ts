import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  // 1. Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Fix: Set cookie on request object
          request.cookies.set({
            name,
            value,
            ...options,
          })
          
          // Fix: Recreation of response to apply cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          // Fix: Set cookie on response object using correct arguments
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // Fix: Remove cookie from request
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          
          // Fix: Recreation of response
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          // Fix: Remove cookie from response
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 2. Refresh session if expired
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}