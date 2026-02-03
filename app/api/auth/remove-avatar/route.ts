import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // ── 1. Auth Check ──
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {},
          remove(name: string, options: CookieOptions) {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // ── 2. Initialize Admin Client ──
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service Role Key missing.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ── 3. Clean Storage ──
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const filesToRemove = extensions.map(ext => `${user.id}/avatar.${ext}`);
    
    await supabaseAdmin.storage
      .from('avatars')
      .remove(filesToRemove);

    // ── 4. Update Database ──
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (dbError) {
      return NextResponse.json({ error: `DB update failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Remove Avatar Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}