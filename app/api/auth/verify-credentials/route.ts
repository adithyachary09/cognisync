import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force this route to run in Node runtime (NOT edge) so server-only env vars load
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // ── Guard: confirm env vars are actually loaded ──
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      console.error('[verify-credentials] ENV MISSING — URL:', !!url, 'SERVICE_KEY:', !!serviceKey);
      return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 });
    }

    // ── Ephemeral service-role client — no session, no cookies, pure server ──
    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // signInWithPassword on this client does a credential check only.
    // It returns a session object but we never store or forward it.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
      // Log the actual Supabase error so you can see it in server logs
      console.error('[verify-credentials] Auth error:', error?.message || 'no user returned');
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    // Success — do NOT call signOut (it can interfere). The ephemeral client
    // has persistSession:false so the session is garbage-collected automatically.
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[verify-credentials] Unhandled:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}