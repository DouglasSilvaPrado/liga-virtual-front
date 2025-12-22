'use client';

import { BracketMatch } from '@/@types/knockout';
import { ConfrontoCard } from './ConfrontoCard';

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
    default:
      return `Fase ${round}`;
  }
}

function groupConfrontos(matches: BracketMatch[]) {
  const map = new Map<string, BracketMatch[]>();

  for (const m of matches) {
    const key =
      m.team_home.name < m.team_away.name
        ? `${m.team_home.name}-${m.team_away.name}`
        : `${m.team_away.name}-${m.team_home.name}`;

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }

  return Array.from(map.values());
}

export function KnockoutBracketVisual({
  rounds,
}: KnockoutBracketVisualProps) {
  const sortedRounds = Object.entries(rounds).sort(
    ([a], [b]) => Number(b) - Number(a)
  );

  return (
    <div className="relative flex gap-32 min-h-[600px]">
      {sortedRounds.map(([round, matches]) => {
        const confrontos = groupConfrontos(matches);

        return (
          <div
            key={round}
            className="flex flex-col justify-around min-h-[600px]"
          >
            <h3 className="text-center font-semibold mb-6">
              {getRoundLabel(Number(round))}
            </h3>

            {confrontos.map((c, idx) => (
              <ConfrontoCard key={idx} matches={c} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
