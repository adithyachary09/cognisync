import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) return NextResponse.json({ error: 'Token missing' }, { status: 400 });

    // 1. Find the token entry
    const { data: tokenEntry, error: dbError } = await supabaseAdmin
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (dbError || !tokenEntry) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // 2. Check Expiry
    if (new Date(tokenEntry.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 410 });
    }

    // 3. Verify the User in Supabase Auth (Crucial Step)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenEntry.user_id,
      { email_confirm: true }
    );

    if (authError) {
      console.error("Auth System Error:", authError);
      return NextResponse.json({ error: 'Failed to verify account' }, { status: 500 });
    }

    // 4. Update Public User Table (Sync status)
    await supabaseAdmin
      .from('users')
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq('id', tokenEntry.user_id);

    // 5. Cleanup Token
    await supabaseAdmin
      .from('verification_tokens')
      .delete()
      .eq('id', tokenEntry.id);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Verify API Critical Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}