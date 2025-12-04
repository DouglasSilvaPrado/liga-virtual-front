export interface Member {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  created_at: string;
  level: string;
  division: string;
  subscription_status: string;
  active: boolean;
  sponsor: string;
  forbid_trade: boolean;
  forbid_being_stolen: boolean;
  forbid_stealing: boolean;
  rank_points: number;
}
