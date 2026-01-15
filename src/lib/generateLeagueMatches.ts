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

  const roundsPairs = buildRoundRobinPairs(shuffled);

  const totalRounds = idaVolta ? roundsPairs.length * 2 : roundsPairs.length;

  /**
   * 1) Cria/Garante league_rounds (1..totalRounds)
   * - is_open default false (ou você pode optar por abrir a 1ª rodada)
   */
  const leagueRoundsPayload = Array.from({ length: totalRounds }, (_, i) => ({
    tenant_id: tenantId,
    competition_id: competitionId,
    round: i + 1,
    // is_open: i === 0 ? true : false, // se quiser abrir a primeira automaticamente
  }));

  // upsert para não duplicar se clicar “Gerar calendário” de novo
  const { data: leagueRounds, error: lrError } = await supabase
    .from('league_rounds')
    .upsert(leagueRoundsPayload, {
      onConflict: 'tenant_id,competition_id,round',
    })
    .select('id, round');

  if (lrError) throw new Error(lrError.message);
  if (!leagueRounds || leagueRounds.length === 0) {
    throw new Error('Falha ao criar league_rounds');
  }

  // roundNumber -> league_round_id
  const roundIdByNumber = new Map<number, string>();
  for (const r of leagueRounds as Array<{ id: string; round: number }>) {
    roundIdByNumber.set(r.round, r.id);
  }

  /**
   * 2) Monta inserts em matches já com league_round_id
   */
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

    league_round_id: string; // ✅ novo
  };

  const inserts: MatchInsert[] = [];

  // turno 1
  for (let r = 0; r < roundsPairs.length; r++) {
    const pairs = roundsPairs[r];
    const roundNumber = r + 1;

    const leagueRoundId = roundIdByNumber.get(roundNumber);
    if (!leagueRoundId) throw new Error(`league_round_id não encontrado para round ${roundNumber}`);

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
        league_round_id: leagueRoundId,
      });
    }
  }

  // turno 2 (inverte mando)
  if (idaVolta) {
    const offset = roundsPairs.length;

    for (let r = 0; r < roundsPairs.length; r++) {
      const pairs = roundsPairs[r];
      const roundNumber = offset + r + 1;

      const leagueRoundId = roundIdByNumber.get(roundNumber);
      if (!leagueRoundId)
        throw new Error(`league_round_id não encontrado para round ${roundNumber}`);

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
          league_round_id: leagueRoundId,
        });
      }
    }
  }

  /**
   * 3) Insere matches
   * (Opcional) você pode impedir duplicação removendo matches existentes antes
   * ou usando uma constraint unique e upsert. Aqui mantive como insert simples.
   */
  const { error } = await supabase.from('matches').insert(inserts);
  if (error) throw new Error(error.message);

  return {
    rounds: totalRounds,
    matches: inserts.length,
  };
}
