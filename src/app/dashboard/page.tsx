import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { LogoutButton } from '@/components/LogoutButton';

export default async function Dashboard() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Não autenticado</h1>
      </div>
    );
  }

  const userTenant = session.user.user_metadata?.tenant_id;

  // tenant vindo do middleware (cookie) ou do metadata do user
  const tenantId =
    cookieStore.get("x-tenant-id")?.value ?? userTenant ?? null;

  if (!tenantId) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-red-500">
          Tenant não identificado
        </h1>
      </div>
    );
  }

  const { data: teams, error } = await supabase
    .from("teams")
    .select("*")
    .eq("tenant_id", tenantId);

  return (
    <div className="p-8">
      <LogoutButton />
      <h1 className="text-3xl font-semibold mb-6">Dashboard</h1>

      <h2 className="text-xl font-medium mb-2">Times do Tenant</h2>

      <pre className="bg-gray-100 p-4 rounded-lg text-sm">
        {JSON.stringify(teams, null, 2)}
      </pre>

      {error && (
        <p className="text-red-500 mt-4">Erro: {error.message}</p>
      )}
    </div>
  );
}
