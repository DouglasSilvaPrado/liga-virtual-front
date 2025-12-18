import { CompetitionSettingsData } from '@/@types/competition';

function isMataMataSpecific(specific: unknown): specific is { jogos_ida_volta: boolean } {
  return (
    typeof specific === 'object' &&
    specific !== null &&
    'jogos_ida_volta' in specific &&
    typeof (specific as any).jogos_ida_volta === 'boolean'
  );
}

function getJogosIdaVolta(settings: CompetitionSettingsData): boolean {
  return isMataMataSpecific(settings.specific) ? settings.specific.jogos_ida_volta : false;
}

type Match = {
  id: string;
  round: number;
  leg: number;
  team_home: string;
  team_away: string;
  score_home: number;
  score_away: number;
};

function calculateWinners(matches: Match[], settings: CompetitionSettingsData): string[] {
  const idaVolta = getJogosIdaVolta(settings);

  const confrontos = new Map<string, Match[]>();

  for (const m of matches) {
    const key =
      m.team_home < m.team_away ? `${m.team_home}-${m.team_away}` : `${m.team_away}-${m.team_home}`;

    if (!confrontos.has(key)) confrontos.set(key, []);
    confrontos.get(key)!.push(m);
  }

  const winners: string[] = [];

  for (const jogos of confrontos.values()) {
    let homeGoals = 0;
    let awayGoals = 0;

    for (const j of jogos) {
      if (j.team_home === jogos[0].team_home) {
        homeGoals += j.score_home;
        awayGoals += j.score_away;
      } else {
        homeGoals += j.score_away;
        awayGoals += j.score_home;
      }
    }

    if (homeGoals > awayGoals) {
      winners.push(jogos[0].team_home);
    } else if (awayGoals > homeGoals) {
      winners.push(jogos[0].team_away);
    } else {
      // ⚠️ empate → regra futura (pênaltis)
      winners.push(jogos[0].team_home);
    }
  }

  return winners;
}

async function createNextRoundMatches({
  supabase,
  competitionId,
  tenantId,
  round,
  winners,
  settings,
}: {
  supabase: any;
  competitionId: string;
  tenantId: string;
  round: number;
  winners: string[];
  settings: CompetitionSettingsData;
}) {
  const idaVolta = getJogosIdaVolta(settings);
  const matches = [];

  for (let i = 0; i < winners.length; i += 2) {
    const home = winners[i];
    const away = winners[i + 1];

    if (idaVolta) {
      matches.push(
        {
          competition_id: competitionId,
          tenant_id: tenantId,
          team_home: home,
          team_away: away,
          round,
          leg: 1,
          status: 'scheduled',
        },
        {
          competition_id: competitionId,
          tenant_id: tenantId,
          team_home: away,
          team_away: home,
          round,
          leg: 2,
          status: 'scheduled',
        },
      );
    } else {
      matches.push({
        competition_id: competitionId,
        tenant_id: tenantId,
        team_home: home,
        team_away: away,
        round,
        leg: 1,
        status: 'scheduled',
      });
    }
  }

  await supabase.from('matches').insert(matches);
}

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

  /* 2️⃣ Ainda existem jogos abertos? */
  const { count: open } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('round', currentRound)
    .neq('status', 'finished');

  if ((open ?? 0) > 0) return;

  /* 3️⃣ Evita duplicar próxima rodada */
  const { count: nextExists } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('round', currentRound + 1);

  if ((nextExists ?? 0) > 0) return;

  /* 4️⃣ Busca jogos da rodada */
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
      score_away
    `,
    )
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('round', currentRound);

  if (!matches || matches.length === 0) return;

  /* 5️⃣ Calcula vencedores */
  const winners = calculateWinners(matches, settings);

  /* 6️⃣ Final acabou → campeão */
  if (winners.length === 1) {
    await supabase
      .from('competitions')
      .update({
        champion_team_id: winners[0],
        status: 'finished',
      })
      .eq('id', competitionId)
      .eq('tenant_id', tenantId);

    return;
  }

  /* 7️⃣ Cria próxima rodada */
  await createNextRoundMatches({
    supabase,
    competitionId,
    tenantId,
    round: currentRound + 1,
    winners,
    settings,
  });
}
