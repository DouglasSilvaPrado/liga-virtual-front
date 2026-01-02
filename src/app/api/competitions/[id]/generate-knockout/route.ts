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

  const qtdPorGrupo = specific.qtd_classifica_por_grupo;
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

  /* ───────── CLASSIFICADOS ───────── */

  const porGrupo: Record<string, StandingRow[]> = {};

  for (const s of standings) {
    porGrupo[s.group_id] ??= [];
    porGrupo[s.group_id].push(s);
  }

  let classificados: StandingRow[] = [];

  for (const g in porGrupo) {
    classificados.push(...porGrupo[g].slice(0, qtdPorGrupo));
  }

  if (classificados.length < 2) {
    return NextResponse.json({ error: 'Times insuficientes' }, { status: 400 });
  }

  classificados = chaveAutomatica === 'aleatorio' ? shuffle(classificados) : classificados;

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

  const totalTeams = classificados.length;
  const roundNumber = getInitialRound(totalTeams);

  /* ───────── 🔥 CRIA KNOCKOUT ROUND ───────── */

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

  /* ───────── MATCHES ───────── */

  const matches = [];

  for (let i = 0; i < classificados.length; i += 2) {
    const a = classificados[i];
    const b = classificados[i + 1];
    if (!a || !b) continue;

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
    jogos_criados: matches.length,
  });
}
