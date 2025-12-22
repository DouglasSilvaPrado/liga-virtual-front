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
    <div className="relative flex gap-24 min-w-[1200px]">
      {sortedRounds.map(([round, matches]) => {
        const confrontos = groupConfrontos(matches);
        const spacing = Math.pow(2, Number(round) - 1) * 40;

        return (
          <div
            key={round}
            className="flex flex-col items-center"
            style={{ gap: spacing }}
          >
            <h3 className="font-semibold mb-4">
              {getRoundLabel(Number(round))}
            </h3>

            {confrontos.map((c, idx) => (
              <ConfrontoCard
                key={idx}
                matches={c}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
