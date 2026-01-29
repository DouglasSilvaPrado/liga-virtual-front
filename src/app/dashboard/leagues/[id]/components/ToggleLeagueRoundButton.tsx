'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ToggleLeagueRoundButton({
  competitionId,
  round,
  isOpen,
}: {
  competitionId: string;
  round: number;
  isOpen: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);

    await fetch('/api/league-rounds/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competition_id: competitionId, round, is_open: !isOpen }),
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      variant={isOpen ? 'secondary' : 'default'}
      size="sm"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? 'Salvando...' : isOpen ? 'Bloquear rodada' : 'Liberar rodada'}
    </Button>
  );
}
