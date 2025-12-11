"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield } from "@/@types/shield";
import { AvatarPreview } from '@/components/image/avatarPreview';

export default function EditShieldModal({ shield }: { shield: Shield }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shieldUrl, setShieldUrl] = useState(shield.shield_url || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());

    const payload = {
      id: shield.id,
      ...body,
    };

    const res = await fetch("/api/shields/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Escudo</DialogTitle>
        </DialogHeader>

        <AvatarPreview avatarPreview={shieldUrl} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input name="name" defaultValue={shield.name} />
          </div>

          <div>
            <Label>Abreviação</Label>
            <Input name="abbreviation" defaultValue={shield.abbreviation} />
          </div>

          <div>
            <Label>Status</Label>
            <Input name="status" defaultValue={shield.status} />
          </div>

           <div>
            <Label>País</Label>
            <Input name="country" />
          </div>

          <div>
            <Label>Estádio</Label>
            <Input name="stadium" />
          </div>

          <div>
            <Label>Cor Principal</Label>
            <Input name="main_color" />
          </div>

          <div>
            <Label>URL do Escudo</Label>
            <Input
              name="shield_url"
              required
              onChange={(e) => setShieldUrl(e.target.value)}
            />
          </div>

          <div>
            <Label>URL Uniforme 1</Label>
            <Input name="uniform_1_url" />
          </div>

          <div>
            <Label>URL Uniforme 2</Label>
            <Input name="uniform_2_url" />
          </div>

          <div>
            <Label>URL Uniforme Goleiro</Label>
            <Input name="uniform_gk_url" />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
