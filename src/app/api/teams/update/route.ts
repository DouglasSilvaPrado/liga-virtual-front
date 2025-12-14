import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { supabase, tenantId } = await createServerSupabase();
    const body = await req.json();

    const { team_id, name, shield_id, tenant_member_id } = body;

    if (!team_id || !tenant_member_id) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    const { error } = await supabase
      .from('teams')
      .update({
        name,
        shield_id,
      })
      .eq('id', team_id)
      .eq('tenant_id', tenantId)
      .eq('tenant_member_id', tenant_member_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
