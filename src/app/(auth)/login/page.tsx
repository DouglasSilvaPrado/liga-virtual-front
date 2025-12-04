'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from "next/navigation";
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function getSubdomain() {
  if (typeof window === "undefined") return null;
  const host = window.location.host.split(":")[0];
  if (host === "localhost") return "localhost";
  return host.split(".")[0];
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const sub = getSubdomain();
    if (!sub) return setError("Tenant inválido.");

    try {
      const res = await fetch(`/api/tenant/resolve?sub=${encodeURIComponent(sub)}`);
      if (!res.ok) return setError("Erro ao resolver tenant.");
      const { tenant } = await res.json();

      if (!tenant) return setError("Tenant não encontrado.");

      await fetch("/api/auth/set-tenant", {
        method: "POST",
        body: JSON.stringify({ tenantId: tenant.id })
      });

      const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });



      if (signInError) return setError(signInError.message);

      const user = signInData.user;
      if (!user) return setError("Usuário não retornado.");

      await supabase.auth.updateUser({
        data: { tenant_id: tenant.id }
      });

      await supabase.rpc("ensure_tenant_member", {
        p_tenant_id: tenant.id,
        p_user_id: user.id
      });

      await new Promise(r => setTimeout(r, 50));
      router.push("/dashboard");
      router.refresh();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message ?? "Erro desconhecido");
    }
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="w-80 space-y-4">
        <h1 className="text-2xl font-semibold">Entrar</h1>

        <Input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500">{error}</p>}

        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </div>
  );
}
