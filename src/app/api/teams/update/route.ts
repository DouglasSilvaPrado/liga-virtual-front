import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { supabase, tenantId } = await createServerSupabase();
    const body = await req.json();

    const {
      team_id,
      name,
      shield_id,

      // dados do escudo
      stadium,
      country,
      shield_url,
      uniform_1_url,
      uniform_2_url,
      uniform_gk_url,
    } = body;

    if (!team_id || !shield_id) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    /* ==========================
     * 1) Usuário logado
     * ========================== */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    /* ==========================
     * 2) tenant_member do usuário
     * ========================== */
    const { data: member, error: memberErr } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'User is not in this tenant' }, { status: 403 });
    }

    const tenant_member_id = member.id;

    /* ==========================
     * 3) Valida ownership do TIME
     * ========================== */
    const { error: teamError } = await supabase
      .from('teams')
      .update({
        name,
        shield_id,
      })
      .eq('id', team_id)
      .eq('tenant_id', tenantId)
      .eq('tenant_member_id', tenant_member_id);

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 400 });
    }

    /* ==========================
     * 4) Verifica ownership do ESCUDO
     * ========================== */
    const { data: shield, error: shieldGetErr } = await supabase
      .from('shields')
      .select('tenant_member_id')
      .eq('id', shield_id)
      .single();

    if (shieldGetErr || !shield) {
      return NextResponse.json({ error: 'Shield not found' }, { status: 404 });
    }

    /* ==========================
     * 5) Só atualiza o escudo se for do usuário
     * ========================== */
    if (shield.tenant_member_id === tenant_member_id) {
      const { error: shieldUpdateErr } = await supabase
        .from('shields')
        .update({
          stadium,
          country,
          shield_url,
          uniform_1_url,
          uniform_2_url,
          uniform_gk_url,
        })
        .eq('id', shield_id)
        .eq('tenant_id', tenantId);

      if (shieldUpdateErr) {
        return NextResponse.json({ error: shieldUpdateErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar time:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
