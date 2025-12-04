import { createServerSupabase } from "@/lib/supabaseServer";
import MembersList from './components/MembersList';

export default async function MembersPage() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: members, error } = await supabase
    .from("tenant_members_with_profiles")
    .select("*")
    .eq("tenant_id", tenantId);


  if (error) {
    console.error("[MEMBERS_ERROR]", error);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Membros</h1>

      <MembersList members={members || []} />
    </div>
  );
}
