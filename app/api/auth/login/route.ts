// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log("Attempting login for:", cleanEmail);

    // 1. Fetch user from custom 'users' table
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .single();

    if (error || !user) {
      console.error("Login Error: User not found in database", error);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 2. Compare password with the hash in the DB
    // Note: Ensure your column name is exactly 'password_hash'
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      console.warn("Login Warning: Password mismatch for", cleanEmail);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    console.log("Login Successful for:", cleanEmail);

    // 3. Return user data including the ID for context
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      } 
    }, { status: 200 });

  } catch (err) {
    console.error("Login API Crash:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}