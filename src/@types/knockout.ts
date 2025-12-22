export type BracketMatchStatus = 'scheduled' | 'finished';

export interface BracketMatch {
  id: string;
  round: number;
  leg: number;

  score_home: number | null;
  score_away: number | null;

  penalties_home?: number | null;
  penalties_away?: number | null;

  status: BracketMatchStatus;

  team_home: {
    name: string;
  };

  team_away: {
    name: string;
  };

  competition_id: string;
  championship_id: string;

  is_locked?: boolean;
}
