import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // 1. Get the current active session to verify WHO is asking
    // We use the SSR client to read the HttpOnly cookies from the browser
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {},
          remove(name: string, options: CookieOptions) {},
        },
      }
    );

    // Get the user from the session
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    // 2. Get the password they typed
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    // 3. Verify by attempting a "Dry Run" Sign-In
    // We use a fresh, ephemeral client with the ANON key.
    // This accurately tests if the credentials are valid for login.
    const supabaseVerification = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false, // Critical: Don't overwrite the user's browser cookie
          detectSessionInUrl: false
        }
      }
    );

    // Attempt sign-in with the Session Email + Provided Password
    const { error: signInError } = await supabaseVerification.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (signInError) {
      console.error("Verification failed:", signInError.message);
      // Return 403 (Forbidden) specifically for wrong passwords
      return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
    }

    // 4. Success
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[verify-credentials] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}