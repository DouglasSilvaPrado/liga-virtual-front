import { SupabaseClient } from '@supabase/supabase-js';

export async function updateStandingsFromMatch({
  supabase,
  tenantId,
  match,
}: {
  supabase: SupabaseClient;
  tenantId: string;
  match: {
    competition_id: string;
    team_home: string;
    team_away: string;
    score_home: number;
    score_away: number;
  };
}) {
  const { competition_id, team_home, team_away, score_home, score_away } = match;

  const homeWin = score_home > score_away;
  const awayWin = score_away > score_home;
  const draw = score_home === score_away;

  async function apply(teamId: string, data: any) {
    await supabase
      .from('standings')
      .update(data)
      .eq('competition_id', competition_id)
      .eq('team_id', teamId)
      .eq('tenant_id', tenantId);
  }

  await apply(team_home, {
    goals_scored: score_home,
    goals_against: score_away,
    goal_diff: score_home - score_away,
    wins: homeWin ? 1 : 0,
    draws: draw ? 1 : 0,
    losses: awayWin ? 1 : 0,
    points: homeWin ? 3 : draw ? 1 : 0,
  });

  await apply(team_away, {
    goals_scored: score_away,
    goals_against: score_home,
    goal_diff: score_away - score_home,
    wins: awayWin ? 1 : 0,
    draws: draw ? 1 : 0,
    losses: homeWin ? 1 : 0,
    points: awayWin ? 3 : draw ? 1 : 0,
  });
}
