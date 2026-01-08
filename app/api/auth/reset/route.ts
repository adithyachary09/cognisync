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
      // URL must match your frontend route
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

      // 4. Send Premium HTML Email
      await transporter.sendMail({
        from: `"CogniSync Security" <${process.env.GMAIL_USER}>`,
        to: cleanEmail,
        subject: 'Action Required: Authorize Access Recovery',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Password</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e2e8f0;">
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(to bottom, #ffffff, #f8fafc);">
                        <div style="display: inline-block; width: 48px; height: 48px; background-color: #0f172a; border-radius: 12px; margin-bottom: 16px; line-height: 48px; color: white; font-weight: bold; font-size: 24px;">C</div>
                        <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">CogniSync</h1>
                        <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Clinical Intelligence</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 40px 40px 40px;">
                        <h2 style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 0; margin-bottom: 16px;">Recovery Authentication</h2>
                        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                          Hello <strong>${user.name || 'User'}</strong>,
                        </p>
                        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                          We received a request to reset the credentials associated with your workspace. To maintain clinical data integrity, please authorize this request by clicking the secure link below.
                        </p>
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2); transition: all 0.2s;">
                                Authorize Password Reset
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 32px; margin-bottom: 0;">
                          This secure link expires in <strong>15 minutes</strong>.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="font-size: 11px; color: #64748b; line-height: 1.5; text-align: center;">
                              <strong>Security Notice:</strong> If you did not initiate this request, no action is required. Your account remains secure.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top: 12px; text-align: center;">
                              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                                &copy; ${new Date().getFullYear()} CogniSync Systems. All rights reserved.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Reset API Critical Error:", err);
    return NextResponse.json({ success: true });
  }
}