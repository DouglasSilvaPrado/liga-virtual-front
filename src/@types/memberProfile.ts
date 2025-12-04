export interface MemberProfile {
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
  email: string;
  full_name: string;
  avatar_url: string;
  platform: string;
  country: string;
  birth_date: string;
  whatsapp: string;
  state: string;
  city: string;
}
