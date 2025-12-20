import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { championship_id, name, type, rules, competition_url, settings } = body;

    if (!championship_id || !name || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { supabase, tenantId } = await createServerSupabase();

    // 1) Criar competition (RLS será aplicado; o user precisa ser owner/admin conforme policies)
    const { data: comp, error: compError } = await supabase
      .from('competitions')
      .insert({
        tenant_id: tenantId,
        championship_id,
        name,
        type,
        rules: rules || null,
        competition_url: competition_url || null,
      })
      .select()
      .single();

    if (compError) {
      console.error('COMP INSERT ERROR:', compError);
      return NextResponse.json({ error: compError.message }, { status: 400 });
    }

    const competition_id = comp.id;

    // 2) Criar competition_settings
    const { data: cs, error: csError } = await supabase
      .from('competition_settings')
      .insert({
        competition_id,
        tenant_id: tenantId,
        settings: settings || {},
      })
      .select()
      .single();

    if (csError) {
      // rollback manual: deletar competition criada
      await supabase.from('competitions').delete().eq('id', competition_id);
      console.error('COMP SETTINGS INSERT ERROR:', csError);
      return NextResponse.json({ error: csError.message }, { status: 400 });
    }

    return NextResponse.json({ competition: comp, competition_settings: cs }, { status: 200 });
  } catch (err: unknown) {
    console.error('SERVER ERROR:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
