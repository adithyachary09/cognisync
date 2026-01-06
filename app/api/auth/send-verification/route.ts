import { NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/email-service'; 
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) return NextResponse.json({ error: 'Email missing' }, { status: 400 });

    console.log(`📧 Processing verification for: ${email}`);

    // 1. Generate Token
    const token = crypto.randomBytes(32).toString('hex');

    // 2. Save to DB
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        identifier: email,
        code: token,
        type: 'email',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (dbError) {
      console.error("❌ Database Error:", dbError);
      return NextResponse.json({ error: 'Database Write Failed' }, { status: 500 });
    }

    // 3. Send Email (Now properly catches Resend errors)
    await sendVerificationEmail(email, token);

    console.log("✅ Email successfully dispatched via Resend");
    return NextResponse.json({ success: true });

  } catch (err: any) {
    // This will now catch the error thrown from email-service.ts
    console.error("❌ Critical Email API Error:", err.message);
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 });
  }
}