import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: 'Shield ID is required' }, { status: 400 });
  }

  const { supabase } = await createServerSupabase();

  // --- 1) Verifica usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // --- 2) Descobre tenant_member_id do usuário
  const { data: member, error: memberErr } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (memberErr || !member) {
    return NextResponse.json({ error: 'User is not in any tenant' }, { status: 403 });
  }

  const tenant_member_id = member.id;

  // --- 3) Busca shield e valida ownership
  const { data: existing, error: getErr } = await supabase
    .from('shields')
    .select('tenant_member_id')
    .eq('id', id)
    .single();

  if (getErr || !existing) {
    return NextResponse.json({ error: 'Shield not found' }, { status: 404 });
  }

  if (existing.tenant_member_id !== tenant_member_id) {
    return NextResponse.json(
      { error: 'You do not have permission to edit this shield' },
      { status: 403 },
    );
  }

  // --- 4) Atualiza o shield
  const { error: updateErr } = await supabase.from('shields').update(fields).eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
