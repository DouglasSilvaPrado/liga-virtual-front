import { createServerSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();

  const { competition_id, championship_id, teams } = body;

  if (!competition_id || !championship_id || !Array.isArray(teams)) {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
  }

  const { supabase, tenantId } = await createServerSupabase();

  // 🔒 Valida competição
  const { data: competition, error: compErr } = await supabase
    .from('competitions')
    .select('id')
    .eq('id', competition_id)
    .eq('tenant_id', tenantId)
    .single();

  if (compErr || !competition) {
    return NextResponse.json({ error: 'Competição inválida' }, { status: 403 });
  }

  // 🧩 Monta inserts
  const inserts = teams.map((t) => ({
    competition_id,
    championship_id,
    tenant_id: tenantId,
    team_id: t.team_id,
    group_name: t.group ?? null, // se quiser adicionar depois
  }));

  const { error } = await supabase.from('competition_teams').insert(inserts);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
