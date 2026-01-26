import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
        return NextResponse.json({ error: 'Token missing' }, { status: 400 });
    }

    // 1. Fetch Token
    const { data: tokenEntry, error: dbError } = await supabaseAdmin
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (dbError || !tokenEntry) {
      return NextResponse.json({ error: 'Invalid or missing token' }, { status: 400 });
    }

    // 2. Verify User in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenEntry.user_id,
      { email_confirm: true, user_metadata: { email_verified: true } }
    );

    // Ignore error if user is already verified
    if (authError) {
      console.warn("Auth Update Warning:", authError);
    }

    // 3. Update Public Table (Critical for UI)
    await supabaseAdmin
      .from('users')
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq('id', tokenEntry.user_id);

    // 4. Cleanup used token
    await supabaseAdmin
      .from('verification_tokens')
      .delete()
      .eq('id', tokenEntry.id);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Verify Email API Critical:", err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}