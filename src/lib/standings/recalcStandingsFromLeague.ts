import type { SupabaseClient } from '@supabase/supabase-js';

type MatchPoints = { win: number; draw: number; loss: number };

type MatchRow = {
  team_home: string;
  team_away: string;
  score_home: number;
  score_away: number;
  status: string;
};

type StandingAgg = {
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_against: number;
};

function blank(): StandingAgg {
  return { points: 0, wins: 0, draws: 0, losses: 0, goals_scored: 0, goals_against: 0 };
}

export async function recalcStandingsFromLeague({
  supabase,
  competition_id,
  tenant_id,
  points,
}: {
  supabase: SupabaseClient;
  competition_id: string;
  tenant_id: string;
  points: MatchPoints;
}) {
  // 1) Times da competição
  const { data: cTeams, error: ctErr } = await supabase
    .from('competition_teams')
    .select('team_id')
    .eq('tenant_id', tenant_id)
    .eq('competition_id', competition_id);

  if (ctErr) throw new Error(ctErr.message);

  const teamIds = (cTeams ?? []).map((t) => t.team_id).filter(Boolean);

  // 2) Partidas finalizadas com placar
  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('team_home, team_away, score_home, score_away, status')
    .eq('tenant_id', tenant_id)
    .eq('competition_id', competition_id)
    .eq('status', 'finished')
    .not('score_home', 'is', null)
    .not('score_away', 'is', null)
    .neq('status', 'canceled');

  if (mErr) throw new Error(mErr.message);

  // 3) Agregação
  const agg = new Map<string, StandingAgg>();
  for (const id of teamIds) agg.set(id, blank());

  for (const m of (matches ?? []) as unknown as MatchRow[]) {
    if (!agg.has(m.team_home)) agg.set(m.team_home, blank());
    if (!agg.has(m.team_away)) agg.set(m.team_away, blank());

    const home = agg.get(m.team_home)!;
    const away = agg.get(m.team_away)!;

    home.goals_scored += m.score_home;
    home.goals_against += m.score_away;

    away.goals_scored += m.score_away;
    away.goals_against += m.score_home;

    if (m.score_home > m.score_away) {
      home.wins += 1;
      home.points += points.win;
      away.losses += 1;
      away.points += points.loss;
    } else if (m.score_home < m.score_away) {
      away.wins += 1;
      away.points += points.win;
      home.losses += 1;
      home.points += points.loss;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += points.draw;
      away.points += points.draw;
    }
  }

  const payload = Array.from(agg.entries()).map(([team_id, s]) => ({
    tenant_id,
    competition_id,
    group_id: null as string | null,
    team_id,
    points: s.points,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    goals_scored: s.goals_scored,
    goals_against: s.goals_against,
    goal_diff: s.goals_scored - s.goals_against,
  }));

  // ✅ 4) Zera standings "nogroup" e recria
  const { error: delErr } = await supabase
    .from('standings')
    .delete()
    .eq('tenant_id', tenant_id)
    .eq('competition_id', competition_id)
    .is('group_id', null);

  if (delErr) throw new Error(delErr.message);

  // Insere novamente (uma linha por time)
  if (payload.length > 0) {
    const { error: insErr } = await supabase.from('standings').insert(payload);
    if (insErr) throw new Error(insErr.message);
  }
}
