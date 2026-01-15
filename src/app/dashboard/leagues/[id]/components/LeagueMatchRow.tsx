'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

type Props = {
  match: {
    id: string;
    score_home: number | null;
    score_away: number | null;
    status: 'scheduled' | 'in_progress' | 'finished' | 'canceled';
    round_info: { is_open: boolean };
    home_team: { id: string; name: string };
    away_team: { id: string; name: string };
  };
  viewer: {
    isAdminOrOwner: boolean;
    memberTeamId: string | null;
  };
};

export default function LeagueMatchRow({ match, viewer }: Props) {
  const router = useRouter();

  const [homeGoals, setHomeGoals] = useState<string | number>(match.score_home ?? '');
  const [awayGoals, setAwayGoals] = useState<string | number>(match.score_away ?? '');
  const [loading, setLoading] = useState(false);

  const isMyMatch =
    !!viewer.memberTeamId &&
    (match.home_team.id === viewer.memberTeamId || match.away_team.id === viewer.memberTeamId);

  const canEdit =
    match.round_info.is_open &&
    match.status !== 'finished' &&
    (viewer.isAdminOrOwner || isMyMatch);

  async function save() {
    if (!canEdit) return;

    setLoading(true);

    await fetch('/api/matches/update-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: match.id,
        score_home: Number(homeGoals),
        score_away: Number(awayGoals),
      }),
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 text-right">{match.home_team.name}</span>

      <Input
        type="number"
        className="w-14 text-center"
        value={homeGoals}
        disabled={!canEdit}
        onChange={(e) => setHomeGoals(e.target.value)}
      />

      <span>x</span>

      <Input
        type="number"
        className="w-14 text-center"
        value={awayGoals}
        disabled={!canEdit}
        onChange={(e) => setAwayGoals(e.target.value)}
      />

      <span className="w-32">{match.away_team.name}</span>

      <Button size="sm" onClick={save} disabled={!canEdit || loading}>
        {match.status === 'finished'
          ? 'Finalizado'
          : !match.round_info.is_open
            ? 'Rodada bloqueada'
            : !viewer.isAdminOrOwner && !isMyMatch
              ? 'Sem permissão'
              : loading
                ? 'Salvando...'
                : 'Salvar'}
      </Button>
    </div>
  );
}
