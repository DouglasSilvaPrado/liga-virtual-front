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
  currentUserId
}: {
  member: MemberProfile;
  currentUserRole: string;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);

  const isOwner = currentUserRole === 'owner';
  const canEdit =
    currentUserRole === 'owner' ||
    currentUserRole === 'admin' ||
    member.user_id === currentUserId;


  return (
    <>
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-row items-center space-x-4">
            <Avatar>
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback>{member.email?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div>
              <p className="font-medium">
                {member.email} | {member.full_name}
              </p>
              <Badge>{member.role}</Badge>
            </div>
          </div>

          {canEdit && (
            <Pencil
              className="text-muted-foreground hover:text-primary h-5 w-5 cursor-pointer"
              onClick={() => setOpen(true)}
            />
          )}

        </CardHeader>
      </Card>

      {/* Modal */}
      <EditMemberModal member={member} open={open} onOpenChange={setOpen} isOwner={isOwner} />
    </>
  );
}
