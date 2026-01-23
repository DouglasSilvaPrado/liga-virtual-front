import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { recalcStandingsFromGroup } from '@/lib/standings/updateStandingsFromMatch';
import { tryAdvanceKnockout } from '@/lib/tryAdvanceKnockout';
import { normalizeCompetitionSettings } from '@/lib/competitionSettings';
import type { CompetitionSettingsData } from '@/@types/competition';
import { recalcStandingsFromLeague } from '@/lib/standings/recalcStandingsFromLeague';

type MatchPoints = { win: number; draw: number; loss: number };

// ✅ Tipagem sem any: match_settings “pode existir” e ter os campos de pontos
type MatchSettingsPoints = Partial<{
  pontos_vitoria: number;
  pontos_empate: number;
  pontos_derrota: number;
}>;

function getMatchPoints(settings: CompetitionSettingsData | null): MatchPoints {
  // Aqui a gente acessa pelo tipo “seguro” sem any:
  const ms: MatchSettingsPoints | undefined =
    settings && 'match_settings' in settings
      ? (settings as CompetitionSettingsData & { match_settings?: MatchSettingsPoints })
          .match_settings
      : undefined;

  return {
    win: typeof ms?.pontos_vitoria === 'number' ? ms.pontos_vitoria : 3,
    draw: typeof ms?.pontos_empate === 'number' ? ms.pontos_empate : 1,
    loss: typeof ms?.pontos_derrota === 'number' ? ms.pontos_derrota : 0,
  };
}

export async function POST(req: Request) {
  const body = await req.json();
  const { match_id, score_home, score_away, penalties_home, penalties_away } = body as {
    match_id?: string;
    score_home?: number;
    score_away?: number;
    penalties_home?: number | null;
    penalties_away?: number | null;
  };

  /* -------------------------------------------------- */
  /* 0️⃣ Validação básica                               */
  /* -------------------------------------------------- */
  const isSavingPenalties = penalties_home != null || penalties_away != null;

  if (!match_id) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  if (isSavingPenalties) {
    if (penalties_home == null || penalties_away == null) {
      return NextResponse.json({ error: 'Pênaltis incompletos' }, { status: 400 });
    }
  } else {
    if (score_home === undefined || score_away === undefined) {
      return NextResponse.json({ error: 'Placar inválido' }, { status: 400 });
    }
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
      leg,
      team_home,
      team_away,
      score_home,
      score_away,
      league_round_id
    `,
    )
    .eq('id', match_id)
    .eq('tenant_id', tenantId)
    .single<{
      id: string;
      competition_id: string;
      tenant_id: string;
      group_id: string | null;
      group_round_id: string | null;
      knockout_round_id: string | null;
      status: 'scheduled' | 'in_progress' | 'finished' | 'canceled' | string;
      is_locked: boolean | null;
      round: number | null;
      leg: number | null;
      team_home: string;
      team_away: string;
      score_home: number | null;
      score_away: number | null;
      league_round_id: string | null;
    }>();

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
      .single<{ is_open: boolean }>();

    if (!round?.is_open && !isAdminOrOwner) {
      return NextResponse.json({ error: 'Rodada fechada para edição' }, { status: 403 });
    }
  }

  /* -------------------------------------------------- */
  /* 5️⃣b Verifica rodada aberta (liga)                 */
  /* -------------------------------------------------- */
  if (match.league_round_id) {
    const { data: round } = await supabase
      .from('league_rounds')
      .select('is_open')
      .eq('id', match.league_round_id)
      .single<{ is_open: boolean }>();

    if (!round?.is_open && !isAdminOrOwner) {
      return NextResponse.json({ error: 'Rodada da liga fechada para edição' }, { status: 403 });
    }
  }

  /* -------------------------------------------------- */
  /* 6️⃣ Buscar settings (normalizado)                  */
  /* -------------------------------------------------- */
  const { data: competitionRow } = await supabase
    .from('competitions_with_settings')
    .select('settings')
    .eq('id', match.competition_id)
    .eq('tenant_id', tenantId)
    .single<{ settings: unknown }>();

  const settings = normalizeCompetitionSettings(competitionRow?.settings);
  const pts = getMatchPoints(settings);

  /* -------------------------------------------------- */
  /* 7️⃣ SALVA PÊNALTIS                                 */
  /* -------------------------------------------------- */
  if (penalties_home != null && penalties_away != null) {
    if (!match.knockout_round_id) {
      return NextResponse.json({ error: 'Pênaltis só no mata-mata' }, { status: 400 });
    }

    const { data: confrontos, error: confErr } = await supabase
      .from('matches')
      .select(
        `
        id,
        team_home,
        team_away,
        score_home,
        score_away,
        status,
        leg,
        penalties_home,
        penalties_away
      `,
      )
      .eq('knockout_round_id', match.knockout_round_id)
      .eq('tenant_id', tenantId)
      .in('team_home', [match.team_home, match.team_away])
      .in('team_away', [match.team_home, match.team_away]);

    if (confErr || !confrontos || confrontos.length === 0) {
      return NextResponse.json({ error: 'Confronto não encontrado' }, { status: 404 });
    }

    // ✅ Garantir que os jogos tenham terminado
    if (confrontos.some((m) => m.status !== 'finished' && m.id !== match.id)) {
      return NextResponse.json(
        { error: 'Finalize todos os jogos do confronto antes dos pênaltis' },
        { status: 400 },
      );
    }

    const teamA = match.team_home;
    const teamB = match.team_away;

    let golsA = 0;
    let golsB = 0;

    for (const m of confrontos) {
      if (m.score_home == null || m.score_away == null) continue;

      if (m.team_home === teamA) golsA += m.score_home;
      if (m.team_away === teamA) golsA += m.score_away;

      if (m.team_home === teamB) golsB += m.score_home;
      if (m.team_away === teamB) golsB += m.score_away;
    }

    if (golsA !== golsB) {
      return NextResponse.json(
        { error: 'Pênaltis só permitidos em caso de empate (no jogo ou no agregado)' },
        { status: 400 },
      );
    }

    const hasLeg2 = confrontos.some((m) => m.leg === 2);
    if (hasLeg2 && match.leg !== 2 && !isAdminOrOwner) {
      return NextResponse.json(
        { error: 'Pênaltis devem ser lançados no jogo de volta (leg 2)' },
        { status: 400 },
      );
    }

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

    if (settings) {
      await tryAdvanceKnockout({
        supabase,
        competitionId: match.competition_id,
        tenantId,
        settings,
      });
    }

    return NextResponse.json({ success: true });
  }

  /* -------------------------------------------------- */
  /* 8️⃣ SALVA PLACAR NORMAL                            */
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
  /* 9️⃣ Pós-processamento                              */
  /* -------------------------------------------------- */
  if (match.group_id) {
    await recalcStandingsFromGroup({
      supabase,
      competition_id: match.competition_id,
      tenant_id: tenantId,
      group_id: match.group_id,
      points: pts,
    });
  } else if (match.league_round_id) {
    // ✅ LIGA
    await recalcStandingsFromLeague({
      supabase,
      competition_id: match.competition_id,
      tenant_id: tenantId,
      points: pts,
    });

    // ✅ Se for DIVISÃO e acabou tudo (somente jogos da liga), define campeão e finaliza competição
    const { data: compInfo, error: compInfoErr } = await supabase
      .from('competitions')
      .select('type, status')
      .eq('id', match.competition_id)
      .eq('tenant_id', tenantId)
      .single<{ type: string; status: string }>();

    if (compInfoErr) {
      console.error('Erro lendo competitions:', compInfoErr);
      return NextResponse.json({ error: 'Erro lendo competição' }, { status: 500 });
    }

    if (compInfo?.type === 'divisao') {
      const [{ count: totalLeague, error: totalErr }, { count: finishedLeague, error: finErr }] =
        await Promise.all([
          supabase
            .from('matches')
            .select('id', { count: 'exact', head: true })
            .eq('competition_id', match.competition_id)
            .eq('tenant_id', tenantId)
            .is('knockout_round_id', null)
            .is('group_round_id', null)
            .is('group_id', null),

          supabase
            .from('matches')
            .select('id', { count: 'exact', head: true })
            .eq('competition_id', match.competition_id)
            .eq('tenant_id', tenantId)
            .is('knockout_round_id', null)
            .is('group_round_id', null)
            .is('group_id', null)
            .eq('status', 'finished'),
        ]);

      if (totalErr || finErr) {
        console.error('Erro contando matches da liga:', { totalErr, finErr });
        return NextResponse.json({ error: 'Erro contando jogos da liga' }, { status: 500 });
      }

      console.log('Finalização divisão - contagem:', { totalLeague, finishedLeague });

      if ((totalLeague ?? 0) > 0 && (finishedLeague ?? 0) === (totalLeague ?? 0)) {
        const { data: top, error: topErr } = await supabase
          .from('standings')
          .select('team_id, points, goal_diff, goals_scored')
          .eq('competition_id', match.competition_id)
          .eq('tenant_id', tenantId)
          .is('group_id', null)
          .order('points', { ascending: false })
          .order('goal_diff', { ascending: false })
          .order('goals_scored', { ascending: false })
          .limit(1)
          .maybeSingle<{
            team_id: string;
            points: number;
            goal_diff: number;
            goals_scored: number;
          }>();

        if (topErr) {
          console.error('Erro pegando líder standings:', topErr);
          return NextResponse.json(
            { error: 'Erro pegando líder da classificação' },
            { status: 500 },
          );
        }

        console.log('Líder detectado:', top);

        if (top?.team_id) {
          const { error: updErr } = await supabase
            .from('competitions')
            .update({
              champion_team_id: top.team_id,
              status: 'finished',
            })
            .eq('id', match.competition_id)
            .eq('tenant_id', tenantId);

          if (updErr) {
            console.error('Erro atualizando campeão/status na competitions:', updErr);
            return NextResponse.json(
              { error: `Não foi possível finalizar competição: ${updErr.message}` },
              { status: 500 },
            );
          }
        }
      }
    }
  } else {
    // ✅ MATA-MATA (ou outros)
    if (settings) {
      await tryAdvanceKnockout({
        supabase,
        competitionId: match.competition_id,
        tenantId,
        settings,
      });
    }
  }

  return NextResponse.json({ success: true });
}
