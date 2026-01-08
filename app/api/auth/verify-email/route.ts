import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) return NextResponse.json({ error: 'Token missing' }, { status: 400 });

    // 1. Verify Token & Check Expiry
    const { data: verificationEntry, error: tokenError } = await supabaseAdmin
      .from('verification_tokens')
      .select('id, user_id, expires_at')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString()) // Must not be expired
      .maybeSingle();

    if (tokenError || !verificationEntry) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // 2. Update User as Verified
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq('id', verificationEntry.user_id);

    if (userUpdateError) {
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    // 3. Cleanup: Delete the used token
    await supabaseAdmin
      .from('verification_tokens')
      .delete()
      .eq('id', verificationEntry.id);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Verify Email API Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}