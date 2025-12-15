'use client';

import MemberItem from './MemberItem';
import { MemberProfile } from '@/@types/memberProfile';

export default function MembersList({
  members,
  currentUserRole,
  currentUserId
}: {
  members: MemberProfile[];
  currentUserRole: string;
  currentUserId: string;
}) {
  if (!members.length) {
    return <p className="text-muted-foreground">Nenhum membro encontrado.</p>;
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <MemberItem key={m.id} member={m} currentUserRole={currentUserRole} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
