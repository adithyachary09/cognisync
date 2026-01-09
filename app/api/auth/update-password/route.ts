import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    if (newPassword.length < 6) {
       return NextResponse.json({ error: 'Password must be 6+ characters' }, { status: 400 });
    }

    // 1. Locate User ID reliably by Email
    const { data: { users }, error: findError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (findError) {
        console.error("Admin List Error:", findError);
        return NextResponse.json({ error: 'System error' }, { status: 500 });
    }

    const targetUser = users.find(u => u.email === email);

    if (!targetUser) {
        return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    // 2. Force Update Password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password Update Failed:", updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Update Password API Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}