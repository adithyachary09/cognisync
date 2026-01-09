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
      .maybeSingle(); // We check expiry manually below for clearer errors

    // Detailed Error Handling
    if (tokenError || !verificationEntry) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (new Date(verificationEntry.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link Expired' }, { status: 410 }); // 410 Gone
    }

    // 2. Update Supabase AUTH User (Critical: This updates the actual system session)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      verificationEntry.user_id,
      { email_confirm: true } // This sets the system 'email_confirmed_at'
    );

    if (authError) {
      console.error("Auth Update Failed:", authError);
      return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }

    // 3. Optional: Sync to public 'users' table if you use one
    await supabaseAdmin
      .from('users')
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq('id', verificationEntry.user_id);

    // 4. Cleanup: Delete the used token
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