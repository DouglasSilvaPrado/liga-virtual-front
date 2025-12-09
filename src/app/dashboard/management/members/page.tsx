import { createServerSupabase } from '@/lib/supabaseServer';
import MembersList from './components/MembersList';
import AddMemberModal from './components/AddMemberModal';

export default async function MembersPage() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: members } = await supabase
    .from('tenant_members_with_profiles')
    .select('*')
    .eq('tenant_id', tenantId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserRole = members?.find((m) => m.user_id === user?.id)?.role || 'member';

  const isOwner = currentUserRole === 'owner';

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Membros</h1>

        {isOwner && <AddMemberModal tenantId={tenantId} />}
      </div>

      <MembersList members={members || []} currentUserRole={currentUserRole} />
    </div>
  );
}
