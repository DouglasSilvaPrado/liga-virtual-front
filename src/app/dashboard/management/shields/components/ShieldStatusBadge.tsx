'use client';

import { Badge } from '@/components/ui/badge';

export default function ShieldStatusBadge({ status }: { status: string }) {
  const active = status?.toLowerCase() === 'active';

  return <Badge variant={active ? 'default' : 'destructive'}>{active ? 'Ativo' : 'Inativo'}</Badge>;
}
