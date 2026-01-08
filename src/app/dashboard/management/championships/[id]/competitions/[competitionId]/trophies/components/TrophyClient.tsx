'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Trophy as TrophyIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import TrophyFormDialog from './TrophyFormDialog';
import { Trophy } from '@/@types/trophies';
import { AvatarPreview } from '@/components/image/avatarPreview';

export default function TrophyClient({
  trophies: initial,
  competitionId,
  tenantId,
}: {
  trophies: Trophy[];
  competitionId: string;
  tenantId: string;
}) {
  const [trophies, setTrophies] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editTrophy, setEditTrophy] = useState<Trophy | null>(null);

  const reload = async () => {
    const { data } = await supabase
      .from('trophies')
      .select('*')
      .eq('competition_id', competitionId);

    setTrophies(data || []);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('trophies').delete().eq('id', id);
    await reload();
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <TrophyIcon className="h-6 w-6 text-yellow-500" /> Troféus
        </h1>
        <Button
          onClick={() => {
            setEditTrophy(null);
            setOpen(true);
          }}
        >
          Novo Troféu
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trophies.map((trophy) => (
          <Card key={trophy.id}>
            <CardHeader>
              <AvatarPreview avatarPreview={trophy.trophy_url} />
              <div className="text-lg font-bold">{trophy.name}</div>
              <div className="text-sm text-gray-500">Regra: {trophy.type}</div>
            </CardHeader>
            <CardContent>
              <p>💰 Dinheiro: {trophy.money}</p>
              <p>⭐ Pontos de Rank: {trophy.point_rank}</p>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditTrophy(trophy);
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(trophy.id!)}>
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TrophyFormDialog
        open={open}
        onOpenChange={setOpen}
        competitionId={competitionId}
        tenant_id={tenantId}
        trophy={editTrophy}
        onSaved={reload}
      />
    </div>
  );
}
