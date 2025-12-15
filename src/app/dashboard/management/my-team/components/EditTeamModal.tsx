"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { Team } from "@/@types/team";
import { Shield } from "@/@types/shield";
import { useRouter } from "next/navigation";
import { AvatarPreview } from "@/components/image/avatarPreview";

interface Props {
  team: Team;
  shield?: Shield | null;
  tenantId: string;
  tenantMemberId: string;
}

export default function EditTeamModal({
  team,
  shield,
  tenantId,
  tenantMemberId,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Team
  const [name, setName] = useState(team.name);
  const [shieldId, setShieldId] = useState<string | undefined>(
    team.shield_id
  );

  // Shield selecionado
  const [selectedShield, setSelectedShield] = useState<Shield | null>(
    shield ?? null
  );

  // Campos editáveis do escudo
  const [stadium, setStadium] = useState(shield?.stadium ?? "");
  const [country, setCountry] = useState(shield?.country ?? "");
  const [shieldUrl, setShieldUrl] = useState(shield?.shield_url ?? "");
  const [uniform1Url, setUniform1Url] = useState(shield?.uniform_1_url ?? "");
  const [uniform2Url, setUniform2Url] = useState(shield?.uniform_2_url ?? "");
  const [uniformGkUrl, setUniformGkUrl] = useState(shield?.uniform_gk_url ?? "");

  // Lista de escudos
  const [shields, setShields] = useState<Shield[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  async function loadShields(pageToLoad: number) {
    if (!hasMore) return;

    const res = await fetch(`/api/shields/list?tenant_id=${tenantId}&tenant_member_id=${tenantMemberId}&page=${pageToLoad}`);
    const json: { data: Shield[] } = await res.json();

    if (json.data.length < 20) setHasMore(false);

    setShields((prev) => {
      const map = new Map(
        [...prev, ...json.data].map((s) => [s.id, s])
      );
      return Array.from(map.values());
    });
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const bottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 40;

    if (bottom && hasMore) {
      const next = page + 1;
      setPage(next);
      loadShields(next);
    }
  }

  function handleSelectShield(s: Shield) {
    setShieldId(s.id);
    setSelectedShield(s);

    // Preenche os campos automaticamente
    setStadium(s.stadium ?? "");
    setCountry(s.country ?? "");
    setShieldUrl(s.shield_url ?? "");
    setUniform1Url(s.uniform_1_url ?? "");
    setUniform2Url(s.uniform_2_url ?? "");
    setUniformGkUrl(s.uniform_gk_url ?? "");
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);

    if (value && shields.length === 0) {
      setPage(1);
      setHasMore(true);
      loadShields(1);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/teams/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: team.id,
        name,
        shield_id: shieldId,
        tenant_member_id: tenantMemberId,
        stadium,
        country,
        shield_url: shieldUrl,
        uniform_1_url: uniform1Url,
        uniform_2_url: uniform2Url,
        uniform_gk_url: uniformGkUrl,
      }),
    });

    setLoading(false);

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      alert("Erro ao atualizar time");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil size={14} />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar meu time</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <Label>Nome do time</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Escudo */}
          <div>
            <Label>Escudo</Label>
            <div
              onScroll={handleScroll}
              className="border rounded-md max-h-52 overflow-y-auto p-2 space-y-1"
            >
              {shields.map((s) => (
                <div
                  key={s.id}
                  className={`p-2 cursor-pointer rounded ${
                    shieldId === s.id
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleSelectShield(s)}
                >
                  {s.name}
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <AvatarPreview avatarPreview={shieldUrl} />

          {/* URLs */}
          <div>
            <Label>URL do Escudo</Label>
            <Input value={shieldUrl} onChange={(e) => setShieldUrl(e.target.value)} disabled={selectedShield?.tenant_member_id !== tenantMemberId} />
          </div>

          <div>
            <Label>URL Uniforme 1</Label>
            <Input value={uniform1Url} onChange={(e) => setUniform1Url(e.target.value)} disabled={selectedShield?.tenant_member_id !== tenantMemberId} />
          </div>

          <div>
            <Label>URL Uniforme 2</Label>
            <Input value={uniform2Url} onChange={(e) => setUniform2Url(e.target.value)} disabled={selectedShield?.tenant_member_id !== tenantMemberId} />
          </div>

          <div>
            <Label>URL Uniforme Goleiro</Label>
            <Input value={uniformGkUrl} onChange={(e) => setUniformGkUrl(e.target.value)} disabled={selectedShield?.tenant_member_id !== tenantMemberId} />
          </div>

          {/* Localização */}
          <div>
            <Label>Estádio</Label>
            <Input value={stadium} onChange={(e) => setStadium(e.target.value)} disabled={selectedShield?.tenant_member_id !== tenantMemberId} />
          </div>

          <div>
            <Label>País</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} disabled={selectedShield?.tenant_member_id !== tenantMemberId} />
          </div>

          <Button className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
