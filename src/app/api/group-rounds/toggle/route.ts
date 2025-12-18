import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const { competition_id, group_id, round, is_open } = await req.json();

  if (!competition_id || !group_id || round === undefined) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { supabase, tenantId } = await createServerSupabase();

  /* 1️⃣ Usuário autenticado */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  /* 2️⃣ Verifica role */
  const { data: member } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  if (!member || !['admin', 'owner'].includes(member.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  /* 3️⃣ Atualiza rodada */
  const { error } = await supabase
    .from('group_rounds')
    .update({ is_open })
    .eq('competition_id', competition_id)
    .eq('group_id', group_id)
    .eq('round', round);

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar rodada' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
