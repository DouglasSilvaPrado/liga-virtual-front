import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { competition_id, round, is_open } = await req.json();

  const { supabase, tenantId } = await createServerSupabase();
  const supabaseAuth = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // valida role
  const { data: member } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  const isAdminOrOwner = member?.role === 'admin' || member?.role === 'owner';
  if (!isAdminOrOwner) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { error } = await supabase
    .from('league_rounds')
    .update({ is_open })
    .eq('tenant_id', tenantId)
    .eq('competition_id', competition_id)
    .eq('round', round);

  if (error) return NextResponse.json({ error: 'Erro ao atualizar rodada' }, { status: 400 });

  return NextResponse.json({ ok: true });
}
