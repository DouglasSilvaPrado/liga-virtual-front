import Sidebar from './Sidebar';
import Topbar from './Topbar';



export default function DashboardShell({ children }: { children: React.ReactNode }) {
return (
<div className="flex min-h-screen w-full bg-neutral-100">
<Sidebar />
<div className="flex flex-col flex-1">
<Topbar />
<main className="p-6">{children}</main>
</div>
</div>
);
}