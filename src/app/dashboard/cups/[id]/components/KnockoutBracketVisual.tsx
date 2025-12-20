'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BracketMatch } from '@/@types/knockout';

interface KnockoutBracketVisualProps {
  rounds: Record<number, BracketMatch[]>;
  idaVolta: boolean;
}

function getRoundLabel(round: number, totalRounds: number) {
  const fases = [
    'Final',
    'Semifinal',
    'Quartas de final',
    'Oitavas de final',
    '16-avos',
  ];

  const index = totalRounds - round;
  return fases[index] ?? `Fase ${round}`;
}



export function KnockoutBracketVisual({
  rounds,
  idaVolta,
}: KnockoutBracketVisualProps) {
  const sortedRounds = Object.entries(rounds).sort(
    ([a], [b]) => Number(b) - Number(a)
  );

  return (
    <div className="flex gap-8 overflow-x-auto pb-4">
      {sortedRounds.map(([round, matches], roundIndex) => (
        <div
          key={round}
          className="min-w-[280px] flex flex-col gap-4"
        >
          <h3 className="text-center font-medium">
            {getRoundLabel(Number(round), sortedRounds.length)}
            {idaVolta && <span className="text-xs"> (Ida e Volta)</span>}
          </h3>


          {matches.map((m) => {
            const finished = m.status === 'finished';

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`relative ${
                    finished
                      ? 'border-green-500'
                      : 'border-muted'
                  }`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={
                          finished
                            ? 'bg-green-600 text-white'
                            : ''
                        }
                      >
                        {finished ? 'Finalizado' : 'Agendado'}
                      </Badge>

                      {idaVolta && (
                        <span className="text-xs text-muted-foreground">
                          Jogo {m.leg}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>{m.team_home.name}</span>
                      <strong>
                        {m.score_home ?? '-'} x{' '}
                        {m.score_away ?? '-'}
                      </strong>
                      <span>{m.team_away.name}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
