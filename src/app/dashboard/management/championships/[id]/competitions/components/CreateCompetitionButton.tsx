'use client';

import { useState } from 'react';
import CreateCompetitionModal from './CreateCompetitionModal';
import { Button } from '@/components/ui/button';

export default function CreateCompetitionButton({ championshipId }: { championshipId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Criar competição</Button>
      <CreateCompetitionModal open={open} onOpenChange={setOpen} championshipId={championshipId} />
    </>
  );
}
