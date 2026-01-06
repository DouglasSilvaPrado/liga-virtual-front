import { SupabaseClient } from '@supabase/supabase-js';
import { CompetitionSettingsData } from '@/@types/competition';

type MatchRow = {
  id: string;
  team_home: string;
  team_away: string;
  score_home: number | null;
  score_away: number | null;
  status: string;
  leg: number | null;
  penalties_home: number | null;
  penalties_away: number | null;
};

type KnockoutRoundRow = {
  id: string;
  round_number: number;
  is_current: boolean;
  is_finished: boolean;
  competition_id: string;
  tenant_id: string;
};

type MatchInsert = {
  competition_id: string;
  tenant_id: string;
  knockout_round_id: string;
  team_home: string;
  team_away: string;
  leg: 1 | 2;
  status: 'scheduled';
};

function getIdaVolta(settings: CompetitionSettingsData, roundNumber: number): boolean {
  const specific = settings?.specific as Partial<{
    mata_em_ida_e_volta: boolean;
    final_ida_volta: boolean;
  }>;

  if (!specific) return false;

  if (roundNumber === 1) return specific.final_ida_volta === true;
  return specific.mata_em_ida_e_volta === true;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|');
}

export async function tryAdvanceKnockout({
  supabase,
  competitionId,
  tenantId,
  settings,
}: {
  supabase: SupabaseClient;
  competitionId: string;
  tenantId: string;
  settings: CompetitionSettingsData;
}) {
  const { data: round } = await supabase
    .from('knockout_rounds')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('is_current', true)
    .single<KnockoutRoundRow>();

  if (!round || round.is_finished) return;

  const idaVoltaCurrent = getIdaVolta(settings, round.round_number);

  const { data: matches } = await supabase
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
    .eq('knockout_round_id', round.id)
    .eq('tenant_id', tenantId)
    .returns<MatchRow[]>();

  if (!matches?.length) return;

  if (matches.some((m) => m.status !== 'finished')) return;

  const confrontos = new Map<string, MatchRow[]>();
  for (const m of matches) {
    const key = pairKey(m.team_home, m.team_away);
    confrontos.set(key, [...(confrontos.get(key) ?? []), m]);
  }

  if (idaVoltaCurrent) {
    for (const jogos of confrontos.values()) {
      if (jogos.length < 2) return;
    }
  }

  const winners: string[] = [];

  for (const jogos of confrontos.values()) {
    const teams = Array.from(new Set(jogos.flatMap((j) => [j.team_home, j.team_away])));
    if (teams.length !== 2) return;

    const [teamA, teamB] = teams;

    let golsA = 0;
    let golsB = 0;

    for (const j of jogos) {
      if (j.score_home == null || j.score_away == null) return;

      if (j.team_home === teamA) golsA += j.score_home;
      if (j.team_away === teamA) golsA += j.score_away;

      if (j.team_home === teamB) golsB += j.score_home;
      if (j.team_away === teamB) golsB += j.score_away;
    }

    if (golsA > golsB) {
      winners.push(teamA);
      continue;
    }

    if (golsB > golsA) {
      winners.push(teamB);
      continue;
    }

    const penMatch =
      jogos.find((j) => j.penalties_home != null && j.penalties_away != null) ??
      [...jogos].sort((a, b) => (b.leg ?? 0) - (a.leg ?? 0))[0];

    if (penMatch.penalties_home == null || penMatch.penalties_away == null) return;

    winners.push(
      penMatch.penalties_home > penMatch.penalties_away ? penMatch.team_home : penMatch.team_away,
    );
  }

  await supabase
    .from('knockout_rounds')
    .update({ is_current: false, is_finished: true })
    .eq('id', round.id)
    .eq('tenant_id', tenantId);

  if (winners.length === 1) {
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

  const nextRoundNumber = round.round_number - 1;

  const roundName =
    nextRoundNumber === 1
      ? 'Final'
      : nextRoundNumber === 2
        ? 'Semifinal'
        : nextRoundNumber === 3
          ? 'Quartas'
          : `Fase ${nextRoundNumber}`;

  const { data: nextRound } = await supabase
    .from('knockout_rounds')
    .insert({
      competition_id: competitionId,
      tenant_id: tenantId,
      round_number: nextRoundNumber,
      is_current: true,
      name: roundName,
    })
    .select()
    .single<{ id: string }>();

  if (!nextRound) return;

  const idaVoltaNext = getIdaVolta(settings, nextRoundNumber);

  const inserts: MatchInsert[] = [];

  for (let i = 0; i < winners.length; i += 2) {
    const a = winners[i];
    const b = winners[i + 1];
    if (!a || !b) continue;

    inserts.push({
      competition_id: competitionId,
      tenant_id: tenantId,
      knockout_round_id: nextRound.id,
      team_home: a,
      team_away: b,
      leg: 1,
      status: 'scheduled',
    });

    if (idaVoltaNext) {
      inserts.push({
        competition_id: competitionId,
        tenant_id: tenantId,
        knockout_round_id: nextRound.id,
        team_home: b,
        team_away: a,
        leg: 2,
        status: 'scheduled',
      });
    }
  }

  if (inserts.length) {
    await supabase.from('matches').insert(inserts);
  }
}
