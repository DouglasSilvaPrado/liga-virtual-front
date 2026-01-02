export type BracketMatchStatus = 'scheduled' | 'finished';

export interface BracketTeamView {
  id: string;
  name: string;
}

export interface BracketMatchView {
  id: string;
  competition_id: string;
  leg: number;

  score_home: number | null;
  score_away: number | null;

  penalties_home?: number | null;
  penalties_away?: number | null;

  status: 'scheduled' | 'finished';
  is_locked?: boolean;

  team_home: BracketTeamView;
  team_away: BracketTeamView;
}

export interface KnockoutRoundView {
  id: string;
  round_number: number;
  matches: BracketMatchView[];
}
