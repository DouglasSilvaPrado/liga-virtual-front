'use client';

import { useRouter } from 'next/navigation';

interface ToggleRoundButtonProps {
  competitionId: string;
  groupId: string;
  round: number;
  isOpen: boolean;
}

export default function ToggleRoundButton({
  competitionId,
  groupId,
  round,
  isOpen,
}: ToggleRoundButtonProps) {
  const router = useRouter();

  async function toggle() {
    await fetch('/api/group-rounds/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        competition_id: competitionId,
        group_id: groupId,
        round,
        is_open: !isOpen,
      }),
    });

    router.refresh();
  }

  return (
    <button onClick={toggle} className="cursor-pointer text-xs text-blue-600 underline">
      {isOpen ? 'Fechar rodada' : 'Abrir rodada'}
    </button>
  );
}
