"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trophy as TrophyIcon } from "lucide-react";
import { Trophy } from '@/@types/trophies';

export default function TrophiesManager({ competitionId }: { competitionId: string }) {
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [open, setOpen] = useState(false);
  const [editTrophy, setEditTrophy] = useState<Trophy | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("trophies")
      .select("*")
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: false });

    setTrophies(data || []);
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data } = await supabase
        .from("trophies")
        .select("*")
        .eq("competition_id", competitionId)
        .order("created_at", { ascending: false });

      if (isMounted) {
        setTrophies(data || []);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [competitionId]);


  const handleDelete = async (id: string) => {
    await supabase.from("trophies").delete().eq("id", id);
    load(); 
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
              <div className="font-bold text-lg">{trophy.name}</div>
              <div className="text-xs text-muted-foreground">{trophy.type}</div>
            </CardHeader>
            <CardContent>
              <p>💰 Dinheiro: {trophy.money}</p>
              <p>⭐ Pontos de Rank: {trophy.point_rank}</p>
              {trophy.position && <p>🏅 Posição: {trophy.position}</p>}

              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => { setEditTrophy(trophy); setOpen(true); }}>
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(trophy.id)}>
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* <TrophyFormDialog
        open={open}
        onOpenChange={setOpen}
        competitionId={competitionId}
        trophy={editTrophy}
        onSaved={load}
      /> */}
    </div>
  );
}
