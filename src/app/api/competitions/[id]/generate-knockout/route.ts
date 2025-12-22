import { createServerSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

type StandingRow = {
  team_id: string;
  group_id: string;
  championship_id: string;
  points: number;
  goal_diff: number;
  goals_scored: number;
};

/* ───────────────────────── HELPERS ───────────────────────── */

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function getInitialRound(totalTeams: number): number {
  /**
   * totalTeams = 16 → oitavas (round 1)
   * totalTeams = 8  → quartas (round 2)
   * totalTeams = 4  → semi (round 3)
   * totalTeams = 2  → final (round 4)
   */
  return Math.log2(totalTeams);
}

/* ───────────────────────── API ───────────────────────── */

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = await context.params;
  const { supabase, tenantId } = await createServerSupabase();

  /* ───────────────────────── 🔐 AUTH ───────────────────────── */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  /* ───────────────────────── 🔐 TENANT + ROLE ───────────────────────── */

  const { data: member } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
    return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
  }

  /* ───────────────────────── ⛔ VERIFICA GRUPOS FINALIZADOS ───────────────────────── */

  const { count: openGroupMatches } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .not('group_round_id', 'is', null)
    .neq('status', 'finished');

  if ((openGroupMatches ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Ainda existem jogos da fase de grupos em aberto' },
      { status: 400 },
    );
  }

  /* ───────────────────────── 📖 SETTINGS ───────────────────────── */

  const { data: competition } = await supabase
    .from('competitions_with_settings')
    .select('settings')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!competition?.settings) {
    return NextResponse.json(
      { error: 'Configurações da competição não encontradas' },
      { status: 400 },
    );
  }

  const specific = competition.settings.specific ?? {};

  const qtdPorGrupo: number = specific.qtd_classifica_por_grupo;
  const chaveAutomatica: 'aleatorio' | 'cruzado' = specific.chave_automatica ?? 'aleatorio';
  const idaVolta: boolean = specific.mata_em_ida_e_volta ?? false;

  if (!qtdPorGrupo || qtdPorGrupo < 1) {
    return NextResponse.json({ error: 'Configuração inválida de classificação' }, { status: 400 });
  }

  /* ───────────────────────── 📊 CLASSIFICAÇÃO ───────────────────────── */

  const { data: standings } = await supabase
    .from('standings')
    .select(
      `
      team_id,
      group_id,
      points,
      goal_diff,
      goals_scored
    `,
    )
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('points', { ascending: false })
    .order('goal_diff', { ascending: false })
    .order('goals_scored', { ascending: false });

  if (!standings || standings.length === 0) {
    return NextResponse.json({ error: 'Classificação não encontrada' }, { status: 400 });
  }

  /* ───────────────────────── 🏆 CLASSIFICADOS POR GRUPO ───────────────────────── */

  const classificadosPorGrupo: Record<string, StandingRow[]> = {};

  for (const s of standings as StandingRow[]) {
    if (!s.group_id) continue;

    classificadosPorGrupo[s.group_id] ??= [];
    classificadosPorGrupo[s.group_id].push(s);
  }

  let classificados: StandingRow[] = [];

  for (const groupId in classificadosPorGrupo) {
    classificados.push(...classificadosPorGrupo[groupId].slice(0, qtdPorGrupo));
  }

  if (classificados.length < 2) {
    return NextResponse.json({ error: 'Times insuficientes para o mata-mata' }, { status: 400 });
  }

  /* ───────────────────────── 🔀 ORDENA CLASSIFICADOS ───────────────────────── */

  if (chaveAutomatica === 'aleatorio') {
    classificados = shuffle(classificados);
  } else {
    // cruzado genérico: 1ºs x últimos
    const ordenados = [...classificados];
    classificados = [];

    while (ordenados.length >= 2) {
      classificados.push(ordenados.shift()!, ordenados.pop()!);
    }
  }

  /* ───────────────────────── ⚽ GERA CONFRONTOS ───────────────────────── */

  const { data: dataCompetition } = await supabase
    .from('competitions')
    .select('championship_id')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!dataCompetition) {
    return NextResponse.json({ error: 'Competição não encontrada' }, { status: 400 });
  }

  const totalTeams = classificados.length;
  const roundNumber = getInitialRound(totalTeams);

  const matchesToInsert: any[] = [];

  for (let i = 0; i < classificados.length; i += 2) {
    const home = classificados[i];
    const away = classificados[i + 1];

    if (!home || !away) continue;

    // JOGO DE IDA
    matchesToInsert.push({
      competition_id: competitionId,
      championship_id: dataCompetition.championship_id,
      tenant_id: tenantId,
      team_home: home.team_id,
      team_away: away.team_id,
      round: roundNumber,
      leg: 1,
      status: 'scheduled',
      group_id: null,
      group_round_id: null,
      is_final: totalTeams === 2,
    });

    // JOGO DE VOLTA
    if (idaVolta) {
      matchesToInsert.push({
        competition_id: competitionId,
        championship_id: dataCompetition.championship_id,
        tenant_id: tenantId,
        team_home: away.team_id,
        team_away: home.team_id,
        round: roundNumber,
        leg: 2,
        status: 'scheduled',
        group_id: null,
        group_round_id: null,
        is_final: totalTeams === 2,
      });
    }
  }

  /* ───────────────────────── 💾 INSERT ───────────────────────── */

  const { error: insertError } = await supabase.from('matches').insert(matchesToInsert);

  if (insertError) {
    console.error(insertError);
    return NextResponse.json({ error: 'Erro ao criar jogos do mata-mata' }, { status: 500 });
  }

  /* ───────────────────────── 📝 LOG ───────────────────────── */

  await supabase.from('activity_logs').insert({
    tenant_id: tenantId,
    user_id: user.id,
    action: 'generate_knockout',
    metadata: {
      competition_id: competitionId,
      total_classificados: classificados.length,
      round: roundNumber,
      ida_volta: idaVolta,
    },
  });

  return NextResponse.json({
    success: true,
    fase_inicial: roundNumber,
    jogos_criados: matchesToInsert.length,
  });
}
