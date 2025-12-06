"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MemberProfile } from "@/@types/memberProfile";
import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import RoleSelect from "@/components/forms/select/RoleSelect";

export default function EditMemberModal({
member,
open,
onOpenChange,
isOwner,
}: {
member: MemberProfile;
open: boolean;
onOpenChange: (v: boolean) => void;
isOwner: boolean;
}) {
const [loading, setLoading] = useState(false);

const [form, setForm] = useState({
full_name: member.full_name ?? "",
avatar_url: member.avatar_url ?? "",
platform: member.platform ?? "",
country: member.country ?? "",
birth_date: member.birth_date ?? "",
whatsapp: member.whatsapp ?? "",
state: member.state ?? "",
city: member.city ?? "",
role: member.role ?? "",
});

const updateField = (key: string, value: string) =>
setForm((prev) => ({ ...prev, [key]: value }));

async function onSave() {
setLoading(true);

const res = await fetch("/api/members/update", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: member.user_id,
    tenant_member_id: member.id,
    ...form,
  }),
});

setLoading(false);

if (res.ok) {
  onOpenChange(false);
  window.location.reload();
} else {
  console.error(await res.json());
  alert("Erro ao salvar!");
}

}

const avatarPreview = form.avatar_url?.length > 5 ? form.avatar_url : null;

return ( <Dialog open={open} onOpenChange={onOpenChange}> <DialogContent> <DialogHeader> <DialogTitle>Editar membro</DialogTitle> </DialogHeader>

    <div className="space-y-4">

      {/* AVATAR PREVIEW */}
      <div className="flex flex-col items-center space-y-3">
        <Avatar className="w-24 h-24 border shadow">
          <AvatarImage src={avatarPreview ?? ""} alt="Avatar Preview" />
          <AvatarFallback>NO IMG</AvatarFallback>
        </Avatar>
      </div>

      <div>
        <Label>Avatar URL</Label>
        <Input
          placeholder="https://exemplo.com/avatar.png"
          value={form.avatar_url}
          onChange={(e) => updateField("avatar_url", e.target.value)}
        />
      </div>

      <div>
        <Label>Nome completo</Label>
        <Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} />
      </div>

      <div>
        <Label>Plataforma (PSN/Live/Steam)</Label>
        <Input value={form.platform} onChange={(e) => updateField("platform", e.target.value)} />
      </div>

      <div>
        <Label>País</Label>
        <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} />
      </div>

      <div>
        <Label>Data de nascimento</Label>
        <Input type="date" value={form.birth_date} onChange={(e) => updateField("birth_date", e.target.value)} />
      </div>

      <div>
        <Label>WhatsApp</Label>
        <Input value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} />
      </div>

      <div>
        <Label>Estado</Label>
        <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} />
      </div>

      <div>
        <Label>Cidade</Label>
        <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
      </div>

      <RoleSelect
        value={form.role}
        onChange={(role) => updateField("role", role)}
        disabled={!isOwner}
        showLockedMessage={!isOwner}
      />

      <Button onClick={onSave} disabled={loading}>
        {loading ? "Salvando..." : "Salvar alterações"}
      </Button>
    </div>
  </DialogContent>
</Dialog>

);
}
