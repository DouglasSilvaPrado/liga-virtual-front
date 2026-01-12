import type { SupabaseClient } from '@supabase/supabase-js';

type TeamId = string;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * Algoritmo “circle method” para round-robin.
 * Retorna rounds com pares (home, away).
 */
function buildRoundRobinPairs(teamIds: TeamId[]) {
  const ids = [...teamIds];

  // Se ímpar, adiciona BYE (null)
  const isOdd = ids.length % 2 === 1;
  if (isOdd) ids.push('__BYE__');

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;

  const list = ids;

  const schedule: Array<Array<{ home: TeamId; away: TeamId }>> = [];

  for (let r = 0; r < rounds; r++) {
    const pairs: Array<{ home: TeamId; away: TeamId }> = [];

    for (let i = 0; i < half; i++) {
      const a = list[i];
      const b = list[n - 1 - i];

      if (a === '__BYE__' || b === '__BYE__') continue;

      pairs.push({ home: a, away: b });
    }

    schedule.push(pairs);

    // rotate (mantém o primeiro fixo)
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop() as TeamId);
    list.splice(0, list.length, fixed, ...rest);
  }

  return schedule;
}

export async function generateLeagueMatches({
  supabase,
  tenantId,
  competitionId,
  championshipId,
  teamIds,
  idaVolta,
}: {
  supabase: SupabaseClient;
  tenantId: string;
  competitionId: string;
  championshipId: string;
  teamIds: string[];
  idaVolta: boolean;
}) {
  const uniqueTeams = Array.from(new Set(teamIds)).filter(Boolean);

  if (uniqueTeams.length < 2) {
    throw new Error('Liga precisa de no mínimo 2 times');
  }

  // embaralha pra não ficar sempre igual
  const shuffled = shuffle(uniqueTeams);

  const rounds = buildRoundRobinPairs(shuffled);

  type MatchInsert = {
    competition_id: string;
    championship_id: string;
    tenant_id: string;
    team_home: string;
    team_away: string;
    round: number;
    leg: number | null;
    status: 'scheduled';
    group_id: null;
    group_round_id: null;
    knockout_round_id: null;
  };

  const inserts: MatchInsert[] = [];

  // turno 1
  for (let r = 0; r < rounds.length; r++) {
    const pairs = rounds[r];
    const roundNumber = r + 1;

    for (const p of pairs) {
      inserts.push({
        competition_id: competitionId,
        championship_id: championshipId,
        tenant_id: tenantId,
        team_home: p.home,
        team_away: p.away,
        round: roundNumber,
        leg: idaVolta ? 1 : null,
        status: 'scheduled',
        group_id: null,
        group_round_id: null,
        knockout_round_id: null,
      });
    }
  }

  // turno 2 (inverte mando)
  if (idaVolta) {
    const offset = rounds.length;

    for (let r = 0; r < rounds.length; r++) {
      const pairs = rounds[r];
      const roundNumber = offset + r + 1;

      for (const p of pairs) {
        inserts.push({
          competition_id: competitionId,
          championship_id: championshipId,
          tenant_id: tenantId,
          team_home: p.away,
          team_away: p.home,
          round: roundNumber,
          leg: 2,
          status: 'scheduled',
          group_id: null,
          group_round_id: null,
          knockout_round_id: null,
        });
      }
    }
  }

  // insere
  const { error } = await supabase.from('matches').insert(inserts);
  if (error) throw new Error(error.message);

  return {
    rounds: idaVolta ? rounds.length * 2 : rounds.length,
    matches: inserts.length,
  };
}
