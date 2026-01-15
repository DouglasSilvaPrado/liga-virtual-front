'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function GenerateLeagueCalendarButton({
  competitionId,
  disabled,
}: {
  competitionId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (disabled) return;

    setLoading(true);

    const res = await fetch(`/api/competitions/${competitionId}/generate-league-calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body?.error ?? 'Erro ao gerar calendário');
      return;
    }

    router.refresh();
  }

  return (
    <Button size="sm" onClick={handleGenerate} disabled={disabled || loading}>
      {loading ? 'Gerando...' : 'Gerar calendário'}
    </Button>
  );
}
