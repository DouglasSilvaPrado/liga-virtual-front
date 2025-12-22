import { CompetitionSettingsData } from '@/@types/competition';

/* ───────────────────────────────────────────── */
/* 🔎 Helpers                                    */
/* ───────────────────────────────────────────── */

function hasIdaVolta(specific: unknown): specific is { jogos_ida_volta: boolean } {
  return (
    typeof specific === 'object' &&
    specific !== null &&
    'jogos_ida_volta' in specific &&
    typeof (specific as any).jogos_ida_volta === 'boolean'
  );
}

function isIdaVolta(settings: CompetitionSettingsData): boolean {
  return hasIdaVolta(settings.specific) ? settings.specific.jogos_ida_volta : false;
}

type Match = {
  id: string;
  round: number;
  leg: number;
  team_home: string;
  team_away: string;
  score_home: number;
  score_away: number;
  status: 'scheduled' | 'finished';
};

/* ───────────────────────────────────────────── */
/* 🧮 Calcula vencedor do confronto               */
/* ───────────────────────────────────────────── */

function getWinnerFromConfronto(matches: Match[], idaVolta: boolean): string | null {
  if (!idaVolta) {
    const m = matches[0];
    if (m.score_home > m.score_away) return m.team_home;
    if (m.score_away > m.score_home) return m.team_away;
    return null; // empate (futuro: pênaltis)
  }

  if (matches.length < 2) return null;

  const [m1, m2] = matches;

  let goalsA = 0;
  let goalsB = 0;

  // time A = team_home do primeiro jogo
  const teamA = m1.team_home;
  const teamB = m1.team_away;

  for (const m of matches) {
    if (m.team_home === teamA) {
      goalsA += m.score_home;
      goalsB += m.score_away;
    } else {
      goalsA += m.score_away;
      goalsB += m.score_home;
    }
  }

  if (goalsA > goalsB) return teamA;
  if (goalsB > goalsA) return teamB;

  return null; // empate agregado
}

/* ───────────────────────────────────────────── */
/* 🔁 Avanço automático do mata-mata              */
/* ───────────────────────────────────────────── */

export async function tryAdvanceKnockout({
  competitionId,
  tenantId,
  supabase,
  settings,
}: {
  competitionId: string;
  tenantId: string;
  supabase: any;
  settings: CompetitionSettingsData;
}) {
  const idaVolta = isIdaVolta(settings);

  /* 1️⃣ Descobre a rodada MAIS ALTA existente (ex: 3 = Quartas) */
  const { data: lastRound } = await supabase
    .from('matches')
    .select('round')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .is('group_id', null)
    .order('round', { ascending: false })
    .limit(1)
    .single();

  if (!lastRound?.round) return;

  const currentRound = lastRound.round;
  const nextRound = currentRound - 1;

  /* 2️⃣ Verifica se ainda existem jogos abertos */
  const { count: openMatches } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('round', currentRound)
    .neq('status', 'finished');

  if ((openMatches ?? 0) > 0) return;

  /* 3️⃣ Evita criar a próxima fase duas vezes */
  if (nextRound > 0) {
    const { count: nextExists } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .eq('round', nextRound);

    if ((nextExists ?? 0) > 0) return;
  }

  /* 4️⃣ Busca todos os jogos do round atual */
  const { data: matches } = await supabase
    .from('matches')
    .select(
      `
      id,
      round,
      leg,
      team_home,
      team_away,
      score_home,
      score_away,
      status
    `,
    )
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('round', currentRound);

  if (!matches || matches.length === 0) return;

  /* 5️⃣ Agrupa confrontos */
  const confrontos = new Map<string, Match[]>();

  for (const m of matches) {
    const key =
      m.team_home < m.team_away ? `${m.team_home}-${m.team_away}` : `${m.team_away}-${m.team_home}`;

    if (!confrontos.has(key)) confrontos.set(key, []);
    confrontos.get(key)!.push(m);
  }

  /* 6️⃣ Calcula vencedores */
  const winners: string[] = [];

  for (const jogos of confrontos.values()) {
    const winner = getWinnerFromConfronto(jogos, idaVolta);
    if (!winner) return; // aguarda desempate futuro
    winners.push(winner);
  }

  /* 7️⃣ Final → encerra competição */
  if (winners.length === 1 || nextRound === 0) {
    await supabase
      .from('competitions')
      .update({
        status: 'finished',
        champion_team_id: winners[0],
      })
      .eq('id', competitionId)
      .eq('tenant_id', tenantId);

    return;
  }

  /* 8️⃣ Cria próxima fase */
  const matchesToInsert: any[] = [];

  for (let i = 0; i < winners.length; i += 2) {
    const home = winners[i];
    const away = winners[i + 1];

    matchesToInsert.push({
      competition_id: competitionId,
      tenant_id: tenantId,
      team_home: home,
      team_away: away,
      round: nextRound,
      leg: 1,
      status: 'scheduled',
      group_id: null,
      is_final: nextRound === 1,
    });

    if (idaVolta) {
      matchesToInsert.push({
        competition_id: competitionId,
        tenant_id: tenantId,
        team_home: away,
        team_away: home,
        round: nextRound,
        leg: 2,
        status: 'scheduled',
        group_id: null,
        is_final: nextRound === 1,
      });
    }
  }

  await supabase.from('matches').insert(matchesToInsert);
}
