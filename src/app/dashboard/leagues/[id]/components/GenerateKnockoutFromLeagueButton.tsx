'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function GenerateKnockoutFromLeagueButton({
  competitionId,
  disabled,
}: {
  competitionId: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    if (disabled) return;

    const confirm = window.confirm(
      'Tem certeza que deseja gerar o mata-mata a partir da classificação da liga? Esta ação não pode ser desfeita.',
    );
    if (!confirm) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/competitions/${competitionId}/generate-knockout-from-league`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body?.error ?? 'Erro ao gerar mata-mata');
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={disabled || loading} variant="destructive" size="sm">
      {loading ? 'Gerando...' : 'Gerar mata-mata'}
    </Button>
  );
}
