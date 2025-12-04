"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const menu = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/members", label: "Membros" },
  { href: "/dashboard/championships", label: "Campeonatos" },
  { href: "/dashboard/competitions", label: "Competições" },
  { href: "/dashboard/teams", label: "Times" },
  { href: "/dashboard/players", label: "Jogadores" },
  { href: "/dashboard/matches", label: "Partidas" },
  { href: "/dashboard/settings", label: "Configurações" },
];

export default function Sidebar({ tenantId }: { tenantId: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r shadow-sm p-4 flex flex-col">
      <div className="mb-6">
        <h1 className="font-bold text-xl">
          Tenant
        </h1>
        <p className="text-xs text-gray-500">
          {tenantId ?? "Carregando..."}
        </p>
      </div>

      <nav className="space-y-2">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block px-3 py-2 rounded hover:bg-gray-100",
              pathname === item.href && "bg-gray-200 font-medium"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
