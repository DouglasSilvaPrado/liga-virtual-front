'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type UserRole = 'owner' | 'admin' | 'member' | null;

export default function SidebarClient({
  onNavigate,
  role,
}: {
  onNavigate?: () => void;
  role: UserRole;
}) {
  const pathname = usePathname();

  const managementMenu = [
    { href: '/dashboard/management/members', label: 'Membros' },
    ...(role === 'owner' || role === 'admin'
      ? [{ href: '/dashboard/management/championships', label: 'Campeonatos' }]
      : []),
    { href: '/dashboard/management/shields', label: 'Escudos' },
    { href: '/dashboard/management/my-team', label: 'Meu Time' },
  ];

  const cupMenu = [{ href: '/dashboard/cups', label: 'Copas' }];
  const leagueMenu = [{ href: '/dashboard/leagues', label: 'Ligas' }];
  const negotiationsMenu = [
    { href: '/dashboard/negotiations/hirePlayer', label: 'Contratar Jogador' },
    { href: '/dashboard/negotiations/proposals', label: 'Propostas' },
  ];

  const autoOpenManagement = pathname.startsWith('/dashboard/management');
  const autoOpenCup = pathname.startsWith('/dashboard/cups');
  const autoOpenLeague = pathname.startsWith('/dashboard/leagues');
  const autoOpenNegotiations = pathname.startsWith('/dashboard/negotiations');

  const [isOpenManagement, setIsOpenManagement] = useState(autoOpenManagement);
  const [isOpenCup, setIsOpenCup] = useState(autoOpenCup);
  const [isLeagueOpen, setIsLeagueOpen] = useState(autoOpenLeague);
  const [isNegotiationsOpen, setIsNegotiationsOpen] = useState(autoOpenNegotiations);

  useEffect(() => {
    setIsOpenManagement(autoOpenManagement);
  }, [autoOpenManagement]);

  useEffect(() => {
    setIsOpenCup(autoOpenCup);
  }, [autoOpenCup]);

  useEffect(() => {
    setIsLeagueOpen(autoOpenLeague);
  }, [autoOpenLeague]);

  useEffect(() => {
    setIsNegotiationsOpen(autoOpenNegotiations);
  }, [autoOpenNegotiations]);

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
            'block rounded-lg px-3 py-2 transition hover:bg-gray-100',
            pathname === '/dashboard' && 'bg-gray-200 font-medium',
          )}
        >
          Início
        </Link>

        <div>
          <button
            onClick={() => setIsOpenManagement(!isOpenManagement)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            <span>Gerenciamento</span>
            <span className="text-sm">{isOpenManagement ? '▲' : '▼'}</span>
          </button>

          {isOpenManagement && (
            <div className="mt-2 ml-4 space-y-1">
              {managementMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition hover:bg-gray-100',
                    pathname === item.href && 'bg-gray-200 font-medium',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setIsOpenCup(!isOpenCup)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            <span>Copas</span>
            <span className="text-sm">{isOpenCup ? '▲' : '▼'}</span>
          </button>

          {isOpenCup && (
            <div className="mt-2 ml-4 space-y-1">
              {cupMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition hover:bg-gray-100',
                    pathname === item.href && 'bg-gray-200 font-medium',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setIsLeagueOpen(!isLeagueOpen)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            <span>Ligas</span>
            <span className="text-sm">{isLeagueOpen ? '▲' : '▼'}</span>
          </button>

          {isLeagueOpen && (
            <div className="mt-2 ml-4 space-y-1">
              {leagueMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition hover:bg-gray-100',
                    pathname === item.href && 'bg-gray-200 font-medium',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setIsNegotiationsOpen(!isNegotiationsOpen)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            <span>Negociações</span>
            <span className="text-sm">{isNegotiationsOpen ? '▲' : '▼'}</span>
          </button>

          {isNegotiationsOpen && (
            <div className="mt-2 ml-4 space-y-1">
              {negotiationsMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition hover:bg-gray-100',
                    pathname === item.href && 'bg-gray-200 font-medium',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard/settings"
            onClick={handleNavigate}
            className={cn(
              'block rounded-lg px-3 py-2 transition hover:bg-gray-100',
              pathname.startsWith('/dashboard/settings') && 'bg-gray-200 font-medium',
            )}
          >
            Configurações
          </Link>
        </div>
      </nav>
    </aside>
  );
}