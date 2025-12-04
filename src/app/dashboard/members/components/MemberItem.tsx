import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MemberProfile } from '@/@types/memberProfile';

export default function MemberItem({ member }: { member: MemberProfile }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-center space-x-4">
        
        <Avatar>
          <AvatarFallback>
            {member.email?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div>
          <p className="font-medium">{member.email}</p>
          <Badge>{member.role}</Badge>
        </div>

      </CardHeader>

      
    </Card>
  );
}
