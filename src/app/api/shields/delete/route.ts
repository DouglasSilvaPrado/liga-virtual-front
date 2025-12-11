import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Shield ID não informado.' }, { status: 400 });
    }

    // pegando igual ao update
    const { supabase } = await createServerSupabase();

    // --- 1) Verifica usuário logado ---
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // --- 2) Pega tenant_member do usuário ---
    const { data: member, error: memberErr } = await supabase
      .from('tenant_members')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Usuário não pertence a nenhum tenant.' }, { status: 403 });
    }

    // --- 3) Busca o shield ---
    const { data: shield, error: shieldErr } = await supabase
      .from('shields')
      .select('*')
      .eq('id', id)
      .single();

    if (shieldErr || !shield) {
      return NextResponse.json({ error: 'Escudo não encontrado.' }, { status: 404 });
    }

    // --- 4) Regras de permissão ---
    const isCreator = shield.tenant_member_id === member.id;
    const isOwner = member.role === 'owner';

    if (!isCreator && !isOwner) {
      return NextResponse.json(
        { error: 'Você não tem permissão para excluir este escudo.' },
        { status: 403 },
      );
    }

    // --- 5) Excluir ---
    const { error: deleteErr } = await supabase.from('shields').delete().eq('id', id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
