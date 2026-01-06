import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import twilio from 'twilio';

export async function POST(request: Request) {
  try {
    // 1. Validate Env Vars (Debugging)
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error("❌ Missing Twilio Keys in .env.local");
      return NextResponse.json({ error: 'Server Misconfiguration: Missing Twilio Keys' }, { status: 500 });
    }

    // 2. Initialize Client INSIDE the handler to prevent crash
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number missing' }, { status: 400 });
    }

    console.log(`🚀 Attempting to send OTP to +91${phoneNumber}`);

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Save to Supabase
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        identifier: phoneNumber,
        code: otp,
        type: 'phone',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    if (dbError) {
      console.error("❌ Database Error:", dbError);
      return NextResponse.json({ error: 'Database error saving OTP' }, { status: 500 });
    }

    // 5. Send Real SMS
    await client.messages.create({
      body: `Your CogniSync Verification Code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phoneNumber}`,
    });

    console.log("✅ SMS Sent Successfully via Twilio");
    return NextResponse.json({ success: true, message: 'OTP sent successfully' });

  } catch (err: any) {
    console.error("❌ Twilio API Error:", err); // Check your terminal for this!
    
    // Detailed error for Twilio Trial issues
    if (err.code === 21608) {
      return NextResponse.json({ error: 'Twilio Trial: You must verify this phone number in Twilio Console first.' }, { status: 400 });
    }
    
    return NextResponse.json({ error: err.message || 'Failed to send OTP' }, { status: 500 });
  }
}