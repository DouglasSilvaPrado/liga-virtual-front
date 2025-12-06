import { createServerSupabase } from "@/lib/supabaseServer";
import MembersList from './components/MembersList';
import AddMemberModal from './components/AddMemberModal';


export default async function MembersPage() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: members } = await supabase
    .from("tenant_members_with_profiles")
    .select("*")
    .eq("tenant_id", tenantId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserRole =
    members?.find((m) => m.user_id === user?.id)?.role || "member";

  const isOwner = currentUserRole === "owner";

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Membros</h1>

        {isOwner && <AddMemberModal tenantId={tenantId} />}
      </div>

      <MembersList members={members || []} currentUserRole={currentUserRole} />
    </div>
  );
}
