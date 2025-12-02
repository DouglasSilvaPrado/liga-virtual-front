'use client';

import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';

function getSubdomain() {
  if (typeof window === "undefined") return null;

  const host = window.location.host.split(":")[0];

  // localhost → usar tenant 'localhost'
  if (host === "localhost") return "localhost";

  return host.split(".")[0];
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const sub = getSubdomain();
    if (!sub) return setError("Tenant inválido.");

    // resolve tenant via API SSR
    try {
      const res = await fetch(`/api/tenant/resolve?sub=${encodeURIComponent(sub)}`);
      if (!res.ok) {
        setError("Erro ao resolver tenant.");
        return;
      }
      const { tenant } = await res.json();

      if (!tenant) return setError("Tenant não encontrado.");

      // Criar usuário
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            tenant_id: tenant.id
          }
        }
      });

      if (signUpError) return setError(signUpError.message);

      const user = data.user;

      // Criar tenant_members (RPC)
      await supabase.rpc("ensure_tenant_member", {
        p_tenant_id: tenant.id,
        p_user_id: user?.id
      });

      router.push("/login");
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Register error:", err);
      setError(err?.message ?? "Erro desconhecido");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <form onSubmit={handleRegister} className="w-80 space-y-4">
        <h1 className="text-2xl font-semibold">Criar Conta</h1>

        <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />

        {error && <p className="text-red-500">{error}</p>}

        <Button type="submit" className="w-full">Cadastrar</Button>
      </form>
    </div>
  );
}
