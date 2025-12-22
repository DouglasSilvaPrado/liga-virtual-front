'use client';

import { useState } from 'react';
import { BracketMatch } from '@/@types/knockout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function MatchCard({
  match,
  idaVolta,
}: {
  match: BracketMatch;
  idaVolta: boolean;
}) {
  const [home, setHome] = useState(match.score_home ?? '');
  const [away, setAway] = useState(match.score_away ?? '');
  const [loading, setLoading] = useState(false);

  async function saveScore() {
    setLoading(true);

    const res = await fetch('/api/matches/update-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: match.id,
        score_home: Number(home),
        score_away: Number(away),
        competition_id: match.competition_id
      }),
    });

    setLoading(false);

    if (res.ok) {
      location.reload();
    } else {
      alert('Erro ao salvar placar');
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between text-sm items-center">
          <span>{match.team_home.name}</span>

          <div className="flex gap-1 items-center">
            <input
              className="w-10 border text-center"
              type="number"
              value={home}
              onChange={(e) => setHome(e.target.value)}
            />
            <span>x</span>
            <input
              className="w-10 border text-center"
              type="number"
              value={away}
              onChange={(e) => setAway(e.target.value)}
            />
          </div>

          <span>{match.team_away.name}</span>
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={saveScore}
          disabled={loading}
        >
          Salvar placar
        </Button>
      </CardContent>
    </Card>
  );
}
