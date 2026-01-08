import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // 1. Parse Request
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
    }

    // 2. Verify Token & Check Expiry
    const { data: resetEntry, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, expires_at')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString()) // Check if not expired
      .maybeSingle();

    if (tokenError || !resetEntry) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Update User's Password
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', resetEntry.user_id);

    if (userUpdateError) {
      console.error("User Update Error:", userUpdateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    // 5. DELETE the used token
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('id', resetEntry.id);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });

  } catch (err) {
    console.error("Update Password API Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}