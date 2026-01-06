import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const { data: user } = await supabaseAdmin.from('users').select('id, name').eq('email', cleanEmail).maybeSingle();

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

      // 1. Instant DB Insert
      await supabaseAdmin.from('password_reset_tokens').insert([{
        user_id: user.id,
        token,
        expires_at: new Date(Date.now() + 30000).toISOString() // 30 Seconds Expiry
      }]);

      // 2. High-Speed SMTP (Pool enabled for faster connection)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true, // Speeds up consecutive sends
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });

      // 3. FIRE AND FORGET: Professional Clinical Template
      transporter.sendMail({
        from: `"CogniSync Security" <${process.env.GMAIL_USER}>`,
        to: cleanEmail,
        subject: 'Secure Account Recovery',
        html: `
          <div style="background-color: #ffffff; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; color: #0f172a; text-align: center;">
            <div style="max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              
              <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 24px;">Secure Account Recovery</h2>
              
              <p style="text-align: left; font-size: 15px; color: #475569; line-height: 1.6;">
                Hello <strong>${user.name || 'User'}</strong>,
              </p>
              
              <p style="text-align: left; font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 32px;">
                A request has been initiated to reset the credentials for your CogniSync workstation. To maintain the integrity of your clinical data, please authorize this change below.
              </p>

              <a href="${resetUrl}" style="background-color: #0fb9b1; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; letter-spacing: 0.05em;">
                RESET CREDENTIALS
              </a>

              <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">
                Security link valid for <strong>30 seconds</strong>.
              </p>

              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: left;">
                <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                  If you did not initiate this recovery, please disregard. Your current security parameters remain unchanged.
                </p>
              </div>
            </div>
            <p style="font-size: 11px; color: #cbd5e1; margin-top: 24px; text-transform: uppercase; letter-spacing: 1px;">
              CogniSync Clinical Intelligence
            </p>
          </div>
        `
      }).catch(err => console.error("SMTP Error:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: true });
  }
}