import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password, name, google } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if user already exists (Crucial for Google OAuth)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .single();

    if (existingUser) {
      // If it's a Google login and user exists, just return the user WITH METADATA
      if (google) {
        return NextResponse.json({ 
          success: true, 
          user: { 
            id: existingUser.id, 
            email: existingUser.email, 
            name: existingUser.name,
            // 👇 FIX: Inject Google Metadata so the UI detects it as "Connected"
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

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([
        { 
          email: cleanEmail, 
          password_hash: hashedPassword, // Will be null for Google users
          name: name?.trim() || null 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Registration DB Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name,
        // 👇 FIX: Inject Metadata for new Google users too
        app_metadata: google ? { provider: 'google', providers: ['google'] } : {},
        identities: google ? [{ provider: 'google' }] : []
      } 
    }, { status: 201 });

  } catch (err) {
    console.error("Register API Crash:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}