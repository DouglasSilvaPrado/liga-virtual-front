'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import RoleSelect from '@/components/forms/select/RoleSelect';

export default function AddMemberModal({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'member',
  });

  const updateField = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  async function submit() {
    setLoading(true);

    const payload = {
      tenantId,
      email: form.email,
      password: form.password,
      role: form.role,
    };

    const res = await fetch('/api/members/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (res.ok) {
      setOpen(false);
      window.location.reload();
    } else {
      const error = await res.json();
      console.error(error);
      alert('Erro ao criar membro! ' + (error?.message || ''));
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Adicionar Membro</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Membro</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Email (Login)</Label>
              <Input
                placeholder="email@email.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            <div>
              <Label>Senha inicial</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
              />
            </div>

            <RoleSelect
              value={form.role}
              onChange={(role) => updateField('role', role)}
              disabled={false}
              showLockedMessage={!true}
            />

            <Button onClick={submit} disabled={loading}>
              {loading ? 'Salvando...' : 'Criar Membro'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
