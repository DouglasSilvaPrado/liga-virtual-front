'use client';

import { useState } from 'react';
import { Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function DeleteCompetitionButton({ competitionId }: { competitionId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);

    const { error } = await supabase.from('competitions').delete().eq('id', competitionId);

    setLoading(false);

    if (!error) {
      setOpen(false);
      router.refresh();
    } else {
      console.error(error);
      alert('Erro ao excluir competição.');
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="text-red-500 hover:bg-red-100 hover:text-red-600"
      >
        <Trash className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir competição</DialogTitle>
          </DialogHeader>

          <p>Tem certeza que deseja excluir esta competição? Esta ação é irreversível.</p>

          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>

            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
