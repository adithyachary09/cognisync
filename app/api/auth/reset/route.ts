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
      // The frontend URL for the reset page
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
      
      // The absolute URL for the logo (required for email clients)
      const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`;

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
        subject: 'Secure Password Reset Request', // Less alarming, professional
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Password</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 0;">
              <tr>
                <td align="center">
                  
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; border: 1px solid #e2e8f0;">
                    
                    <tr>
                      <td style="padding: 40px 40px 24px 40px; text-align: center; background: linear-gradient(to bottom, #ffffff, #f1f5f9);">
                        <img src="${logoUrl}" alt="CogniSync" width="56" height="56" style="display: block; margin: 0 auto 16px auto; border-radius: 12px;" />
                        <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">CogniSync</h1>
                        <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Clinical Intelligence Platform</p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 0 40px 40px 40px;">
                        <h2 style="font-size: 18px; font-weight: 600; color: #334155; margin-top: 0; margin-bottom: 20px; text-align: center;">Reset Your Password</h2>
                        
                        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 16px;">
                          Hello <strong>${user.name || 'User'}</strong>,
                        </p>
                        
                        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                          We received a request to update the password for your CogniSync account. If you initiated this request, please use the button below to set up your new credentials securely.
                        </p>

                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); transition: all 0.2s;">
                                Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 32px; margin-bottom: 0;">
                          This link is valid for <strong>15 minutes</strong>.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center; margin: 0;">
                          If you did not request a password reset, you can safely ignore this email. Your account remains secure.
                        </p>
                        <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 12px;">
                          &copy; ${new Date().getFullYear()} CogniSync Systems.
                        </p>
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