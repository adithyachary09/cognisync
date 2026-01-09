import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // FIX: Read 'password' instead of 'newPassword' to match frontend
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    if (password.length < 6) {
       return NextResponse.json({ error: 'Password too short' }, { status: 400 });
    }

    // 1. Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 2. Update DB
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', email);

    if (error) {
      console.error("DB Update Error:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update Password Error:", err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}