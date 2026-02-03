import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // ── 1. Auth Check: Read User Session ──
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // API routes don't need to set cookies for simple verification
          },
          remove(name: string, options: CookieOptions) {
            // API routes don't need to remove cookies for simple verification
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error("Auth Error:", authError);
      return NextResponse.json({ error: 'Unauthorized — valid session required.' }, { status: 401 });
    }

    // ── 2. Parse Incoming Data ──
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const avatarFile = formData.get('avatarFile') as File | null;

    // ── 3. Initialize ADMIN Client (God Mode) ──
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server misconfiguration: Service Role Key missing.' }, { status: 500 });
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

    let finalAvatarUrl: string | null = null;

    // ── 4. Upload Avatar (Bypassing RLS) ──
    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
      // Use standard path
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Convert file to ArrayBuffer for reliable upload
      const arrayBuffer = await avatarFile.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, fileBuffer, {
          cacheControl: '0',
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        return NextResponse.json({ error: `Avatar upload failed: ${uploadError.message}` }, { status: 500 });
      }

      // Get Public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(filePath);

      finalAvatarUrl = `${publicUrl}?t=${Date.now()}`;
    }

    // ── 5. Update Database (Bypassing RLS) ──
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
      console.error('DB Error:', dbError);
      return NextResponse.json({ error: `DB write failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avatar_url: finalAvatarUrl,
      name: updatePayload.name || null,
    });

  } catch (error: any) {
    console.error('Update Profile Fatal Error:', error);
    return NextResponse.json({ error: 'Server processing error.' }, { status: 500 });
  }
}