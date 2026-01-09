import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // 1. Fetch user hash securely
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, password_hash')
      .eq('email', email)
      .single();

    if (error || !user || !user.password_hash) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Verify Password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify Creds Error:", err);
    return NextResponse.json({ error: 'Server verification failed' }, { status: 500 });
  }
}