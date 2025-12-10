"use client";
import { Trophy, TROPHY_TYPES } from '@/@types/trophies';
import { AvatarPreview } from '@/components/image/avatarPreview';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";


export default function TrophyFormDialog({ open, onOpenChange, competitionId, tenant_id, trophy, setTrophy, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  competitionId: string;
  tenant_id: string;
  trophy?: Trophy | null;
  setTrophy:  (v: Trophy | null) => void;
  onSaved: () => void;
  }) {
  const [form, setForm] = useState<Trophy>(
    trophy || {
      name: "",
      trophy_url: "",
      money: 0,
      point_rank: 0,
      type: "posicao",
      position: 1,
      tenant_id: tenant_id,
      competition_id: competitionId,
      created_at: new Date().toISOString()
    }
  );


  const save = async () => {
    if (trophy) {
    await supabase.from("trophies").update(form).eq("id", trophy.id);
    setTrophy(null);
    } else {
    await supabase.from("trophies").insert(form);
    setTrophy(null);
  }


  onSaved();
    onOpenChange(false);
  };


  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{trophy ? "Editar Troféu" : "Novo Troféu"}</DialogTitle>
      </DialogHeader>

      <AvatarPreview avatarPreview={form.trophy_url} />

      <div className="grid gap-3">
        <div>
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div>
          <Label>Imagem (URL)</Label>
          <Input value={form.trophy_url} onChange={(e) => setForm({ ...form, trophy_url: e.target.value })} />
        </div>

        <div>
          <Label>Dinheiro</Label>
          <Input type="number" value={form.money} onChange={(e) => setForm({ ...form, money: Number(e.target.value) })} />
        </div>

        <div>
          <Label>Pontos de Rank</Label>
          <Input type="number" value={form.point_rank} onChange={(e) => setForm({ ...form, point_rank: Number(e.target.value) })} />
        </div>

         {/* Tipo */}
          <div>
            <Label>Tipo do Troféu</Label>
            <Select
              value={form.type}
              onValueChange={(v) => {
                console.log("🚀 ~ TrophyFormDialog ~ v:", v)
                return setForm({ ...form, type: v as typeof TROPHY_TYPES[number] });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TROPHY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Posição (somente quando type = posicao) */}
          {form.type === "posicao" && (
            <div>
              <Label>Posição</Label>
              <Input
                type="number"
                value={form.position ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    position: Number(e.target.value)
                  })
                }
              />
            </div>
          )}

        <Button onClick={save} className="mt-4">Salvar</Button>
      </div>
    </DialogContent>
  </Dialog>
  );
}