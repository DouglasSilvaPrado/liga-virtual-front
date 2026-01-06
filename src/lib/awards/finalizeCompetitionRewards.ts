import { SupabaseClient } from '@supabase/supabase-js';
import type { CompetitionSettingsData } from '@/@types/competition';

type MatchSettings = CompetitionSettingsData['match_settings'];

type MatchRow = {
  team_home: string;
  team_away: string;
  score_home: number | null;
  score_away: number | null;
  status: string;
};

type TeamRow = {
  id: string;
  tenant_member_id: string | null;
};

type TenantMemberRow = {
  id: string;
  user_id: string;
  rank_points: number | null;
};

type WalletRow = {
  id: string;
  balance: number | null;
};

function safeNumber(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function calcResultReward(ms: MatchSettings, scoreA: number, scoreB: number) {
  if (scoreA > scoreB) return safeNumber(ms.premio_vitoria, 0);
  if (scoreB > scoreA) return safeNumber(ms.premio_derrota, 0);
  return safeNumber(ms.premio_empate, 0);
}

function calcResultPoints(ms: MatchSettings, scoreA: number, scoreB: number) {
  if (scoreA > scoreB) return safeNumber(ms.pontos_vitoria, 3);
  if (scoreB > scoreA) return safeNumber(ms.pontos_derrota, 0);
  return safeNumber(ms.pontos_empate, 1);
}

export async function finalizeCompetitionRewards({
  supabase,
  tenantId,
  competitionId,
  championTeamId,
  settings,
}: {
  supabase: SupabaseClient;
  tenantId: string;
  competitionId: string;
  championTeamId: string;
  settings: CompetitionSettingsData;
}) {
  const ms = settings.match_settings;

  // 1) pega competição (pra saber championship_id e nome)
  const { data: competition, error: compErr } = await supabase
    .from('competitions')
    .select('id, name, championship_id')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single<{ id: string; name: string; championship_id: string | null }>();

  if (compErr || !competition?.championship_id) {
    console.warn('finalizeCompetitionRewards: competition/championship_id inválido', compErr);
    return;
  }

  // 2) pega todos os jogos finalizados dessa competição
  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('team_home, team_away, score_home, score_away, status')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('status', 'finished')
    .returns<MatchRow[]>();

  if (matchErr || !matches?.length) {
    console.warn('finalizeCompetitionRewards: sem partidas finalizadas', matchErr);
    return;
  }

  // 3) pegar times participantes (para mapear team_id -> tenant_member_id)
  const { data: compTeams, error: compTeamsErr } = await supabase
    .from('competition_teams')
    .select('team_id')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId);

  if (compTeamsErr || !compTeams?.length) {
    console.warn('finalizeCompetitionRewards: sem competition_teams', compTeamsErr);
    return;
  }

  const teamIds = Array.from(new Set(compTeams.map((ct) => ct.team_id)));

  const { data: teams, error: teamErr } = await supabase
    .from('teams')
    .select('id, tenant_member_id')
    .eq('tenant_id', tenantId)
    .in('id', teamIds)
    .returns<TeamRow[]>();

  if (teamErr || !teams?.length) {
    console.warn('finalizeCompetitionRewards: erro ao buscar teams', teamErr);
    return;
  }

  const teamToMember = new Map<string, string>();
  for (const t of teams) {
    if (t.tenant_member_id) teamToMember.set(t.id, t.tenant_member_id);
  }

  // 4) calcular dinheiro/pontos por TEAM
  const teamMoney = new Map<string, number>();
  const teamRankPoints = new Map<string, number>();

  for (const m of matches) {
    if (m.score_home == null || m.score_away == null) continue;

    const home = m.team_home;
    const away = m.team_away;

    const homeGoals = m.score_home;
    const awayGoals = m.score_away;

    // 💰 dinheiro por resultado + gols
    const homeMoneyAdd =
      calcResultReward(ms, homeGoals, awayGoals) + safeNumber(ms.premio_gol, 0) * homeGoals;
    const awayMoneyAdd =
      calcResultReward(ms, awayGoals, homeGoals) + safeNumber(ms.premio_gol, 0) * awayGoals;

    teamMoney.set(home, (teamMoney.get(home) ?? 0) + homeMoneyAdd);
    teamMoney.set(away, (teamMoney.get(away) ?? 0) + awayMoneyAdd);

    // ⭐ pontos “rank” por resultado
    const homePtsAdd = calcResultPoints(ms, homeGoals, awayGoals);
    const awayPtsAdd = calcResultPoints(ms, awayGoals, homeGoals);

    teamRankPoints.set(home, (teamRankPoints.get(home) ?? 0) + homePtsAdd);
    teamRankPoints.set(away, (teamRankPoints.get(away) ?? 0) + awayPtsAdd);
  }

  // 5) agregar por tenant_member (porque wallet é por member)
  const memberMoney = new Map<string, number>();
  const memberRankPoints = new Map<string, number>();

  for (const [teamId, money] of teamMoney.entries()) {
    const memberId = teamToMember.get(teamId);
    if (!memberId) continue;
    memberMoney.set(memberId, (memberMoney.get(memberId) ?? 0) + money);
  }

  for (const [teamId, pts] of teamRankPoints.entries()) {
    const memberId = teamToMember.get(teamId);
    if (!memberId) continue;
    memberRankPoints.set(memberId, (memberRankPoints.get(memberId) ?? 0) + pts);
  }

  // 6) aplicar dinheiro na championship_wallet (incremental)
  for (const [tenantMemberId, moneyDelta] of memberMoney.entries()) {
    if (!moneyDelta) continue;

    const { data: wallet } = await supabase
      .from('championship_wallet')
      .select('id, balance')
      .eq('tenant_member_id', tenantMemberId)
      .eq('championship_id', competition.championship_id)
      .single<WalletRow>();

    if (!wallet) {
      await supabase.from('championship_wallet').insert({
        tenant_member_id: tenantMemberId,
        championship_id: competition.championship_id,
        balance: moneyDelta,
      });
    } else {
      const current = safeNumber(wallet.balance, 0);
      await supabase
        .from('championship_wallet')
        .update({ balance: current + moneyDelta, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);
    }
  }

  // 7) aplicar rank_points no tenant_members (incremental)
  for (const [tenantMemberId, ptsDelta] of memberRankPoints.entries()) {
    if (!ptsDelta) continue;

    const { data: member } = await supabase
      .from('tenant_members')
      .select('id, user_id, rank_points')
      .eq('id', tenantMemberId)
      .eq('tenant_id', tenantId)
      .single<TenantMemberRow>();

    if (!member) continue;

    const current = safeNumber(member.rank_points, 0);
    await supabase
      .from('tenant_members')
      .update({ rank_points: current + ptsDelta })
      .eq('id', tenantMemberId)
      .eq('tenant_id', tenantId);
  }

  // 8) criar troféu do campeão
  const championMemberId = teamToMember.get(championTeamId);
  if (championMemberId) {
    const { data: championMember } = await supabase
      .from('tenant_members')
      .select('id, user_id')
      .eq('id', championMemberId)
      .eq('tenant_id', tenantId)
      .single<{ id: string; user_id: string }>();

    if (championMember?.user_id) {
      await supabase.from('trophies').insert({
        name: `${competition.name} - Campeão`,
        trophy_url: null,
        money: 0,
        point_rank: 0,
        user_id: championMember.user_id,
        tenant_id: tenantId,
        competition_id: competitionId,
        type: 'posicao',
        position: 1,
        rule: null,
        rule_value: null,
      });
    }
  }
}
