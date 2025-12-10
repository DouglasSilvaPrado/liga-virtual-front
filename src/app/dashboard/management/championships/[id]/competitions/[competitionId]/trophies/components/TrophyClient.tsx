"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trophy as TrophyIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import TrophyFormDialog from "./TrophyFormDialog";
import { Trophy } from "@/@types/trophies";
import { AvatarPreview } from '@/components/image/avatarPreview';

export default function TrophyClient({
  trophies: initial,
  competitionId,
  tenantId
}: {
  trophies: Trophy[];
  competitionId: string;
  tenantId: string;
}) {

  const [trophies, setTrophies] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editTrophy, setEditTrophy] = useState<Trophy | null>(null);
  console.log("🚀 ~ TrophyClient ~ editTrophy:", editTrophy)

  const reload = async () => {
    const { data } = await supabase
      .from("trophies")
      .select("*")
      .eq("competition_id", competitionId);

    setTrophies(data || []);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("trophies").delete().eq("id", id);
    await reload();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TrophyIcon className="h-6 w-6 text-yellow-500" /> Troféus
        </h1>
        <Button onClick={() => { setEditTrophy(null); setOpen(true); }}>
          Novo Troféu
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trophies.map((trophy) => (
          <Card key={trophy.id}>
            <CardHeader>
              <AvatarPreview avatarPreview={trophy.trophy_url} />
              <div className="font-bold text-lg">{trophy.name}</div>
              <div className="text-sm text-gray-500">Regra: {trophy.type}</div>
            </CardHeader>
            <CardContent>
              <p>💰 Dinheiro: {trophy.money}</p>
              <p>⭐ Pontos de Rank: {trophy.point_rank}</p>

              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => { setEditTrophy(trophy); setOpen(true); }}>
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
