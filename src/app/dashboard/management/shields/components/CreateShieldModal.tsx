"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { AvatarPreview } from '@/components/image/avatarPreview';

export default function CreateShieldModal({ tenantId, tenant_member_id }: { tenantId: string; tenant_member_id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [shieldUrl, setShieldUrl] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const body = {
      name: form.get("name"),
      abbreviation: form.get("abbreviation"),
      stadium: form.get("stadium"),
      country: form.get("country"),
      status: form.get("status"),
      main_color: form.get("main_color"),
      shield_url: form.get("shield_url"),
      uniform_1_url: form.get("uniform_1_url"),
      uniform_2_url: form.get("uniform_2_url"),
      uniform_gk_url: form.get("uniform_gk_url"),
      tenant_id: tenantId,
      tenant_member_id: tenant_member_id,
    };

    const res = await fetch("/api/shields/create", {
      method: "POST",
      body: JSON.stringify(body),
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
        <Button>Criar Escudo</Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar novo escudo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          <AvatarPreview avatarPreview={shieldUrl} />

          <div>
            <Label>Nome</Label>
            <Input name="name" required />
          </div>

          <div>
            <Label>Abreviação</Label>
            <Input name="abbreviation" required />
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
            <Label>Status</Label>
            <Input name="status" />
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
