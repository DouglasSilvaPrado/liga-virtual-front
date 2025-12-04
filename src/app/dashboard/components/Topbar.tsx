"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Topbar({ tenantId }: { tenantId: string | null }) {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b px-6 py-3 flex justify-between items-center">
      <h2 className="text-lg font-semibold">
        Painel Administrativo
      </h2>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          Tenant: {tenantId}
        </span>

        <button
          onClick={logout}
          className="px-3 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
