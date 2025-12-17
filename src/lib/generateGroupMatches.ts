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
      status: 'scheduled' as const, // ✅ válido no CHECK
    };

    /* -------------------------------------------------- */
    /* 4️⃣ Jogos de ida                                   */
    /* -------------------------------------------------- */
    rounds.forEach((roundMatches, index) => {
      const groupRound = index + 1;

      roundsToInsert.push({
        competition_id: competitionId,
        group_id: group.id,
        round: groupRound,
        is_open: false, // 🔒 começa bloqueada
      });

      for (const match of roundMatches) {
        matchesToInsert.push({
          ...baseMatch,
          group_round: groupRound,
          team_home: match.home,
          team_away: match.away,
          leg: 1,
        });
      }
    });

    /* -------------------------------------------------- */
    /* 5️⃣ Jogos de volta                                 */
    /* -------------------------------------------------- */
    if (idaVolta) {
      rounds.forEach((roundMatches, index) => {
        const groupRound = rounds.length + index + 1;

        roundsToInsert.push({
          competition_id: competitionId,
          group_id: group.id,
          round: groupRound,
          is_open: false,
        });

        for (const match of roundMatches) {
          matchesToInsert.push({
            ...baseMatch,
            group_round: groupRound,
            team_home: match.away,
            team_away: match.home,
            leg: 2,
          });
        }
      });
    }

    /* -------------------------------------------------- */
    /* 6️⃣ Inserir rodadas                                */
    /* -------------------------------------------------- */
    await supabase.from('group_rounds').insert(roundsToInsert);

    /* -------------------------------------------------- */
    /* 7️⃣ Inserir partidas                               */
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
