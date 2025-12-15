import { createServerSupabase } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const tenantId = searchParams.get('tenant_id');
  const tenantMemberId = searchParams.get('tenant_member_id');
  const page = Number(searchParams.get('page') ?? 1);

  if (!tenantId || !tenantMemberId) {
    return NextResponse.json(
      { error: 'tenant_id e tenant_member_id são obrigatórios' },
      { status: 400 },
    );
  }

  const limit = 20;
  const offset = (page - 1) * limit;

  const { supabase } = await createServerSupabase();

  /* =========================================
   * 1️⃣ Buscar escudos já usados por OUTROS membros
   * ========================================= */
  const { data: usedByOthers, error: usedErr } = await supabase
    .from('teams')
    .select('shield_id')
    .eq('tenant_id', tenantId)
    .neq('tenant_member_id', tenantMemberId);

  if (usedErr) {
    return NextResponse.json({ error: usedErr.message }, { status: 500 });
  }

  const usedShieldIds = (usedByOthers ?? []).map((t) => t.shield_id).filter(Boolean);

  /* =========================================
   * 2️⃣ Buscar escudos permitidos
   * ========================================= */
  let query = supabase
    .from('shields')
    .select('*')
    .eq('status', 'active')
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // remove escudos usados por outros membros
  if (usedShieldIds.length > 0) {
    query = query.not('id', 'in', `(${usedShieldIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
