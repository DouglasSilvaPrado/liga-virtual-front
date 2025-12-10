"use client";
import { Trophy } from '@/@types/trophies';
import { AvatarPreview } from '@/components/image/avatarPreview';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";


export default function TrophyFormDialog({ open, onOpenChange, competitionId, tenant_id, trophy, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  competitionId: string;
  tenant_id: string;
  trophy?: Trophy | null;
  onSaved: () => void;
  }) {
    
  const [form, setForm] = useState<Trophy>(
    trophy || {
      name: "",
      trophy_url: "",
      money: 0,
      point_rank: 0,
      tenant_id: tenant_id,
      competition_id: competitionId,
      created_at: new Date().toISOString()
    }
  );


  const save = async () => {
    if (trophy) {
    await supabase.from("trophies").update(form).eq("id", trophy.id);
    } else {
    await supabase.from("trophies").insert(form);
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

        <Button onClick={save} className="mt-4">Salvar</Button>
      </div>
    </DialogContent>
  </Dialog>
  );
}