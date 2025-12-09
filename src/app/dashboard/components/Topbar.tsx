'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Topbar() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      <div className="flex items-center gap-4">
        <button
          onClick={logout}
          className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
