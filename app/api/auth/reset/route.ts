import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // 1. Check if user exists
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      // Ensure this URL matches your actual deployed domain or localhost
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

      // 2. Insert Token into DB
      const { error: insertError } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert([{
          user_id: user.id,
          token,
          expires_at: new Date(Date.now() + 1000 * 60 * 15).toISOString() // 15 Minutes Expiry
        }]);

      if (insertError) {
        console.error("Token Insert Error:", insertError);
        // If DB fails, we stop here
        return NextResponse.json({ success: true }); 
      }

      // 3. Configure Transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD 
        }
      });

      // 4. Send Email (MUST AWAIT IN NEXT.JS)
      await transporter.sendMail({
        from: `"CogniSync Security" <${process.env.GMAIL_USER}>`,
        to: cleanEmail,
        subject: 'Secure Account Recovery',
        html: `
          <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
              
              <div style="text-align: center; margin-bottom: 32px;">
                 <h2 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0;">Reset Password</h2>
                 <p style="color: #64748b; font-size: 14px; margin-top: 8px;">CogniSync Clinical Platform</p>
              </div>
              
              <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
                Hello <strong>${user.name || 'User'}</strong>,
              </p>
              
              <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 32px;">
                We received a request to reset your credentials. To regain access to your workstation, please click the button below.
              </p>

              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${resetUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2);">
                  Reset My Password
                </a>
              </div>

              <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                This link expires in <strong>15 minutes</strong>.
              </p>

              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="font-size: 11px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em;">
                  Secure Clinical Intelligence System
                </p>
              </div>
            </div>
          </div>
        `
      });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Reset API Critical Error:", err);
    // Always return success to prevent email enumeration attacks
    return NextResponse.json({ success: true });
  }
}