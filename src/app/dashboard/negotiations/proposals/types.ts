export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'cancelled';

export type MoneyDirection = 'none' | 'pay' | 'ask';

export type TradeProposalRow = {
  id: string;
  tenant_id: string;
  championship_id: string;
  from_team_id: string;
  to_team_id: string;
  offered_player_id: number;
  requested_player_id: number;
  money_direction: MoneyDirection;
  money_amount: number;
  status: ProposalStatus;
  created_by_user_id: string;
  created_at: string;
};
