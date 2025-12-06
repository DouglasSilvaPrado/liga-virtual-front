import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { championship_id, name, type, rules, competition_url } = body;

    if (!championship_id || !name || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { supabase, tenantId } = await createServerSupabase();

    const { data, error } = await supabase
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

    if (error) throw error;

    return NextResponse.json({ competition: data }, { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
