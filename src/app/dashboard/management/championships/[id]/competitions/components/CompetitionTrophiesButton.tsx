'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

export default function CompetitionTrophiesButton({ championshipId, competitionId }: { championshipId: string; competitionId: string }) {
  return (
    <Link href={`/dashboard/management/championships/${championshipId}/competitions/${competitionId}/trophies`}>
      <Button variant="ghost" size="icon" title="Troféus">
        <Trophy className="h-5 w-5 text-yellow-500" />
      </Button>
    </Link>
  );
}

