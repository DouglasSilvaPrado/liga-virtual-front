"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Competition } from "@/@types/competition";
import { useForm } from "react-hook-form";

export default function EditCompetitionModal({
  open,
  onOpenChange,
  competition,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  competition: Competition;
}) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: competition.name,
      rules: competition.rules || "",
      competition_url: competition.competition_url || "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: competition.name,
        rules: competition.rules || "",
        competition_url: competition.competition_url || "",
      });
    }
  }, [open]);

  const onSubmit = async (values: Partial<Competition>) => {

    setLoading(true);

    const res = await fetch(`/api/competitions/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: competition.id,
        ...values,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      alert("Erro ao atualizar competição");
    } else {
      onOpenChange(false);
      window.location.reload();
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Competição</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Nome */}
          <div>
            <Label>Nome</Label>
            <Input {...register("name")} />
          </div>

          {/* URL */}
          <div>
            <Label>URL da Imagem / Escudo</Label>
            <Input {...register("competition_url")} placeholder="https://..." />
          </div>

          {/* Regras */}
          <div>
            <Label>Regras</Label>
            <Textarea rows={4} {...register("rules")} />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
