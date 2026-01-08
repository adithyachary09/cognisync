import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, password, name, google } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .single();

    if (existingUser) {
      // If Google login & user exists, return success
      if (google) {
        return NextResponse.json({ 
          success: true, 
          user: { 
            id: existingUser.id, 
            email: existingUser.email, 
            name: existingUser.name,
            app_metadata: { provider: 'google', providers: ['google'] },
            identities: [{ provider: 'google' }]
          } 
        }, { status: 200 });
      }
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // 2. Handle New Registration
    let hashedPassword = null;
    if (!google) {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
      }
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Insert User
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([
        { 
          email: cleanEmail, 
          password_hash: hashedPassword, 
          name: name?.trim() || null 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Registration DB Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. SEND PREMIUM VERIFICATION EMAIL (Only for Email/Password users)
    if (!google && newUser) {
      try {
        const token = crypto.randomBytes(32).toString('hex');
        
        // Ensure this URL matches your frontend route (we will build this page next if needed)
        const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
        const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`;

        // Store Token in DB
        await supabaseAdmin.from('verification_tokens').insert([{
          user_id: newUser.id,
          token,
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // 24 Hours Expiry
        }]);

        // Configure Mailer
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD 
          }
        });

        // Send Email
        await transporter.sendMail({
          from: `"CogniSync Security" <${process.env.GMAIL_USER}>`,
          to: cleanEmail,
          subject: 'Action Required: Activate Your Clinical Workspace',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify Email</title>
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
                          <h2 style="font-size: 18px; font-weight: 600; color: #334155; margin-top: 0; margin-bottom: 20px; text-align: center;">Verify Your Identity</h2>
                          
                          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 16px;">
                            Hello <strong>${newUser.name || 'User'}</strong>,
                          </p>
                          
                          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                            Welcome to CogniSync. To secure your workspace and ensure clinical data integrity, please verify your email address to activate your account.
                          </p>

                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td align="center">
                                <a href="${verifyUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); transition: all 0.2s;">
                                  Activate Account
                                </a>
                              </td>
                            </tr>
                          </table>

                          <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 32px; margin-bottom: 0;">
                            This secure link expires in <strong>24 hours</strong>.
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                          <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center; margin: 0;">
                            If you did not create a CogniSync account, please disregard this email.
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
      } catch (mailError) {
        console.error("Email Sending Failed:", mailError);
        // We do NOT fail registration if email fails, but we log it.
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name,
        app_metadata: google ? { provider: 'google', providers: ['google'] } : {},
        identities: google ? [{ provider: 'google' }] : []
      } 
    }, { status: 201 });

  } catch (err) {
    console.error("Register API Crash:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}