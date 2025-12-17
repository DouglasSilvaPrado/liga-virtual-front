export interface Standing {
  id: string;
  competition_id: string;
  team_id: string;
  tenant_id: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_against: number;
  goal_diff: number;
  group_id: string;
}
