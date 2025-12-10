export type Trophy = {
  id?: string;
  name: string;
  money: number;
  created_at: string;
  point_rank: number;
  trophy_url: string;
  user_id?: string;
  tenant_id?: string;
  competition_id?: string;
  rule?: string;
  type?: (typeof TROPHY_TYPES)[number];
  rule_value?: string;
  position?: number;
};

export const TROPHY_TYPES = ['posicao', 'artilharia', 'assistencia', 'vitoria'] as const;
