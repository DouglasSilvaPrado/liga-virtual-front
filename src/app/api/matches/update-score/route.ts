import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { updateStandingsFromMatch } from '@/lib/standings/updateStandingsFromMatch';

export async function POST(req: Request) {
  const { match_id, score_home, score_away } = await req.json();

  if (!match_id || score_home === undefined || score_away === undefined) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { supabase, tenantId } = await createServerSupabase();

  const { data: match, error } = await supabase
    .from('matches')
    .update({
      score_home,
      score_away,
      updated_at: new Date().toISOString(),
    })
    .eq('id', match_id)
    .eq('tenant_id', tenantId)
    .select(
      `
    competition_id,
    tenant_id,
    team_home,
    team_away,
    score_home,
    score_away
  `,
    )
    .single();

  if (error || !match) {
    return NextResponse.json({ error: 'Erro ao salvar placar' }, { status: 500 });
  }

  await updateStandingsFromMatch({
    supabase,
    match,
  });

  return NextResponse.json({ success: true });
}
