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

function getWinnerFromConfronto(jogos: any[], idaVolta: boolean): string | null {
  if (jogos.some((j) => j.status !== 'finished')) return null;

  const gols: Record<string, number> = {};

  for (const j of jogos) {
    gols[j.team_home] = (gols[j.team_home] ?? 0) + j.score_home;
    gols[j.team_away] = (gols[j.team_away] ?? 0) + j.score_away;
  }

  const [[teamA, golsA], [teamB, golsB]] = Object.entries(gols);

  if (golsA > golsB) return teamA;
  if (golsB > golsA) return teamB;

  const pen = jogos.find((j) => j.penalties_home != null);
  if (!pen) return null;

  return pen.penalties_home > pen.penalties_away ? pen.team_home : pen.team_away;
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

  /* 1️⃣ Última rodada existente */
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

  /* 2️⃣ Verifica jogos pendentes */
  const { count: open } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('round', currentRound)
    .neq('status', 'finished');

  if ((open ?? 0) > 0) return;

  /* 3️⃣ Evita duplicar rodada */
  if (nextRound > 0) {
    const { count } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .eq('round', nextRound);

    if ((count ?? 0) > 0) return;
  }

  /* 4️⃣ Busca jogos */
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('round', currentRound);

  if (!matches?.length) return;

  /* 5️⃣ Agrupa confrontos corretamente */
  const confrontos = new Map<string, any[]>();

  for (const m of matches) {
    const pair = [m.team_home, m.team_away].sort().join('|');
    if (!confrontos.has(pair)) confrontos.set(pair, []);
    confrontos.get(pair)!.push(m);
  }

  /* 6️⃣ Determina vencedores */
  const winners: string[] = [];

  for (const jogos of confrontos.values()) {
    const winner = getWinnerFromConfronto(jogos, idaVolta);
    if (!winner) return;
    winners.push(winner);
  }

  /* 7️⃣ Trava edição da rodada atual */
  await supabase
    .from('matches')
    .update({ is_locked: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('round', currentRound);

  /* 8️⃣ Final */
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

  /* 9️⃣ Cria próxima fase */
  const inserts = [];

  for (let i = 0; i < winners.length; i += 2) {
    inserts.push({
      competition_id: competitionId,
      tenant_id: tenantId,
      team_home: winners[i],
      team_away: winners[i + 1],
      round: nextRound,
      leg: 1,
      status: 'scheduled',
      group_id: null,
      is_final: nextRound === 1,
    });

    if (idaVolta) {
      inserts.push({
        competition_id: competitionId,
        tenant_id: tenantId,
        team_home: winners[i + 1],
        team_away: winners[i],
        round: nextRound,
        leg: 2,
        status: 'scheduled',
        group_id: null,
        is_final: nextRound === 1,
      });
    }
  }

  await supabase.from('matches').insert(inserts);
}
