import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
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
              // Ignore
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Ignore
            }
          },
        },
      }
    );

    // ── 3. Verify Session ──
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized — no valid session.' }, { status: 401 });
    }

    // ── 4. Parse Data ──
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const avatarFile = formData.get('avatarFile') as File | null;

    // ── 5. Service-role client for writes ──
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let finalAvatarUrl: string | null = null;

    // ── 6. Upload avatar to Storage if a file was sent ──
    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
      // Use a fixed path so we don't accumulate junk files
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload with Upsert (Overwrite)
      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, avatarFile, { 
            cacheControl: '0', 
            upsert: true,
            contentType: avatarFile.type 
        });

      if (uploadError) {
        console.error('[update-profile] Storage upload failed:', uploadError);
        return NextResponse.json({ error: 'Avatar upload failed: ' + uploadError.message }, { status: 500 });
      }

      // Generate Public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!publicUrl) {
        return NextResponse.json({ error: 'Could not generate public URL.' }, { status: 500 });
      }

      // Add cache buster
      finalAvatarUrl = `${publicUrl}?t=${Date.now()}`;
    }

    // ── 7. Build the update payload ──
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== null && name.trim() !== '') {
      updatePayload.name = name.trim();
    }
    if (finalAvatarUrl !== null) {
      updatePayload.avatar_url = finalAvatarUrl;
    }

    // ── 8. Upsert into public.users ──
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert(
        { id: user.id, email: user.email, ...updatePayload },
        { onConflict: 'id', ignoreDuplicates: false }
      );

    if (dbError) {
      console.error('[update-profile] DB upsert failed:', dbError);
      return NextResponse.json({ error: 'DB write failed: ' + dbError.message }, { status: 500 });
    }

    // ── 9. Success Response ──
    return NextResponse.json({
      success: true,
      avatar_url: finalAvatarUrl,
      name: updatePayload.name || null,
    });

  } catch (error: any) {
    console.error('[update-profile] Unhandled:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}