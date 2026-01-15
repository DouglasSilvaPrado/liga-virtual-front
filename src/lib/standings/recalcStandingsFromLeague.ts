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
  // Times da competição (para garantir linha no standings mesmo com 0 jogos)
  const { data: cTeams, error: ctErr } = await supabase
    .from('competition_teams')
    .select('team_id')
    .eq('tenant_id', tenant_id)
    .eq('competition_id', competition_id);

  if (ctErr) throw new Error(ctErr.message);

  const teamIds = (cTeams ?? []).map((t) => t.team_id).filter(Boolean);

  // Partidas finalizadas com placar
  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('team_home, team_away, score_home, score_away, status')
    .eq('tenant_id', tenant_id)
    .eq('competition_id', competition_id)
    .eq('status', 'finished')
    .not('score_home', 'is', null)
    .not('score_away', 'is', null);

  if (mErr) throw new Error(mErr.message);

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

  // 1) Atualiza linhas existentes (group_id null)
  // Observação: a lib do supabase não faz bulk update com chaves diferentes facilmente,
  // então fazemos 2 passos: buscar existentes e depois separar inserts.
  const { data: existing, error: exErr } = await supabase
    .from('standings')
    .select('id, team_id')
    .eq('tenant_id', tenant_id)
    .eq('competition_id', competition_id)
    .is('group_id', null);

  if (exErr) throw new Error(exErr.message);

  const existingByTeam = new Map<string, string>();
  for (const row of (existing ?? []) as Array<{ id: string; team_id: string }>) {
    existingByTeam.set(row.team_id, row.id);
  }

  const toUpdate = payload.filter((p) => existingByTeam.has(p.team_id));
  const toInsert = payload.filter((p) => !existingByTeam.has(p.team_id));

  // 2) Updates (um a um, mas seguro e simples)
  for (const row of toUpdate) {
    const id = existingByTeam.get(row.team_id)!;

    const { error: uErr } = await supabase
      .from('standings')
      .update({
        points: row.points,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        goals_scored: row.goals_scored,
        goals_against: row.goals_against,
        goal_diff: row.goal_diff,
      })
      .eq('id', id)
      .eq('tenant_id', tenant_id);

    if (uErr) throw new Error(uErr.message);
  }

  // 3) Inserts (só os que não existem)
  if (toInsert.length > 0) {
    const { error: iErr } = await supabase.from('standings').insert(toInsert);
    if (iErr) throw new Error(iErr.message);
  }
}
