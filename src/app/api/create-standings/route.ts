import { createServerSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { competition_id } = await req.json();

  if (!competition_id) {
    return NextResponse.json({ error: 'competition_id obrigatório' }, { status: 400 });
  }

  const { supabase, tenantId } = await createServerSupabase();

  /* ---------------------------------------------------------------- */
  /* 1️⃣ Busca times da competição                                     */
  /* ---------------------------------------------------------------- */
  const { data: teams } = await supabase
    .from('competition_teams')
    .select('team_id, group_id')
    .eq('competition_id', competition_id)
    .eq('tenant_id', tenantId);

  if (!teams || teams.length === 0) {
    return NextResponse.json({ error: 'Nenhum time encontrado' }, { status: 400 });
  }

  /* ---------------------------------------------------------------- */
  /* 2️⃣ Remove standings antigos (segurança)                          */
  /* ---------------------------------------------------------------- */
  await supabase
    .from('standings')
    .delete()
    .eq('competition_id', competition_id)
    .eq('tenant_id', tenantId);

  /* ---------------------------------------------------------------- */
  /* 3️⃣ Cria standings zerados                                        */
  /* ---------------------------------------------------------------- */
  const inserts = teams.map((t) => ({
    competition_id,
    team_id: t.team_id,
    group_id: t.group_id,
    tenant_id: tenantId,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals_scored: 0,
    goals_against: 0,
    goal_diff: 0,
  }));

  const { error } = await supabase.from('standings').insert(inserts);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
