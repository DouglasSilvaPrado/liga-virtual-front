'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield } from '@/@types/shield';

export default function DeleteShieldModal({ shield }: { shield: Shield }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);

    const res = await fetch('/api/shields/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: shield.id }),
    });

    setLoading(false);

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Excluir
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Escudo</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o escudo <strong>{shield.name}</strong>? Esta ação não
            pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>

          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
