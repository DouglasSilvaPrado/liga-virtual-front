export type MatchStatus = 'scheduled' | 'finished';

export type BracketMatch = {
  id: string;
  round: number;
  leg: number;
  score_home: number | null;
  score_away: number | null;
  status: 'scheduled' | 'finished';
  team_home: { name: string };
  team_away: { name: string };
  competition_id: string;
  championship_id: string;
  penalties_home?: number;
  penalties_away?: number;
  is_locked?: boolean;
};
