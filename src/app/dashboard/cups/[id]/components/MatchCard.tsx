'use client';

import { useState } from 'react';
import { BracketMatch } from '@/@types/knockout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function MatchCard({
  match,
  idaVolta,
  isPenalties = false,
}: {
  match: BracketMatch;
  idaVolta: boolean;
  isPenalties?: boolean;
}) {
  const [home, setHome] = useState(
    isPenalties ? match.penalties_home ?? '' : match.score_home ?? ''
  );
  const [away, setAway] = useState(
    isPenalties ? match.penalties_away ?? '' : match.score_away ?? ''
  );

  const [loading, setLoading] = useState(false);

  async function saveScore() {
    setLoading(true);

    const payload = isPenalties
      ? {
          match_id: match.id,
          penalties_home: Number(home),
          penalties_away: Number(away),
        }
      : {
          match_id: match.id,
          score_home: Number(home),
          score_away: Number(away),
          competition_id: match.competition_id,
        };

    const res = await fetch('/api/matches/update-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (res.ok) location.reload();
    else alert('Erro ao salvar');
  }

  const locked = isPenalties
  ? match.is_locked
  : match.is_locked || match.status === 'finished';


  return (
    <Card className={isPenalties ? 'border-dashed border-yellow-500' : ''}>
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between text-sm items-center">
          <span>{match.team_home.name}</span>

          <div className="flex gap-1 items-center">
            <input
              className="w-10 border text-center"
              type="number"
              value={home}
              onChange={e => setHome(e.target.value)}
            />
            <span>{isPenalties ? 'p' : 'x'}</span>
            <input
              className="w-10 border text-center"
              type="number"
              value={away}
              onChange={e => setAway(e.target.value)}
            />
          </div>

          <span>{match.team_away.name}</span>
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={saveScore}
          disabled={locked || loading}
        >
          {isPenalties ? 'Salvar pênaltis' : 'Salvar placar'}
        </Button>
      </CardContent>
    </Card>
  );
}
