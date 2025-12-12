import { createServerSupabase } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { tenant_id, championship_id, shield_id, tenant_member_id, name } = body;

    if (!tenant_id || !championship_id || !shield_id || !tenant_member_id || !name) {
      return NextResponse.json(
        {
          error:
            'Campos tenant_id, championship_id, shield_id, tenant_member_id e name são obrigatórios.',
        },
        { status: 400 },
      );
    }

    const { supabase } = await createServerSupabase();

    const { error } = await supabase.from('teams').insert({
      ...body,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'Time criado com sucesso.',
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
