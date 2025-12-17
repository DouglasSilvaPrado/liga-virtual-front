import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { updateStandingsFromMatch } from '@/lib/standings/updateStandingsFromMatch';

export async function POST(req: Request) {
  const { match_id, home_goals, away_goals } = await req.json();

  if (!match_id || home_goals === undefined || away_goals === undefined) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { supabase, tenantId } = await createServerSupabase();

  const { data: match, error } = await supabase
    .from('matches')
    .update({
      home_goals,
      away_goals,
      played_at: new Date().toISOString(),
    })
    .eq('id', match_id)
    .eq('tenant_id', tenantId)
    .select(
      `
      id,
      competition_id,
      tenant_id,
      home_team_id,
      away_team_id,
      home_goals,
      away_goals
    `,
    )
    .single();

  if (error || !match) {
    return NextResponse.json({ error: 'Erro ao salvar placar' }, { status: 500 });
  }

  // ✅ Agora bate perfeitamente com o contrato
  await updateStandingsFromMatch({
    supabase,
    match,
  });

  return NextResponse.json({ success: true });
}
