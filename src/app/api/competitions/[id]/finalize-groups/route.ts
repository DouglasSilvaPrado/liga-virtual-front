import { createServerSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { normalizeCompetitionSettings } from '@/lib/competitionSettings';
import type { CompetitionSettingsData } from '@/@types/competition';
import { finalizeCompetitionRewards } from '@/lib/awards/finalizeCompetitionRewards';

type StandingRow = {
  team_id: string;
  group_id: string;
  points: number;
  goal_diff: number;
  goals_scored: number;
};

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = await context.params;
  const { supabase, tenantId } = await createServerSupabase();

  // AUTH
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // ROLE
  const { data: member } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  if (!member || !['admin', 'owner'].includes(member.role)) {
    return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
  }

  // COMP TYPE
  const { data: comp } = await supabase
    .from('competitions')
    .select('type, status')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single<{ type: string; status: string }>();

  if (!comp) return NextResponse.json({ error: 'Competição inválida' }, { status: 400 });

  if (comp.status === 'finished') {
    return NextResponse.json({ error: 'Competição já finalizada' }, { status: 409 });
  }

  if (comp.type !== 'copa_grupo') {
    return NextResponse.json(
      { error: 'Este endpoint é apenas para competições do tipo copa_grupo' },
      { status: 400 },
    );
  }

  // NÃO pode haver jogos de grupo em aberto
  const { count: openGroupMatches } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .not('group_round_id', 'is', null)
    .neq('status', 'finished');

  if ((openGroupMatches ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Ainda existem jogos da fase de grupos em aberto' },
      { status: 400 },
    );
  }

  // SETTINGS (para premiação)
  const { data: compSettingsRow } = await supabase
    .from('competitions_with_settings')
    .select('settings')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single<{ settings: unknown }>();

  const settings = normalizeCompetitionSettings(
    compSettingsRow?.settings,
  ) as CompetitionSettingsData | null;

  if (!settings) {
    return NextResponse.json({ error: 'Configurações não encontradas' }, { status: 400 });
  }

  // STANDINGS (ordenado por desempate)
  const { data: standings } = await supabase
    .from('standings')
    .select('team_id, group_id, points, goal_diff, goals_scored')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('points', { ascending: false })
    .order('goal_diff', { ascending: false })
    .order('goals_scored', { ascending: false })
    .returns<StandingRow[]>();

  if (!standings?.length) {
    return NextResponse.json({ error: 'Classificação vazia' }, { status: 400 });
  }

  // LÍDER DE CADA GRUPO
  const leaderByGroup = new Map<string, StandingRow>();
  for (const s of standings) {
    if (!leaderByGroup.has(s.group_id)) leaderByGroup.set(s.group_id, s);
  }

  const leaders = Array.from(leaderByGroup.values());
  if (!leaders.length) {
    return NextResponse.json({ error: 'Não foi possível definir campeão' }, { status: 500 });
  }

  // CAMPEÃO = melhor líder geral
  leaders.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
    return b.goals_scored - a.goals_scored;
  });

  const championTeamId = leaders[0].team_id;

  // FINALIZA COMPETIÇÃO
  await supabase
    .from('competitions')
    .update({
      status: 'finished',
      champion_team_id: championTeamId,
    })
    .eq('id', competitionId)
    .eq('tenant_id', tenantId);

  // ✅ PREMIAÇÃO/PONTOS/TROFÉU (mesma do mata-mata)
  await finalizeCompetitionRewards({
    supabase,
    tenantId,
    competitionId,
    championTeamId,
    settings,
  });

  return NextResponse.json({ success: true, champion_team_id: championTeamId });
}
