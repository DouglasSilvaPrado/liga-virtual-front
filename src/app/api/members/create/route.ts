import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { tenantId, email, password, role } = body;

    if (!tenantId || !email || !password) {
      return NextResponse.json(
        { error: 'tenantId, email e password são obrigatórios.' },
        { status: 400 },
      );
    }

    // ----------------------------------------------------------
    // 1. Criar usuário no Supabase Auth (ignora RLS automaticamente)
    // ----------------------------------------------------------
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // ----------------------------------------------------------
    // 2. Inserir no tenant_members com service_role (bypass RLS)
    // ----------------------------------------------------------
    const { error: memberError } = await supabaseAdmin.from('tenant_members').insert({
      tenant_id: tenantId,
      user_id: userId,
      role: role || 'member',
    });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'Membro criado com sucesso.',
        user_id: userId,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
