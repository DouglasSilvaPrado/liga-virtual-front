import { Match } from '@/@types/match';
import { SupabaseClient } from '@supabase/supabase-js';
import { generateGroupRounds } from './groupRoundRobin';

type Params = {
  supabase: SupabaseClient;
  tenantId: string;
  competitionId: string;
  championshipId: string;
  idaVolta: boolean;
};

export async function generateGroupMatches({
  supabase,
  tenantId,
  competitionId,
  championshipId,
  idaVolta,
}: Params) {
  /* -------------------------------------------------- */
  /* 1️⃣ Buscar grupos                                  */
  /* -------------------------------------------------- */
  const { data: groups, error: groupErr } = await supabase
    .from('competition_groups')
    .select('id')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId);

  if (groupErr || !groups?.length) {
    throw new Error('Nenhum grupo encontrado');
  }

  /* -------------------------------------------------- */
  /* 2️⃣ Para cada grupo                                */
  /* -------------------------------------------------- */
  for (const group of groups) {
    const { data: teams, error: teamErr } = await supabase
      .from('competition_teams')
      .select('team_id')
      .eq('competition_id', competitionId)
      .eq('group_id', group.id)
      .eq('tenant_id', tenantId);

    if (teamErr || !teams || teams.length < 2) continue;

    const teamIds = teams.map((t) => t.team_id);

    /* -------------------------------------------------- */
    /* 3️⃣ Gera rodadas (round-robin)                     */
    /* -------------------------------------------------- */
    const rounds = generateGroupRounds(teamIds);

    const matchesToInsert: Match[] = [];
    const roundsToInsert: {
      tenant_id: string;
      competition_id: string;
      group_id: string;
      round: number;
      is_open: boolean;
    }[] = [];

    const baseMatch = {
      tenant_id: tenantId,
      championship_id: championshipId,
      competition_id: competitionId,
      group_id: group.id,
      status: 'scheduled' as const,
    };

    /* -------------------------------------------------- */
    /* 4️⃣ Criar rodadas (IDA)                            */
    /* -------------------------------------------------- */
    rounds.forEach((_, index) => {
      roundsToInsert.push({
        tenant_id: tenantId,
        competition_id: competitionId,
        group_id: group.id,
        round: index + 1,
        is_open: false,
      });
    });

    /* -------------------------------------------------- */
    /* 5️⃣ Criar rodadas (VOLTA)                          */
    /* -------------------------------------------------- */
    if (idaVolta) {
      rounds.forEach((_, index) => {
        roundsToInsert.push({
          tenant_id: tenantId,
          competition_id: competitionId,
          group_id: group.id,
          round: rounds.length + index + 1,
          is_open: false,
        });
      });
    }

    /* -------------------------------------------------- */
    /* 6️⃣ Inserir rodadas e capturar IDs                 */
    /* -------------------------------------------------- */
    const { data: insertedRounds, error: roundsErr } = await supabase
      .from('group_rounds')
      .insert(roundsToInsert)
      .select('id, round');

    if (roundsErr || !insertedRounds) {
      throw new Error('Erro ao criar rodadas de grupo');
    }

    /* -------------------------------------------------- */
    /* 6️⃣.1️⃣ Mapear round → group_round_id               */
    /* -------------------------------------------------- */
    const roundIdMap = new Map<number, string>();
    for (const r of insertedRounds) {
      roundIdMap.set(r.round, r.id);
    }

    /* -------------------------------------------------- */
    /* 7️⃣ Criar partidas (IDA)                           */
    /* -------------------------------------------------- */
    rounds.forEach((roundMatches, index) => {
      const roundNumber = index + 1;
      const groupRoundId = roundIdMap.get(roundNumber);
      if (!groupRoundId) return;

      for (const match of roundMatches) {
        matchesToInsert.push({
          ...baseMatch,
          group_round_id: groupRoundId,
          round: roundNumber,
          team_home: match.home,
          team_away: match.away,
          leg: 1,
        });
      }
    });

    /* -------------------------------------------------- */
    /* 8️⃣ Criar partidas (VOLTA)                         */
    /* -------------------------------------------------- */
    if (idaVolta) {
      rounds.forEach((roundMatches, index) => {
        const roundNumber = rounds.length + index + 1;
        const groupRoundId = roundIdMap.get(roundNumber);
        if (!groupRoundId) return;

        for (const match of roundMatches) {
          matchesToInsert.push({
            ...baseMatch,
            group_round_id: groupRoundId,
            round: roundNumber,
            team_home: match.away,
            team_away: match.home,
            leg: 2,
          });
        }
      });
    }

    /* -------------------------------------------------- */
    /* 9️⃣ Inserir partidas                               */
    /* -------------------------------------------------- */
    if (matchesToInsert.length) {
      const { error } = await supabase.from('matches').insert(matchesToInsert);

      if (error) {
        console.error('Erro ao inserir matches:', error);
        throw error;
      }
    }
  }
}
