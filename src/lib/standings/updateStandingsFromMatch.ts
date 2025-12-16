import { SupabaseClient } from '@supabase/supabase-js';

type MatchRow = {
  competition_id: string;
  tenant_id: string;
  home_team_id: string;
  away_team_id: string;
  home_goals: number;
  away_goals: number;
};

export async function updateStandingsFromMatch({
  supabase,
  match,
}: {
  supabase: SupabaseClient;
  match: MatchRow;
}) {
  const { competition_id, tenant_id, home_team_id, away_team_id, home_goals, away_goals } = match;

  const homeWin = home_goals > away_goals;
  const awayWin = away_goals > home_goals;
  const draw = home_goals === away_goals;

  async function apply(teamId: string, data: any) {
    await supabase
      .from('standings')
      .update(data)
      .eq('competition_id', competition_id)
      .eq('team_id', teamId)
      .eq('tenant_id', tenant_id);
  }

  // 🏠 TIME DA CASA
  await apply(home_team_id, {
    goals_scored: home_goals,
    goals_against: away_goals,
    goal_diff: home_goals - away_goals,
    wins: homeWin ? 1 : 0,
    draws: draw ? 1 : 0,
    losses: awayWin ? 1 : 0,
    points: homeWin ? 3 : draw ? 1 : 0,
  });

  // ✈️ TIME VISITANTE
  await apply(away_team_id, {
    goals_scored: away_goals,
    goals_against: home_goals,
    goal_diff: away_goals - home_goals,
    wins: awayWin ? 1 : 0,
    draws: draw ? 1 : 0,
    losses: homeWin ? 1 : 0,
    points: awayWin ? 3 : draw ? 1 : 0,
  });
}
