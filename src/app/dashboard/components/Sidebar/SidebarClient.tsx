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

const cupMenu = [
  { href: "/dashboard/cups", label: "Copas" },
]

const leagueMenu = [
  { href: "/dashboard/leagues", label: "Ligas" },
]

export default function SidebarClient({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const autoOpen = pathname.startsWith("/dashboard/management");
  const autoOpenCup = pathname.startsWith("/dashboard/cup");
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [isOpenCup, setIsOpenCup] = useState(autoOpenCup);
  const [isLeagueOpen, setIsLeagueOpen] = useState(false);

  useEffect(() => {
    setIsOpen(autoOpen);
  }, [autoOpen]);

  function handleNavigate() {
    onNavigate?.();
  }

  return (
    <aside className="w-64 shrink-0 border-r bg-white p-4 shadow-sm">
      <nav className="space-y-2">
        <Link
          href="/dashboard"
          onClick={handleNavigate}
          className={cn(
            "block rounded px-3 py-2 hover:bg-gray-100",
            pathname === "/dashboard" && "bg-gray-200 font-medium"
          )}
        >
          Início
        </Link>

        {/* Gerenciamento */}
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
                  onClick={handleNavigate}
                  className={cn(
                    "block rounded px-3 py-2 text-sm hover:bg-gray-100",
                    pathname === item.href &&
                      "bg-gray-200 font-medium"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Copas */}
        <div>
          <button
            onClick={() => setIsOpenCup(!isOpenCup)}
            className="flex w-full justify-between rounded px-3 py-2 hover:bg-gray-100"
          >
            <span>Copas</span>
            <span className="text-sm">{isOpenCup ? "▲" : "▼"}</span>
          </button>

          {isOpenCup && (
            <div className="mt-2 ml-4 space-y-1">
              {cupMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    "block rounded px-3 py-2 text-sm hover:bg-gray-100",
                    pathname === item.href &&
                      "bg-gray-200 font-medium"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Ligas */}
        <div>
          <button
            onClick={() => setIsLeagueOpen(!isLeagueOpen)}
            className="flex w-full justify-between rounded px-3 py-2 hover:bg-gray-100"
          >
            <span>Ligas</span>
            <span className="text-sm">{isLeagueOpen ? "▲" : "▼"}</span>
          </button>

          {isLeagueOpen && (
            <div className="mt-2 ml-4 space-y-1">
              {leagueMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    "block rounded px-3 py-2 text-sm hover:bg-gray-100",
                    pathname === item.href &&
                      "bg-gray-200 font-medium"
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
