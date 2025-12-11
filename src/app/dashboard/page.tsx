import { createServerSupabase } from "@/lib/supabaseServer";

export default async function DashboardHome() {
  const { supabase } = await createServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-2xl font-bold">Bem-vindo ao Dashboard</h1>
      <p className="mt-2 text-gray-600">Usuário: {user?.email ?? "Desconhecido"}</p>
    </div>
  );
}
