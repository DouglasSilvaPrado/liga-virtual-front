"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Submenu Management
const managementMenu = [
  { href: "/dashboard/management/members", label: "Membros" },
  { href: "/dashboard/management/championships", label: "Campeonatos" },
  // pode adicionar mais itens
];

export default function Sidebar() {
  const pathname = usePathname();

  // Abre automaticamente se a rota pertence ao grupo /management
  const openManagement = pathname.startsWith("/dashboard/management");

  const [isOpen, setIsOpen] = useState(openManagement);

  useEffect(() => {
    setIsOpen(openManagement);
  }, [openManagement]);

  return (
    <aside className="w-64 bg-white border-r shadow-sm p-4 flex flex-col">
      <nav className="space-y-2">

        {/* Início */}
        <Link
          href="/dashboard"
          className={cn(
            "block px-3 py-2 rounded hover:bg-gray-100",
            pathname === "/dashboard" && "bg-gray-200 font-medium"
          )}
        >
          Início
        </Link>

        {/* GERENCIAMENTO */}
        <div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex justify-between w-full px-3 py-2 rounded hover:bg-gray-100"
          >
            <span>Gerenciamento</span>
            <span className="text-sm">{isOpen ? "▲" : "▼"}</span>
          </button>

          {/* Submenu */}
          {isOpen && (
            <div className="ml-4 mt-2 space-y-1">
              {managementMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 rounded hover:bg-gray-100 text-sm",
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
