import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { recalcStandingsFromGroup } from '@/lib/standings/updateStandingsFromMatch';
import { tryAdvanceKnockout } from '@/lib/tryAdvanceKnockout';

export async function POST(req: Request) {
  const { match_id, score_home, score_away, penalties_home, penalties_away } = await req.json();

  /* -------------------------------------------------- */
  /* 0️⃣ Validação básica                               */
  /* -------------------------------------------------- */
  if (
    !match_id ||
    (score_home === undefined && (penalties_home === undefined || penalties_away === undefined))
  ) {
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
    .select('role')
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
      knockout_round_id,
      status,
      is_locked,
      round,
      team_home,
      team_away
    `,
    )
    .eq('id', match_id)
    .eq('tenant_id', tenantId)
    .single();
  console.log('🚀 ~ POST ~ match:', match);

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 });
  }

  /* -------------------------------------------------- */
  /* 4️⃣ Bloqueios                                      */
  /* -------------------------------------------------- */
  if (match.is_locked && !isAdminOrOwner) {
    return NextResponse.json({ error: 'Partida já encerrada' }, { status: 409 });
  }

  /* -------------------------------------------------- */
  /* 5️⃣ Verifica rodada aberta (fase de grupos)        */
  /* -------------------------------------------------- */
  if (match.group_round_id) {
    const { data: round } = await supabase
      .from('group_rounds')
      .select('is_open')
      .eq('id', match.group_round_id)
      .single();

    if (!round?.is_open && !isAdminOrOwner) {
      return NextResponse.json({ error: 'Rodada fechada para edição' }, { status: 403 });
    }
  }

  /* -------------------------------------------------- */
  /* 6️⃣ SALVA PÊNALTIS (agregado)                       */
  /* -------------------------------------------------- */
  if (penalties_home != null && penalties_away != null) {
    // 🔎 Buscar todos os jogos do confronto (ida/volta)
    const { data: confrontos, error: confErr } = await supabase
      .from('matches')
      .select(
        `
    id,
    team_home,
    team_away,
    score_home,
    score_away,
    leg
  `,
      )
      .eq('knockout_round_id', match.knockout_round_id)
      .eq('tenant_id', tenantId)
      .in('team_home', [match.team_home, match.team_away])
      .in('team_away', [match.team_home, match.team_away]);

    console.log('🚀 ~ POST ~ confrontos:', confrontos);

    if (confErr || !confrontos || confrontos.length === 0) {
      return NextResponse.json({ error: 'Confronto não encontrado' }, { status: 404 });
    }

    // 🧮 Calcula agregado
    let golsA = 0;
    let golsB = 0;

    for (const m of confrontos) {
      if (m.score_home == null || m.score_away == null) continue;

      if (m.team_home === match.team_home) {
        golsA += m.score_home;
        golsB += m.score_away;
      } else {
        golsA += m.score_away;
        golsB += m.score_home;
      }
    }

    // ❌ NÃO é empate no agregado
    if (golsA !== golsB) {
      return NextResponse.json(
        { error: 'Pênaltis só permitidos em caso de empate no agregado' },
        { status: 400 },
      );
    }

    // ✅ Salva pênaltis e trava edição
    const { error: penErr } = await supabase
      .from('matches')
      .update({
        penalties_home,
        penalties_away,
        status: 'finished',
        is_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match_id)
      .eq('tenant_id', tenantId);

    if (penErr) {
      return NextResponse.json({ error: 'Erro ao salvar pênaltis' }, { status: 500 });
    }

    // 🔴 Avança mata-mata
    const { data: competition } = await supabase
      .from('competitions_with_settings')
      .select('settings')
      .eq('id', match.competition_id)
      .eq('tenant_id', tenantId)
      .single();

    if (competition?.settings) {
      await tryAdvanceKnockout({
        supabase,
        competitionId: match.competition_id,
        tenantId,
        settings: competition.settings,
      });
    }

    return NextResponse.json({ success: true });
  }

  /* -------------------------------------------------- */
  /* 7️⃣ SALVA PLACAR NORMAL                            */
  /* -------------------------------------------------- */
  const { error: scoreErr } = await supabase
    .from('matches')
    .update({
      score_home,
      score_away,
      status: 'finished',
      updated_at: new Date().toISOString(),
    })
    .eq('id', match_id)
    .eq('tenant_id', tenantId);

  if (scoreErr) {
    return NextResponse.json({ error: 'Erro ao salvar placar' }, { status: 500 });
  }

  /* -------------------------------------------------- */
  /* 8️⃣ Pós-processamento                              */
  /* -------------------------------------------------- */
  if (match.group_id) {
    // 🔵 Fase de grupos
    await recalcStandingsFromGroup({
      supabase,
      competition_id: match.competition_id,
      tenant_id: tenantId,
      group_id: match.group_id,
    });
  } else {
    // 🔴 Mata-mata
    const { data: competition } = await supabase
      .from('competitions_with_settings')
      .select('settings')
      .eq('id', match.competition_id)
      .eq('tenant_id', tenantId)
      .single();

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
