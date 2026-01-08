'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MemberProfile } from '@/@types/memberProfile';
import { Pencil } from 'lucide-react';
import EditMemberModal from './EditMemberModal';

export default function MemberItem({
  member,
  currentUserRole,
  currentUserId,
}: {
  member: MemberProfile;
  currentUserRole: string;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);

  const IsOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <>
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Esquerda */}
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback>{member.email?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate font-medium">{member.full_name || member.email}</p>
              <p className="text-muted-foreground truncate text-sm">{member.email}</p>

              <Badge variant="secondary" className="mt-1">
                {member.role}
              </Badge>
            </div>
          </div>

          {/* Ações */}
          {(member.user_id === currentUserId || IsOwnerOrAdmin) && (
            <Pencil
              className="text-muted-foreground hover:text-primary h-5 w-5 cursor-pointer self-end sm:self-auto"
              onClick={() => setOpen(true)}
            />
          )}
        </CardHeader>
      </Card>

      {/* Modal */}
      <EditMemberModal
        member={member}
        open={open}
        onOpenChange={setOpen}
        IsOwnerOrAdmin={IsOwnerOrAdmin}
      />
    </>
  );
}
