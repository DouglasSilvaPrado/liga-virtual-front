import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { generateKnockoutMatches } from '@/lib/generateKnockoutMatches';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { competition_id, championship_id } = body;

    if (!competition_id || !championship_id) {
      return NextResponse.json(
        { error: 'competition_id e championship_id são obrigatórios' },
        { status: 400 },
      );
    }

    const { supabase, tenantId } = await createServerSupabase();

    await generateKnockoutMatches({
      supabase,
      tenantId,
      competitionId: competition_id,
      championshipId: championship_id,
      classificadosPorGrupo: 2, // vem do settings depois
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro ao gerar mata-mata' }, { status: 500 });
  }
}
