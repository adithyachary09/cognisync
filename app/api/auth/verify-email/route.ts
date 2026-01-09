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
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // 2. Lenient Expiry Check (Handles Timezone drifts)
    // We check if the expiry time + 1 hour buffer is still in the past
    const expiresAt = new Date(tokenEntry.expires_at).getTime();
    const now = new Date().getTime();
    
    // If it expired more than 5 minutes ago, fail. 
    // (Buffer helps if DB and Server verify clocks are slightly off)
    if (expiresAt < (now - 1000 * 60 * 5)) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 410 });
    }

    // 3. Verify User in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenEntry.user_id,
      { email_confirm: true }
    );

    if (authError) {
      console.error("Auth Update Error:", authError);
      return NextResponse.json({ error: 'System failed to verify' }, { status: 500 });
    }

    // 4. Update Public Table
    await supabaseAdmin
      .from('users')
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq('id', tokenEntry.user_id);

    // 5. Cleanup
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