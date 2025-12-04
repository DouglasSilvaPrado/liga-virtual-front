import { ReactNode } from "react";
import { cookies } from "next/headers";
import Sidebar from "./components/Sidebar";
import Topbar from './components/Topbar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("x-tenant-id")?.value ?? null;

  return (
    <div className="flex min-h-screen">
      <Sidebar tenantId={tenantId} />

      <div className="flex flex-col flex-1">
        <Topbar tenantId={tenantId} />

        <main className="p-6 bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
