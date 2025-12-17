export interface Match {
  id?: string;
  competition_id?: string;
  championship_id?: string;
  tenant_id?: string;
  team_home?: string;
  team_away?: string;
  score_home?: string;
  score_away?: string;
  status?: string;
  round?: number;
  leg?: number;
  group_id?: string;
  group_round?: number;
  created_at?: string;
  updated_at?: string;
}
