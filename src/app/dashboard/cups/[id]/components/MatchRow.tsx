'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MatchRow({ match }: any) {
  const [homeGoals, setHomeGoals] = useState(match.home_goals ?? '');
  const [awayGoals, setAwayGoals] = useState(match.away_goals ?? '');
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);

    await fetch('/api/matches/update-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: match.id,
        home_goals: Number(homeGoals),
        away_goals: Number(awayGoals),
      }),
    });

    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 text-right">{match.home_team.name}</span>

      <Input
        type="number"
        className="w-14 text-center"
        value={homeGoals}
        onChange={(e) => setHomeGoals(e.target.value)}
      />

      <span>x</span>

      <Input
        type="number"
        className="w-14 text-center"
        value={awayGoals}
        onChange={(e) => setAwayGoals(e.target.value)}
      />

      <span className="w-32">{match.away_team.name}</span>

      <Button size="sm" onClick={save} disabled={loading}>
        Salvar
      </Button>
    </div>
  );
}
