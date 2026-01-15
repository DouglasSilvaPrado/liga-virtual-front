import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateLeagueMatches } from '@/lib/generateLeagueMatches';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = await params;

  const { supabase, tenantId } = await createServerSupabase();
  const supabaseAuth = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // ✅ Permissão: admin/owner
  const { data: member } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  const isAdminOrOwner = member?.role === 'admin' || member?.role === 'owner';
  if (!isAdminOrOwner) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  // ✅ Evitar duplicação: se já tem match, não gera
  const { count: matchesCount, error: countErr } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('competition_id', competitionId);

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 400 });
  if ((matchesCount ?? 0) > 0) {
    return NextResponse.json({ error: 'Já existem partidas para esta liga.' }, { status: 400 });
  }

  // ✅ Busca competition + settings (ida_volta) + championship_id
  const { data: comp, error: compErr } = await supabase
    .from('competitions_with_settings')
    .select('id, championship_id, settings')
    .eq('tenant_id', tenantId)
    .eq('id', competitionId)
    .single();

  if (compErr || !comp)
    return NextResponse.json({ error: 'Competição não encontrada' }, { status: 404 });

  const idaVolta = !!comp.settings?.specific?.ida_volta; // ajuste se seu path for outro

  // ✅ Busca times da competição
  const { data: teams, error: teamErr } = await supabase
    .from('competition_teams')
    .select('team_id')
    .eq('tenant_id', tenantId)
    .eq('competition_id', competitionId);

  if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 400 });

  const teamIds = (teams ?? []).map((t) => t.team_id).filter(Boolean);

  if (teamIds.length < 2) {
    return NextResponse.json(
      { error: 'Adicione pelo menos 2 times para gerar o calendário.' },
      { status: 400 },
    );
  }

  // ✅ Gera calendário (com league_rounds e league_round_id nos matches)
  const result = await generateLeagueMatches({
    supabase,
    tenantId,
    competitionId,
    championshipId: comp.championship_id,
    teamIds,
    idaVolta,
  });

  // (Opcional) abrir a rodada 1 automaticamente
  await supabase
    .from('league_rounds')
    .update({ is_open: true })
    .eq('tenant_id', tenantId)
    .eq('competition_id', competitionId)
    .eq('round', 1);

  return NextResponse.json({ ok: true, result });
}
