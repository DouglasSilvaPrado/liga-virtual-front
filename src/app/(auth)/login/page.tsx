'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e: any) {
    e.preventDefault();
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="w-80 space-y-4">
        <h1 className="text-2xl font-semibold">Entrar</h1>

        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500">{error}</p>}

        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
    </div>
  );
}
