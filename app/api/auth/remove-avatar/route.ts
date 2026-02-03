import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
  try {
    // ── 1. Read cookies ONCE at the top (FIX: Added await) ──
    const cookieStore = await cookies();

    // ── 2. Auth-check client ──
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Handle cookie errors if needed
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Handle cookie errors if needed
            }
          },
        },
      }
    );

    // ── 3. Verify the caller has a live session ──
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // ── 4. Service-role client for writes ──
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── 5. Delete every possible avatar file from Storage ──
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const filesToRemove = extensions.map(ext => `${user.id}/avatar.${ext}`);
    
    // We attempt to remove all; Supabase ignores files that don't exist
    await supabaseAdmin.storage
        .from('avatars')
        .remove(filesToRemove);

    // ── 6. Null out avatar_url in public.users ──
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (dbError) {
      console.error('[remove-avatar] DB update failed:', dbError);
      return NextResponse.json({ error: 'DB update failed: ' + dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[remove-avatar] Unhandled:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}