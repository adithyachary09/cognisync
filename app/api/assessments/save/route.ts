import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // 1. Await cookies (Critical for Next.js 15)
  const cookieStore = await cookies()

  // 2. Create Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle read-only cookie store in Route Handlers
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle read-only cookie store
          }
        },
      },
    }
  )

  try {
    // 3. Securely Get User
    // getUser() is safer than getSession() as it validates the token on the server
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Auth Error:", authError)
      return NextResponse.json({ error: 'Unauthorized - No User Found' }, { status: 401 })
    }

    // 4. Parse Request Data
    const { testId, testName, score, category } = await request.json()

    // 5. Insert into Database
    const { error: insertError } = await supabase
      .from('assessments')
      .insert({
        user_id: user.id,
        test_id: testId,
        test_name: testName,
        category: category,
        score: score
      })

    if (insertError) {
        console.error("Database Insert Error:", insertError)
        throw insertError
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Assessment Save Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}