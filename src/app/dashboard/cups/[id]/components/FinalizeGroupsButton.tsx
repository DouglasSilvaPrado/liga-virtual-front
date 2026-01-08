'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function FinalizeGroupsButton({ competitionId }: { competitionId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleFinalize() {
    const confirm = window.confirm(
      'Tem certeza que deseja finalizar a competição? Esta ação não pode ser desfeita.',
    );
    if (!confirm) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/competitions/${competitionId}/finalize-groups`, {
        method: 'POST',
      });

      const body = await res.json();

      if (!res.ok) {
        alert(body.error || 'Erro ao finalizar');
        return;
      }

      alert('Competição finalizada!');

      // ✅ volta pra página e re-renderiza Server Components (CupStatus / CupHeader etc)
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleFinalize} disabled={loading} size="sm">
      {loading ? 'Finalizando...' : 'Finalizar competição'}
    </Button>
  );
}
