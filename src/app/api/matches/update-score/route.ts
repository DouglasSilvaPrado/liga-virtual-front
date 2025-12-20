import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { recalcStandingsFromGroup } from '@/lib/standings/updateStandingsFromMatch';
import { tryAdvanceKnockout } from '@/lib/tryAdvanceKnockout';

export async function POST(req: Request) {
  const { match_id, score_home, score_away } = await req.json();

  if (!match_id || score_home === undefined || score_away === undefined) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { supabase, tenantId } = await createServerSupabase();

  /* -------------------------------------------------- */
  /* 1️⃣ Usuário autenticado                            */
  /* -------------------------------------------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  /* -------------------------------------------------- */
  /* 2️⃣ Role no tenant                                 */
  /* -------------------------------------------------- */
  const { data: member, error: memberErr } = await supabase
    .from('tenant_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  if (memberErr || !member) {
    return NextResponse.json({ error: 'Acesso negado ao tenant' }, { status: 403 });
  }

  const isAdminOrOwner = member.role === 'admin' || member.role === 'owner';

  /* -------------------------------------------------- */
  /* 3️⃣ Busca partida                                  */
  /* -------------------------------------------------- */
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select(
      `
      id,
      competition_id,
      tenant_id,
      group_id,
      group_round_id,
      is_final,
      status
    `,
    )
    .eq('id', match_id)
    .eq('tenant_id', tenantId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 });
  }

  /* -------------------------------------------------- */
  /* 4️⃣ Bloqueio se já finalizada                      */
  /* -------------------------------------------------- */
  if (match.status === 'finished' && !isAdminOrOwner) {
    return NextResponse.json({ error: 'Partida já finalizada' }, { status: 403 });
  }

  /* -------------------------------------------------- */
  /* 5️⃣ Verifica rodada aberta                         */
  /* -------------------------------------------------- */
  if (match.group_round_id) {
    const { data: round, error: roundErr } = await supabase
      .from('group_rounds')
      .select('is_open')
      .eq('id', match.group_round_id)
      .single();

    if (roundErr || !round) {
      return NextResponse.json({ error: 'Rodada não encontrada' }, { status: 404 });
    }

    if (!round.is_open && !isAdminOrOwner) {
      return NextResponse.json({ error: 'Rodada fechada para edição' }, { status: 403 });
    }
  }

  /* -------------------------------------------------- */
  /* 6️⃣ Atualiza placar                                */
  /* -------------------------------------------------- */
  const { data: updatedMatch, error } = await supabase
    .from('matches')
    .update({
      score_home,
      score_away,
      status: 'finished',
      updated_at: new Date().toISOString(),
    })
    .eq('id', match_id)
    .eq('tenant_id', tenantId)
    .select(
      `
      competition_id,
      tenant_id,
      team_home,
      team_away,
      score_home,
      score_away,
      status
    `,
    )
    .single();

  const { data: competition } = await supabase
    .from('competitions_with_settings')
    .select('settings')
    .eq('id', match.competition_id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !updatedMatch) {
    return NextResponse.json({ error: 'Erro ao salvar placar' }, { status: 500 });
  }

  /* -------------------------------------------------- */
  /* 7️⃣ Recalcula classificação do grupo               */
  /* -------------------------------------------------- */
  if (match.group_id) {
    // 🔵 FASE DE GRUPOS
    await recalcStandingsFromGroup({
      supabase,
      competition_id: match.competition_id,
      tenant_id: tenantId,
      group_id: match.group_id,
    });
  } else {
    // 🔴 MATA-MATA
    if (competition?.settings) {
      await tryAdvanceKnockout({
        supabase,
        competitionId: match.competition_id,
        tenantId,
        settings: competition.settings,
      });
    }
  }
  return NextResponse.json({ success: true });
}
