'use client';

import { BracketMatch } from '@/@types/knockout';
import { Card, CardContent } from '@/components/ui/card';
import { MatchCard } from './MatchCard';

export function ConfrontoCard({
  matches,
}: {
  matches: BracketMatch[];
}) {
  const ida = matches.find(m => m.leg === 1);
  const volta = matches.find(m => m.leg === 2);

  const teamA = ida?.team_home ?? matches[0].team_home;
  const teamB = ida?.team_away ?? matches[0].team_away;

  function golsDoTime(
    match: BracketMatch | undefined,
    teamName: string
  ) {
    if (!match || match.score_home == null || match.score_away == null) return 0;

    return match.team_home.name === teamName
      ? match.score_home
      : match.score_away;
  }

  const golsA =
    golsDoTime(ida, teamA.name) +
    golsDoTime(volta, teamA.name);

  const golsB =
    golsDoTime(ida, teamB.name) +
    golsDoTime(volta, teamB.name);

  const finished = matches.every(m => m.status === 'finished');

  let winner: string | null = null;

  if (finished) {
    if (golsA > golsB) winner = teamA.name;
    else if (golsB > golsA) winner = teamB.name;
    else if (ida?.penalties_home != null && ida?.penalties_away != null) {
      winner =
        ida.penalties_home > ida.penalties_away
          ? ida.team_home.name
          : ida.team_away.name;
    }
  }

  return (
    <Card className="relative before:absolute before:-right[-32px] before:top-1/2 before:w-8 before:h-px before:bg-muted my-2">
      <CardContent className="p-4 space-y-3">
        <h4 className="font-semibold text-center">
          {teamA.name} x {teamB.name}
        </h4>

        {ida && <MatchCard match={ida} idaVolta />}
        {volta && <MatchCard match={volta} idaVolta />}

        {finished && (
          <div className="text-center text-sm font-medium">
            Agregado: {golsA} x {golsB}
          </div>
        )}

        {winner && (
          <div className="text-center text-green-600 font-semibold animate-pulse">
            Classificado: {winner}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
