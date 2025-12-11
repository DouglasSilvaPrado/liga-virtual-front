import { ReactNode } from "react";
import Sidebar from "./components/Sidebar";  // SSR wrapper
import Topbar from "./components/Topbar";    // SSR wrapper

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Topbar />

        <main className="min-h-screen bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
