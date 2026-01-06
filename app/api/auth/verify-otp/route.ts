import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { phoneNumber, code } = await request.json();

    if (!phoneNumber || !code) {
      return NextResponse.json({ error: 'Missing phone or code' }, { status: 400 });
    }

    // 1. Check DB for matching OTP
    // We look for a code that matches the phone number AND hasn't expired yet
    const { data, error } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('identifier', phoneNumber)
      .eq('code', code)
      .eq('type', 'phone')
      .gt('expires_at', new Date().toISOString()) // Ensure it is not expired
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // 2. Delete the used OTP (Prevent reuse)
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('id', data.id);

    return NextResponse.json({ success: true, message: 'Phone Verified Successfully' });

  } catch (err) {
    console.error("Verification Error:", err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}