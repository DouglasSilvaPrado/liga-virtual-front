import { ReactNode } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex">
        <Sidebar />
      </aside>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col">
        <Topbar />

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
