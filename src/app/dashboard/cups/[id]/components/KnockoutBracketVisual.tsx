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

export function KnockoutBracketVisual({
  rounds,
}: KnockoutBracketVisualProps) {
  return (
    <div className="flex gap-32 items-stretch min-h-[700px]">
      {rounds.map((round) => (
        <div
          key={round.id}
          className="flex flex-col justify-evenly min-h-[700px]"
        >
          <h3 className="text-center font-semibold mb-8">
            {getRoundLabel(round.round_number)}
          </h3>

          {Object.values(
            round.matches.reduce((acc: Record<string, BracketMatchView[]>, match) => {
              const key = [match.team_home.id, match.team_away.id]
                .sort()
                .join('|');

              if (!acc[key]) acc[key] = [];
              acc[key].push(match);

              return acc;
            }, {})
          ).map((matches, idx) => (
            <ConfrontoCard key={idx} matches={matches} />
          ))}

        </div>
      ))}
    </div>
  );
}
