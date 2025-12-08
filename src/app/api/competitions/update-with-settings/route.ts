import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, competition_settings_id, name, rules, competition_url, settings } = body;

    if (!id || !competition_settings_id) {
      return NextResponse.json({ error: 'Missing competition or settings ID.' }, { status: 400 });
    }

    const { supabase, tenantId } = await createServerSupabase();

    // Update competitions (basic data)
    const { error: compErr } = await supabase
      .from('competitions')
      .update({
        name,
        rules,
        competition_url,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (compErr) {
      return NextResponse.json({ error: compErr.message }, { status: 500 });
    }

    // Update competition_settings (json)
    const { error: setErr } = await supabase
      .from('competition_settings')
      .update({
        settings,
      })
      .eq('id', competition_settings_id);

    if (setErr) {
      return NextResponse.json({ error: setErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Unexpected error: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
