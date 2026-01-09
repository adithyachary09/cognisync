import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Frontend sends 'newPassword', we map it here
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    if (newPassword.length < 6) {
       return NextResponse.json({ error: 'Password too short' }, { status: 400 });
    }

    // 1. Find User ID by Email (Admin Privilege Required)
    // We list users filtering by email to get the correct UUID
    const { data, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (searchError) {
       console.error("User Search Error:", searchError);
       return NextResponse.json({ error: 'System lookup failed' }, { status: 500 });
    }

    const user = data.users.find((u) => u.email === email);

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Update the Password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Auth Update Error:", updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Update Password API Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}