import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const body = await req.json();
  const {
    user_id,
    tenant_member_id,
    full_name,
    avatar_url,
    platform,
    country,
    birth_date,
    whatsapp,
    state,
    city,
    role,
  } = body;

  // pega o client
  const { supabase } = await createServerSupabase();

  // pega o usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // 1) Buscar o tenant_member do usuário logado para saber se ele é owner
  const { data: myMember } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const isOwner = myMember?.role === 'owner';

  // 2) Atualizar PROFILE
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name,
      avatar_url,
      platform,
      country,
      birth_date,
      whatsapp,
      state,
      city,
    })
    .eq('id', user_id);

  if (profileError) {
    return NextResponse.json({ error: profileError }, { status: 400 });
  }

  // 3) Atualizar ROLE — mas somente se for OWNER
  if (role && isOwner) {
    const { error: roleError } = await supabase
      .from('tenant_members')
      .update({ role })
      .eq('id', tenant_member_id);

    if (roleError) {
      return NextResponse.json({ error: roleError }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
