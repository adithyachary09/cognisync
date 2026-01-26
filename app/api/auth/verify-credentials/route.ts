import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Stateless Client: Verifies password without creating a browser session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return NextResponse.json({ error: error.message }, { status: 401 });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}