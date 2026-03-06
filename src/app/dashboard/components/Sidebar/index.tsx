import { createServerSupabase } from '@/lib/supabaseServer';
import SidebarClient from './SidebarClient';

type TenantMemberRow = {
  id: string;
  role: 'owner' | 'admin' | 'member' | null;
};

export default async function Sidebar() {
  const { supabase, tenantId } = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: TenantMemberRow['role'] = null;

  if (user) {
    const { data: tenantMember } = await supabase
      .from('tenant_members')
      .select('id, role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single<TenantMemberRow>();

    role = tenantMember?.role ?? null;
  }

  return <SidebarClient role={role} />;
}
