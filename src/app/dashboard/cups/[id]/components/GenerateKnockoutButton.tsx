'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function GenerateKnockoutButton({
  competitionId,
}: {
  competitionId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    const confirm = window.confirm(
      'Tem certeza que deseja gerar o mata-mata? Esta ação não pode ser desfeita.'
    );

    if (!confirm) return;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/competitions/${competitionId}/generate-knockout`,
        {
          method: 'POST',
        }
      );

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || 'Erro ao gerar mata-mata');
        return;
      }

      alert('Mata-mata gerado com sucesso!');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      variant="destructive"
      size="sm"
    >
      {loading ? 'Gerando...' : 'Gerar mata-mata'}
    </Button>
  );
}
