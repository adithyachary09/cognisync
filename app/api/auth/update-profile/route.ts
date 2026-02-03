import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // ── 1. Auth Check (Modern Adapter Pattern) ──
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored: likely called from a server component context
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error("[update-profile] Auth Failed:", authError?.message || "No user found");
      return NextResponse.json({ error: 'Unauthorized — valid session required.' }, { status: 401 });
    }

    console.log("[update-profile] User verified:", user.id);

    // ── 2. Initialize Admin Client (God Mode) ──
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server Config Error: Service Key missing' }, { status: 500 });
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

    // ── 3. Parse Data ──
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const avatarFile = formData.get('avatarFile') as File | null;

    let finalAvatarUrl: string | null = null;

    // ── 4. Upload Logic ──
    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Convert to ArrayBuffer for Node.js
      const arrayBuffer = await avatarFile.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Upload (Overwrite enabled)
      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, fileBuffer, {
          cacheControl: '0',
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        console.error('[update-profile] Upload Error:', uploadError);
        return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 });
      }

      // Get URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(filePath);

      finalAvatarUrl = `${publicUrl}?t=${Date.now()}`;
    }

    // ── 5. DB Update ──
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (name) updatePayload.name = name.trim();
    if (finalAvatarUrl) updatePayload.avatar_url = finalAvatarUrl;

    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert(
        { id: user.id, email: user.email, ...updatePayload },
        { onConflict: 'id', ignoreDuplicates: false }
      );

    if (dbError) {
      console.error('[update-profile] DB Error:', dbError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avatar_url: finalAvatarUrl,
      name: updatePayload.name || null,
    });

  } catch (error: any) {
    console.error('[update-profile] Fatal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}