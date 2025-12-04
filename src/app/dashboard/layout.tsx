import { ReactNode } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from './components/Topbar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex flex-col flex-1">
        <Topbar />

        <main className="p-6 bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
