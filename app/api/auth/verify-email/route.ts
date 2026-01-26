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
      console.error("Token Lookup Error:", dbError);
      return NextResponse.json({ error: 'Invalid or missing token' }, { status: 400 });
    }

    // 2. Strict Expiry Check
    // "Is right now LATER than the expiry time?"
    const now = new Date();
    const expiresAt = new Date(tokenEntry.expires_at);

    if (now > expiresAt) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 410 });
    }

    // 3. Verify User in Supabase Auth (The actual security part)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenEntry.user_id,
      { email_confirm: true, user_metadata: { email_verified: true } }
    );

    if (authError) {
      console.error("Auth Update Error:", authError);
      return NextResponse.json({ error: 'System failed to verify identity' }, { status: 500 });
    }

    // 4. Update Public Table (For your UI)
    await supabaseAdmin
      .from('users')
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq('id', tokenEntry.user_id);

    // 5. Cleanup used token
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