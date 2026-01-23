import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { normalizeCompetitionSettings } from '@/lib/competitionSettings';
import type { CompetitionSettingsData } from '@/@types/competition';

type StandingRow = {
  team_id: string;
  points: number;
  goal_diff: number;
  goals_scored: number;
};

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function isPowerOfTwo(n: number) {
  return n > 1 && (n & (n - 1)) === 0;
}

function getInitialRound(totalTeams: number): number {
  // 4->2 (semi), 8->3 (quartas), 16->4 (oitavas) ... usando seu padrão
  return Math.log2(totalTeams);
}

function getRoundName(roundNumber: number) {
  return roundNumber === 1
    ? 'Final'
    : roundNumber === 2
      ? 'Semifinal'
      : roundNumber === 3
        ? 'Quartas'
        : roundNumber === 4
          ? 'Oitavas'
          : `Fase ${roundNumber}`;
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = await context.params;
  const { supabase, tenantId } = await createServerSupabase();

  /* ───────── AUTH ───────── */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  /* ───────── ROLE ───────── */
  const { data: member } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  if (!member || !['admin', 'owner'].includes(member.role)) {
    return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
  }

  /* ───────── COMPETITION TYPE ───────── */
  const { data: compRow } = await supabase
    .from('competitions')
    .select('type, status, championship_id')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single<{ type: string; status: string; championship_id: string }>();

  if (!compRow) return NextResponse.json({ error: 'Competição inválida' }, { status: 400 });

  if (compRow.status === 'finished') {
    return NextResponse.json({ error: 'Competição já finalizada' }, { status: 409 });
  }

  if (compRow.type !== 'divisao_mata') {
    return NextResponse.json(
      { error: 'Este endpoint é apenas para competições do tipo divisao_mata' },
      { status: 400 },
    );
  }

  /* ───────── NÃO DUPLICAR MATA-MATA ───────── */
  const { count: knockoutCount } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .not('knockout_round_id', 'is', null);

  if ((knockoutCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Mata-mata já foi gerado para esta competição.' },
      { status: 409 },
    );
  }

  /* ───────── DIVISÃO PRECISA ESTAR FINALIZADA ───────── */
  const { count: openLeagueMatches } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .is('knockout_round_id', null) // só jogos da divisão
    .neq('status', 'finished');

  if ((openLeagueMatches ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Ainda existem jogos da divisão em aberto' },
      { status: 400 },
    );
  }

  /* ───────── SETTINGS ───────── */
  const { data: compSettings } = await supabase
    .from('competitions_with_settings')
    .select('settings')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single<{ settings: unknown }>();

  const settings = normalizeCompetitionSettings(compSettings?.settings);

  if (!settings) {
    return NextResponse.json({ error: 'Configurações não encontradas' }, { status: 400 });
  }

  const specific = settings.specific ?? ({} as CompetitionSettingsData['specific']);

  const qtdClassifica =
    typeof (specific as { qtd_classifica?: number }).qtd_classifica === 'number'
      ? (specific as { qtd_classifica: number }).qtd_classifica
      : 4;

  const chaveAutomatica =
    (specific as { chave_automatica?: string }).chave_automatica ?? 'melhor_x_pior';

  const idaVolta = (specific as { mata_em_ida_e_volta?: boolean }).mata_em_ida_e_volta === true;

  if (qtdClassifica < 2 || qtdClassifica % 2 !== 0) {
    return NextResponse.json(
      { error: 'qtd_classifica deve ser par (ex: 4, 8, 16...)' },
      { status: 400 },
    );
  }

  if (!isPowerOfTwo(qtdClassifica)) {
    return NextResponse.json(
      { error: 'qtd_classifica deve ser potência de 2 (4, 8, 16...)' },
      { status: 400 },
    );
  }

  /* ───────── STANDINGS (LIGA = group_id null) ───────── */
  const { data: standings } = await supabase
    .from('standings')
    .select('team_id, points, goal_diff, goals_scored')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .is('group_id', null)
    .order('points', { ascending: false })
    .order('goal_diff', { ascending: false })
    .order('goals_scored', { ascending: false })
    .returns<StandingRow[]>();

  if (!standings?.length) {
    return NextResponse.json({ error: 'Classificação vazia' }, { status: 400 });
  }

  const classificados = standings.slice(0, qtdClassifica);

  if (classificados.length !== qtdClassifica) {
    return NextResponse.json(
      { error: `Classificação insuficiente. Esperado top ${qtdClassifica}.` },
      { status: 400 },
    );
  }

  /* ───────── CONFRONTOS ───────── */
  const confrontos: { a: StandingRow; b: StandingRow }[] = [];

  if (chaveAutomatica === 'melhor_x_pior') {
    for (let i = 0; i < classificados.length / 2; i++) {
      confrontos.push({ a: classificados[i], b: classificados[classificados.length - 1 - i] });
    }
  } else {
    const s = shuffle(classificados);
    for (let i = 0; i < s.length; i += 2) confrontos.push({ a: s[i], b: s[i + 1] });
  }

  if (!confrontos.length) {
    return NextResponse.json({ error: 'Nenhum confronto gerado' }, { status: 400 });
  }

  /* ───────── KNOCKOUT ROUND ───────── */
  const totalTeams = confrontos.length * 2;
  const roundNumber = getInitialRound(totalTeams);
  const roundName = getRoundName(roundNumber);

  const { data: round, error: roundError } = await supabase
    .from('knockout_rounds')
    .insert({
      competition_id: competitionId,
      tenant_id: tenantId,
      round_number: roundNumber,
      name: roundName,
      is_current: true,
      is_finished: false,
    })
    .select('id')
    .single<{ id: string }>();

  if (roundError || !round) {
    console.error(roundError);
    return NextResponse.json({ error: 'Erro ao criar rodada do mata-mata' }, { status: 500 });
  }

  /* ───────── MATCHES ───────── */
  const matchesToInsert: Array<{
    competition_id: string;
    championship_id: string;
    tenant_id: string;
    knockout_round_id: string;
    team_home: string;
    team_away: string;
    round: number;
    leg: 1 | 2 | null;
    status: 'scheduled';
    group_id: null;
    group_round_id: null;
    league_round_id: null;
  }> = [];

  for (const { a, b } of confrontos) {
    // Jogo 1
    matchesToInsert.push({
      competition_id: competitionId,
      championship_id: compRow.championship_id,
      tenant_id: tenantId,
      knockout_round_id: round.id,
      team_home: a.team_id,
      team_away: b.team_id,
      round: roundNumber,
      leg: idaVolta ? 1 : null,
      status: 'scheduled',
      group_id: null,
      group_round_id: null,
      league_round_id: null,
    });

    // Jogo 2 (volta)
    if (idaVolta) {
      matchesToInsert.push({
        competition_id: competitionId,
        championship_id: compRow.championship_id,
        tenant_id: tenantId,
        knockout_round_id: round.id,
        team_home: b.team_id,
        team_away: a.team_id,
        round: roundNumber,
        leg: 2,
        status: 'scheduled',
        group_id: null,
        group_round_id: null,
        league_round_id: null,
      });
    }
  }

  const { error: matchError } = await supabase.from('matches').insert(matchesToInsert);

  if (matchError) {
    console.error(matchError);
    return NextResponse.json({ error: 'Erro ao criar jogos do mata-mata' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    classificados: qtdClassifica,
    confrontos: confrontos.length,
    jogos_criados: matchesToInsert.length,
    round_number: roundNumber,
    round_name: roundName,
    ida_volta: idaVolta,
  });
}
