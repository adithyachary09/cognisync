import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // SERVICE ROLE client: verifies credentials server-side with zero session side-effects
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // signInWithPassword on the service-role client does a pure credential check
    // It does NOT create or overwrite any browser-side session cookie
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    // Explicitly sign out the ephemeral service-role session so nothing leaks
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}