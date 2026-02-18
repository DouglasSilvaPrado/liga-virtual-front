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

type ShieldsListResponse = { data: Shield[] };

export default function CreateTeamModal({ tenantId, tenantMemberId, championshipId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [shieldId, setShieldId] = useState<string | null>(null);
  const [name, setName] = useState('');

  const [page, setPage] = useState(1);
  const [shields, setShields] = useState<Shield[]>([]);
  const [loadingShields, setLoadingShields] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const router = useRouter();

  async function fetchPage(p: number) {
    const res = await fetch(
      `/api/shields/list?tenant_id=${tenantId}&tenant_member_id=${tenantMemberId}&page=${p}`,
    );
    const json = (await res.json()) as ShieldsListResponse;
    return json.data ?? [];
  }

  // Carrega a 1ª página quando abrir
  useEffect(() => {
    if (!open) return;

    let ignore = false;

    async function run() {
      setLoadingShields(true);
      try {
        const data = await fetchPage(1);
        if (!ignore) {
          setPage(1);
          setShields(Array.from(new Map(data.map((s) => [s.id, s])).values()));
          setHasMore(data.length === 20);
        }
      } finally {
        if (!ignore) setLoadingShields(false);
      }
    }

    // só recarrega se estiver vazio (evita refetch ao reabrir)
    if (shields.length === 0) run();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Carrega próxima página quando page aumenta
  useEffect(() => {
    if (!open) return;
    if (page <= 1) return;
    if (!hasMore) return;

    let ignore = false;

    async function run() {
      setLoadingShields(true);
      try {
        const data = await fetchPage(page);
        if (!ignore) {
          setShields((prev) => {
            const merged = [...prev, ...data];
            return Array.from(new Map(merged.map((s) => [s.id, s])).values());
          });
          setHasMore(data.length === 20);
        }
      } finally {
        if (!ignore) setLoadingShields(false);
      }
    }

    run();

    return () => {
      ignore = true;
    };
  }, [open, page, hasMore, tenantId, tenantMemberId]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    const bottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 50;

    if (bottom && !loadingShields && hasMore) {
      setPage((p) => p + 1);
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
