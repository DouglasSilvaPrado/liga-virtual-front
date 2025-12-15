"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import SidebarClient from '../Sidebar/SidebarClient';

export default function TopbarClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Topbar */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          {/* Botão menu mobile */}
          <button
            onClick={() => setOpen(true)}
            className="md:hidden rounded p-2 hover:bg-gray-100"
          >
            ☰
          </button>

          <h2 className="text-lg font-semibold">Dashboard</h2>
        </div>

        <button
          onClick={logout}
          className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
        >
          Sair
        </button>
      </header>

      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* backdrop */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* drawer */}
          <div className="w-64 bg-white">
            <SidebarClient onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
