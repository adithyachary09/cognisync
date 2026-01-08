import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // 1. Get User ID
    const { data: user } = await supabaseAdmin.from('users').select('id, name').eq('email', cleanEmail).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. Generate Token
    const token = crypto.randomBytes(32).toString('hex');
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`; // Make sure you have a page for this!
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`;

    // 3. Save Token
    await supabaseAdmin.from('verification_tokens').insert([{
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // 24 Hours
    }]);

    // 4. Send Premium Email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });

    await transporter.sendMail({
      from: `"CogniSync Security" <${process.env.GMAIL_USER}>`,
      to: cleanEmail,
      subject: 'Action Required: Activate Your Clinical Workspace',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="background-color: #f8fafc; font-family: sans-serif; padding: 40px 0;">
          <table align="center" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden;">
            <tr>
              <td style="padding: 40px; text-align: center; background: linear-gradient(to bottom, #ffffff, #f1f5f9);">
                <img src="${logoUrl}" width="56" style="border-radius: 12px; display: block; margin: 0 auto 16px;" />
                <h1 style="margin:0; font-size: 20px; color: #0f172a;">CogniSync</h1>
                <p style="margin: 4px 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Clinical Intelligence</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 40px;">
                <h2 style="font-size: 18px; color: #334155; margin: 0 0 16px; text-align: center;">Verify Your Identity</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">Hello <strong>${name || 'User'}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">Please verify your email address to secure your CogniSync workspace.</p>
                <table width="100%"><tr><td align="center">
                  <a href="${verifyUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; display: inline-block;">Verify Email</a>
                </td></tr></table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}