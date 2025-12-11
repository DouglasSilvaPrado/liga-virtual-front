"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function TopbarClient() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      <button
        onClick={logout}
        className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
      >
        Sair
      </button>
    </header>
  );
}
