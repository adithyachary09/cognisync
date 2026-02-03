import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // ── 1. Auth Check (Aggressive Type-Casting) ──
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          // Explicitly type every parameter as 'any' to satisfy strict mode
          setAll(cookiesToSet: any[]) { 
            try {
              cookiesToSet.forEach(({ name, value, options }: any) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Admin Client ──
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
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

    // ── 3. Delete Files ──
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const filesToRemove = extensions.map(ext => `${user.id}/avatar.${ext}`);
    
    await supabaseAdmin.storage.from('avatars').remove(filesToRemove);

    // ── 4. Update DB ──
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (dbError) {
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[remove-avatar] Fatal:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}