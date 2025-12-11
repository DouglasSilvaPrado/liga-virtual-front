import { createServerSupabase } from "@/lib/supabaseServer";
import ShieldsTable from "./components/ShieldsTable";
import Pagination from './components/Pagination';

export default async function ShieldsPage({ searchParams }: { searchParams: { page?: string } }) {
  const { supabase, tenantId } = await createServerSupabase();

  const page = Number(searchParams.page ?? 1);
  const limit = 20; // melhor para 142 páginas
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: shields, count } = await supabase
    .from("shields")
    .select("*", { count: "exact" })
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / limit);

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Escudos</h1>

      <div className="rounded-lg border">
        <ShieldsTable shields={shields || []} />
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
