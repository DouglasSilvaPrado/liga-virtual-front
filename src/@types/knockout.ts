export type MatchStatus = 'scheduled' | 'finished';

export type BracketMatch = {
  id: string;
  round: number;
  leg: number;
  score_home: number | null;
  score_away: number | null;
  status: 'scheduled' | 'finished';
  team_home: { name: string }; // um objeto, não array
  team_away: { name: string }; // um objeto, não array
};
