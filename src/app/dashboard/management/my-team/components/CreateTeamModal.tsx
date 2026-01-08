'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Shield } from '@/@types/shield';

interface Props {
  tenantId: string;
  tenantMemberId: string;
  championshipId: string;
}

export default function CreateTeamModal({ tenantId, tenantMemberId, championshipId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shieldId, setShieldId] = useState<string | undefined>();
  const [name, setName] = useState('');

  const [page, setPage] = useState(1);
  const [shields, setShields] = useState<Shield[]>([]);
  const [loadingShields, setLoadingShields] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const router = useRouter();

  // Load paginated shields
  async function loadShields() {
    if (!hasMore) return;
    setLoadingShields(true);

    const res = await fetch(`/api/shields/list?tenant_id=${tenantId}&page=${page}`);
    const json: { data: Shield[] } = await res.json();

    if (json.data.length < 20) setHasMore(false);

    setShields((prev) => {
      const merged = [...prev, ...json.data];
      const unique = Array.from(new Map(merged.map((s) => [s.id, s])).values());
      return unique;
    });

    setLoadingShields(false);
  }

  useEffect(() => {
    if (!open || shields.length > 0) return;

    let ignore = false;

    async function fetchShields() {
      setLoadingShields(true);

      const res = await fetch(
        `/api/shields/list?tenant_id=${tenantId}&tenant_member_id=${tenantMemberId}&page=${page}`,
      );
      const json: { data: Shield[] } = await res.json();

      if (!ignore) {
        setShields(Array.from(new Map(json.data.map((s) => [s.id, s])).values()));
        setHasMore(json.data.length === 20);
      }

      setLoadingShields(false);
    }

    fetchShields();

    return () => {
      ignore = true;
    };
  }, [open, page]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const target = e.currentTarget;

    const bottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 50;

    if (bottom && !loadingShields) {
      setPage((p) => p + 1);
      setTimeout(() => loadShields(), 200);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!shieldId) {
      alert('Selecione um escudo!');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/teams/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        tenant_member_id: tenantMemberId,
        championship_id: championshipId,
        shield_id: shieldId,
        name,
      }),
    });

    setLoading(false);

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      alert('Erro ao criar time');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Criar meu time</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Time</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do Time</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <Label>Escudo</Label>

            <div onScroll={handleScroll} className="max-h-60 overflow-y-auto rounded-md border p-2">
              {shields.map((s) => (
                <div
                  key={s.id}
                  className={`hover:bg-muted cursor-pointer rounded p-2 ${
                    shieldId === s.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setShieldId(s.id)}
                >
                  {s.name}
                </div>
              ))}

              {loadingShields && (
                <p className="text-muted-foreground py-2 text-center text-sm">Carregando...</p>
              )}
            </div>
          </div>

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Time'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
