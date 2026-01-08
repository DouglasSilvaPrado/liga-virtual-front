import { createServerSupabase } from '@/lib/supabaseServer';
import ShieldsTable from './components/ShieldsTable';
import Pagination from './components/Pagination';
import CreateShieldModal from './components/CreateShieldModal';

export default async function ShieldsPage(props: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, tenantId } = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from('tenant_members')
    .select('id, role')
    .eq('user_id', user?.id)
    .limit(1)
    .single();

  const tenant_member_id = member?.id;
  const tenant_member_role = member?.role;

  const searchParams = await props.searchParams;

  const page = Number(searchParams.page ?? 1);
  const limit = 20;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: shields, count } = await supabase
    .from('shields')
    .select('*', { count: 'exact' })
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order('created_at', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / limit);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Escudos</h1>
        <CreateShieldModal tenantId={tenantId} tenant_member_id={tenant_member_id} />
      </div>

      <ShieldsTable
        shields={shields || []}
        tenant_member_id={tenant_member_id}
        tenant_member_role={tenant_member_role}
      />

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
