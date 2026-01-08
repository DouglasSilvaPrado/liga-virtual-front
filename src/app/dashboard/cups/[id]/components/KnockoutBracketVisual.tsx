'use client';

import { BracketMatchView, KnockoutRoundView } from '@/@types/knockout';
import { ConfrontoCard } from './ConfrontoCard';

interface KnockoutBracketVisualProps {
  rounds: KnockoutRoundView[];
  idaVolta: boolean;
}

function getRoundLabel(round: number) {
  switch (round) {
    case 1:
      return 'Final';
    case 2:
      return 'Semifinal';
    case 3:
      return 'Quartas';
    case 4:
      return 'Oitavas';
    default:
      return `Fase ${round}`;
  }
}

export function KnockoutBracketVisual({ rounds }: KnockoutBracketVisualProps) {
  return (
    <div className="flex min-h-[700px] items-stretch gap-32">
      {rounds.map((round) => (
        <div key={round.id} className="flex min-h-[700px] flex-col justify-evenly">
          <h3 className="mb-8 text-center font-semibold">{getRoundLabel(round.round_number)}</h3>

          {Object.values(
            round.matches.reduce((acc: Record<string, BracketMatchView[]>, match) => {
              const key = [match.team_home.id, match.team_away.id].sort().join('|');
              if (!acc[key]) acc[key] = [];
              acc[key].push(match);
              return acc;
            }, {}),
          ).map((matches, idx) => (
            <ConfrontoCard key={idx} matches={matches} roundNumber={round.round_number} />
          ))}
        </div>
      ))}
    </div>
  );
}
