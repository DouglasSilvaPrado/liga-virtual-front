"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const managementMenu = [
  { href: "/dashboard/management/members", label: "Membros" },
  { href: "/dashboard/management/championships", label: "Campeonatos" },
  { href: "/dashboard/management/shields", label: "Escudos" },
  { href: "/dashboard/management/my-team", label: "Meu Time" },
];

export default function SidebarClient() {
  const pathname = usePathname();

  const autoOpen = pathname.startsWith("/dashboard/management");
  const [isOpen, setIsOpen] = useState(autoOpen);

  useEffect(() => {
    setIsOpen(autoOpen);
  }, [autoOpen]);

  return (
    <aside className="w-64 flex flex-col border-r bg-white p-4 shadow-sm">
      <nav className="space-y-2">

        <Link
          href="/dashboard"
          className={cn(
            "block rounded px-3 py-2 hover:bg-gray-100",
            pathname === "/dashboard" && "bg-gray-200 font-medium"
          )}
        >
          Início
        </Link>

        {/* Grupo GERENCIAMENTO */}
        <div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full justify-between rounded px-3 py-2 hover:bg-gray-100"
          >
            <span>Gerenciamento</span>
            <span className="text-sm">{isOpen ? "▲" : "▼"}</span>
          </button>

          {isOpen && (
            <div className="mt-2 ml-4 space-y-1">
              {managementMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded px-3 py-2 text-sm hover:bg-gray-100",
                    pathname === item.href && "bg-gray-200 font-medium"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
