'use client';
import { BracketMatch } from '@/@types/knockout';
import { MatchCard } from './MatchCard';

interface KnockoutBracketVisualProps {
  rounds: Record<number, BracketMatch[]>;
  idaVolta: boolean;
}

function getRoundLabel(round: number) {
  switch (round) {
    case 1:
      return 'Final';
    case 2:
      return 'Semifinal';
    case 3:
      return 'Quartas de final';
    case 4:
      return 'Oitavas de final';
    case 5:
      return '16-avos de final';
    default:
      return `Fase ${round}`;
  }
}

function splitMatches(matches: BracketMatch[]) {
  const half = Math.ceil(matches.length / 2);

  return {
    left: matches.slice(0, half),
    right: matches.slice(half),
  };
}


export function KnockoutBracketVisual({
  rounds,
  idaVolta,
}: KnockoutBracketVisualProps) {
  const sortedRounds = Object.entries(rounds).sort(
    ([a], [b]) => Number(b) - Number(a)
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-16 min-w-[900px]">
        {sortedRounds.map(([round, matches]) => {
          const { left, right } = splitMatches(matches);

          return (
            <div
              key={round}
              className="flex flex-col gap-6 min-w-[260px]"
            >
              <h3 className="text-center font-semibold">
                {getRoundLabel(Number(round))}
              </h3>

              <div className="flex justify-between gap-10">
                {/* LADO ESQUERDO */}
                <div className="flex flex-col gap-4 flex-1">
                  {left.map((m) => (
                    <MatchCard key={m.id} match={m} idaVolta={idaVolta} />
                  ))}
                </div>

                {/* LADO DIREITO */}
                <div className="flex flex-col gap-4 flex-1">
                  {right.map((m) => (
                    <MatchCard key={m.id} match={m} idaVolta={idaVolta} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

