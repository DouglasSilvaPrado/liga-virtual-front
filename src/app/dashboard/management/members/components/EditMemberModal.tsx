'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MemberProfile } from '@/@types/memberProfile';
import { useState } from 'react';

import RoleSelect from '@/components/forms/select/RoleSelect';
import { AvatarPreview } from '@/components/image/avatarPreview';

type FormState = {
  full_name: string;
  avatar_url: string;
  platform: string;
  country: string;
  birth_date: string;
  whatsapp: string;
  state: string;
  city: string;
  role: string;
  active: boolean;
};


export default function EditMemberModal({
  member,
  open,
  onOpenChange,
  IsOwnerOrAdmin,
}: {
  member: MemberProfile;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  IsOwnerOrAdmin: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormState>({
    full_name: member.full_name ?? '',
    avatar_url: member.avatar_url ?? '',
    platform: member.platform ?? '',
    country: member.country ?? '',
    birth_date: member.birth_date ?? '',
    whatsapp: member.whatsapp ?? '',
    state: member.state ?? '',
    city: member.city ?? '',
    role: member.role ?? '',
    active: member.active ?? false,
  });


  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };


  async function onSave() {
    setLoading(true);

    const res = await fetch('/api/members/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      alert('Erro ao salvar!');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {' '}
      <DialogContent className="max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        {' '}
        <DialogHeader>
          {' '}
          <DialogTitle>Editar membro</DialogTitle>{' '}
        </DialogHeader>
        <div className="space-y-4">
          <AvatarPreview avatarPreview={form.avatar_url} />

          <div>
            <Label>Avatar URL</Label>
            <Input
              placeholder="https://exemplo.com/avatar.png"
              value={form.avatar_url}
              onChange={(e) => updateField('avatar_url', e.target.value)}
            />
          </div>

          <div>
            <Label>Nome completo</Label>
            <Input
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
            />
          </div>

          <div>
            <Label>Plataforma (PSN/Live/Steam)</Label>
            <Input
              value={form.platform}
              onChange={(e) => updateField('platform', e.target.value)}
            />
          </div>

          <div>
            <Label>País</Label>
            <Input value={form.country} onChange={(e) => updateField('country', e.target.value)} />
          </div>

          <div>
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => updateField('birth_date', e.target.value)}
            />
          </div>

          <div>
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => updateField('whatsapp', e.target.value)}
            />
          </div>

          <div>
            <Label>Estado</Label>
            <Input value={form.state} onChange={(e) => updateField('state', e.target.value)} />
          </div>

          <div>
            <Label>Cidade</Label>
            <Input value={form.city} onChange={(e) => updateField('city', e.target.value)} />
          </div>

          <RoleSelect
            value={form.role}
            onChange={(role) => updateField('role', role)}
            disabled={!IsOwnerOrAdmin}
            showLockedMessage={!IsOwnerOrAdmin}
          />

          <div>
            <Label>Cargo</Label>
            <select
              className={`w-full rounded-md border p-2 ${
                !IsOwnerOrAdmin ? 'cursor-not-allowed bg-gray-100' : ''
              }`}
              value={String(form.active)}
              disabled={!IsOwnerOrAdmin}
              onChange={(e) =>
                updateField('active', e.target.value === 'true')
              }
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          <Button onClick={onSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
