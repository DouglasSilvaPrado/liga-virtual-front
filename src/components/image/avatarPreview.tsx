import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface AvatarPreviewProps {
  avatarPreview: string;
}

export const AvatarPreview = ({ avatarPreview }: AvatarPreviewProps) => {
  const avatarPreviewValid = avatarPreview?.length > 5 ? avatarPreview : null;
  return (
    <div className="flex flex-col items-center space-y-3">
      <Avatar className="h-24 w-24 border shadow">
        <AvatarImage src={avatarPreviewValid ?? ''} alt="Avatar Preview" />
        <AvatarFallback>NO IMG</AvatarFallback>
      </Avatar>
    </div>
  );
};
