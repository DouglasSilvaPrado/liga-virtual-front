import Link from 'next/link';


export default function Sidebar() {
return (
<aside className="w-64 bg-white border-r p-4 space-y-4">
<h1 className="text-xl font-bold">Liga Virtual</h1>
<nav className="flex flex-col gap-2">
<Link href="/" className="hover:bg-neutral-200 p-2 rounded">Dashboard</Link>
<Link href="/competitions" className="hover:bg-neutral-200 p-2 rounded">Competições</Link>
<Link href="/tenants" className="hover:bg-neutral-200 p-2 rounded">Tenants</Link>
</nav>
</aside>
);
}