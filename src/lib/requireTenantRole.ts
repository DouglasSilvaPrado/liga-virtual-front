import { createServerSupabase } from '@/lib/supabaseServer';

export type TenantRole = 'owner' | 'admin' | 'member' | null;

export async function getCurrentTenantRole() {
  const { supabase, tenantId } = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, tenantId, user: null, role: null as TenantRole };
  }

  const { data: tenantMember } = await supabase
    .from('tenant_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  return {
    supabase,
    tenantId,
    user,
    role: (tenantMember?.role ?? null) as TenantRole,
  };
}

export function isAdminOrOwner(role: TenantRole) {
  return role === 'owner' || role === 'admin';
}
