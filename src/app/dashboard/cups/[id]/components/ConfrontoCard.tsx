'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MatchCard } from './MatchCard';
import { motion } from 'framer-motion';
import { BracketMatchView } from '@/@types/knockout';

export function ConfrontoCard({ matches }: { matches: BracketMatchView[] }) {
  const ida = matches.find(m => m.leg === 1);
  const volta = matches.find(m => m.leg === 2);

  const teamA = ida?.team_home ?? matches[0].team_home;
  const teamB = ida?.team_away ?? matches[0].team_away;

  function gols(match: BracketMatchView | undefined, team: string) {
    if (!match) return 0;
    return match.team_home.name === team
      ? match.score_home ?? 0
      : match.score_away ?? 0;
  }

  const golsA = gols(ida, teamA.name) + gols(volta, teamA.name);
  const golsB = gols(ida, teamB.name) + gols(volta, teamB.name);

  const finished = matches.every(m => m.status === 'finished');
  const empate = finished && golsA === golsB;

  const penaltiesDefined =
    ida?.penalties_home != null && ida?.penalties_away != null;

  let winner: string | null = null;

  if (finished) {
    if (golsA > golsB) winner = teamA.name;
    else if (golsB > golsA) winner = teamB.name;
    else if (penaltiesDefined) {
      winner =
        ida!.penalties_home! > ida!.penalties_away!
          ? ida!.team_home.name
          : ida!.team_away.name;
    }
  }

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
            {/* FORMULÁRIO (quando ainda não foi salvo) */}
            {!penaltiesDefined && (
              <MatchCard match={ida} idaVolta isPenalties />
            )}

            {/* RESULTADO (quando já foi salvo) */}
            {penaltiesDefined && (
              <div className="text-center text-sm font-semibold text-yellow-600">
                Pênaltis: {ida.team_home.name}{' '}
                {ida.penalties_home} (p) {ida.penalties_away}{' '}
                {ida.team_away.name}
              </div>
            )}
          </>
        )}

        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-green-600 font-semibold"
          >
            Classificado: {winner}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
