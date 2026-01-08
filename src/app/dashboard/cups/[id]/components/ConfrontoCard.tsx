'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MatchCard } from './MatchCard';
import { motion } from 'framer-motion';
import { BracketMatchView } from '@/@types/knockout';

export function ConfrontoCard({
  matches,
  roundNumber,
}: {
  matches: BracketMatchView[];
  roundNumber: number;
}) {
  const ida = matches.find((m) => m.leg === 1);
  const volta = matches.find((m) => m.leg === 2);

  const teamA = ida?.team_home ?? matches[0].team_home;
  const teamB = ida?.team_away ?? matches[0].team_away;

  function gols(match: BracketMatchView | undefined, teamName: string) {
    if (!match) return 0;
    return match.team_home.name === teamName ? (match.score_home ?? 0) : (match.score_away ?? 0);
  }

  const golsA = gols(ida, teamA.name) + gols(volta, teamA.name);
  const golsB = gols(ida, teamB.name) + gols(volta, teamB.name);

  const finished = matches.every((m) => m.status === 'finished');
  const empate = finished && golsA === golsB;

  // ⚠️ pênaltis geralmente ficam no jogo (idealmente leg 2), mas seu fluxo usa ida
  const penaltiesDefined = ida?.penalties_home != null && ida?.penalties_away != null;

  let winner: string | null = null;

  if (finished) {
    if (golsA > golsB) winner = teamA.name;
    else if (golsB > golsA) winner = teamB.name;
    else if (penaltiesDefined) {
      winner =
        ida!.penalties_home! > ida!.penalties_away! ? ida!.team_home.name : ida!.team_away.name;
    }
  }

  const winnerLabel = roundNumber === 1 ? 'Campeão' : 'Classificado';

  return (
    <Card className="relative my-6">
      <CardContent className="space-y-3 p-4">
        <h4 className="text-center font-semibold">
          {teamA.name} x {teamB.name}
        </h4>

        {ida && <MatchCard match={ida} idaVolta />}
        {volta && <MatchCard match={volta} idaVolta />}

        {finished && (
          <div className="text-center text-sm font-medium">
            Agregado: {golsA} x {golsB}
          </div>
        )}

        {empate && ida && (
          <>
            {!penaltiesDefined && <MatchCard match={ida} idaVolta isPenalties />}
            {penaltiesDefined && (
              <div className="text-center text-sm font-semibold text-yellow-600">
                Pênaltis: {ida.team_home.name} {ida.penalties_home} (p) {ida.penalties_away}{' '}
                {ida.team_away.name}
              </div>
            )}
          </>
        )}

        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center font-semibold text-green-600"
          >
            {winnerLabel}: {winner}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
