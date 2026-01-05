import { createServerSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

type StandingRow = {
  team_id: string;
  group_id: string;
  points: number;
  goal_diff: number;
  goals_scored: number;
};

/* ───────────────────────── HELPERS ───────────────────────── */

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function getInitialRound(totalTeams: number): number {
  return Math.log2(totalTeams);
}

/* ───────────────────────── API ───────────────────────── */

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = await context.params;
  const { supabase, tenantId } = await createServerSupabase();

  /* ───────── AUTH ───────── */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

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

  /* ───────── VERIFICA GRUPOS ───────── */

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

  /* ───────── SETTINGS ───────── */

  const { data: competition } = await supabase
    .from('competitions_with_settings')
    .select('settings')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!competition?.settings) {
    return NextResponse.json({ error: 'Configurações não encontradas' }, { status: 400 });
  }

  const specific = competition.settings.specific ?? {};

  const qtdPorGrupo = specific.qtd_classifica_por_grupo ?? 2;
  const chaveAutomatica = specific.chave_automatica ?? 'aleatorio';
  const idaVolta = specific.mata_em_ida_e_volta ?? false;

  /* ───────── CLASSIFICAÇÃO ───────── */

  const { data: standings } = await supabase
    .from('standings')
    .select('team_id, group_id, points, goal_diff, goals_scored')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('points', { ascending: false })
    .order('goal_diff', { ascending: false })
    .order('goals_scored', { ascending: false });

  if (!standings?.length) {
    return NextResponse.json({ error: 'Classificação vazia' }, { status: 400 });
  }

  /* ───────── AGRUPA POR GRUPO ───────── */

  const porGrupo: Record<string, StandingRow[]> = {};

  for (const s of standings) {
    porGrupo[s.group_id] ??= [];
    porGrupo[s.group_id].push(s);
  }

  const grupos = Object.values(porGrupo);

  if (grupos.length < 2) {
    return NextResponse.json({ error: 'Mata-mata exige no mínimo 2 grupos' }, { status: 400 });
  }

  /* ───────── GERA CONFRONTOS ───────── */

  const confrontos: { a: StandingRow; b: StandingRow }[] = [];

  if (chaveAutomatica === 'melhor_x_pior') {
    const melhores = grupos.map((g) => g[0]);
    const piores = grupos.map((g) => g[qtdPorGrupo - 1]).reverse();

    for (let i = 0; i < melhores.length; i++) {
      const a = melhores[i];
      const b = piores[i];

      if (!a || !b || a.group_id === b.group_id) {
        return NextResponse.json(
          { error: 'Erro ao gerar chaveamento melhor x pior' },
          { status: 400 },
        );
      }

      confrontos.push({ a, b });
    }
  } else {
    // aleatório / padrão
    let classificados: StandingRow[] = [];

    for (const g of grupos) {
      classificados.push(...g.slice(0, qtdPorGrupo));
    }

    classificados = shuffle(classificados);

    for (let i = 0; i < classificados.length; i += 2) {
      if (classificados[i + 1]) {
        confrontos.push({
          a: classificados[i],
          b: classificados[i + 1],
        });
      }
    }
  }

  if (!confrontos.length) {
    return NextResponse.json({ error: 'Nenhum confronto gerado' }, { status: 400 });
  }

  /* ───────── COMPETITION ───────── */

  const { data: comp } = await supabase
    .from('competitions')
    .select('championship_id')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!comp) {
    return NextResponse.json({ error: 'Competição inválida' }, { status: 400 });
  }

  const totalTeams = confrontos.length * 2;
  const roundNumber = getInitialRound(totalTeams);

  /* ───────── CRIA KNOCKOUT ROUND ───────── */

  const roundName =
    roundNumber === 1
      ? 'Final'
      : roundNumber === 2
        ? 'Semifinal'
        : roundNumber === 3
          ? 'Quartas'
          : roundNumber === 4
            ? 'Oitavas'
            : `Fase ${roundNumber}`;

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
    .select()
    .single();

  if (roundError || !round) {
    console.error(roundError);
    return NextResponse.json({ error: 'Erro ao criar rodada' }, { status: 500 });
  }

  /* ───────── CRIA PARTIDAS ───────── */

  const matches = [];

  for (const { a, b } of confrontos) {
    matches.push({
      competition_id: competitionId,
      championship_id: comp.championship_id,
      tenant_id: tenantId,
      knockout_round_id: round.id,
      team_home: a.team_id,
      team_away: b.team_id,
      round: roundNumber,
      leg: 1,
      status: 'scheduled',
    });

    if (idaVolta) {
      matches.push({
        competition_id: competitionId,
        championship_id: comp.championship_id,
        tenant_id: tenantId,
        knockout_round_id: round.id,
        team_home: b.team_id,
        team_away: a.team_id,
        round: roundNumber,
        leg: 2,
        status: 'scheduled',
      });
    }
  }

  const { error: matchError } = await supabase.from('matches').insert(matches);

  if (matchError) {
    return NextResponse.json({ error: 'Erro ao criar jogos' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    fase_inicial: roundNumber,
    confrontos: confrontos.length,
    jogos_criados: matches.length,
  });
}
