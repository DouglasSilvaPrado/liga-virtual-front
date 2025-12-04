"use client";

import MemberItem from './MemberItem';
import { MemberProfile } from '@/@types/memberProfile';

export default function MembersList({
  members,
  currentUserRole,
}: {
  members: MemberProfile[];
  currentUserRole: string;
}) {
  if (!members.length) {
    return <p className="text-muted-foreground">Nenhum membro encontrado.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {members.map((m) => (
        <MemberItem
          key={m.id}
          member={m}
          currentUserRole={currentUserRole}
        />
      ))}
    </div>
  );
}
