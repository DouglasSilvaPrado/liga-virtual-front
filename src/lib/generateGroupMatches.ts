import { SupabaseClient } from '@supabase/supabase-js';

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

    let round = 1;
    const matchesToInsert: any[] = [];

    /* -------------------------------------------------- */
    /* 3️⃣ Jogos de ida                                   */
    /* -------------------------------------------------- */
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        matchesToInsert.push({
          tenant_id: tenantId,
          championship_id: championshipId,
          competition_id: competitionId,
          team_home: teamIds[i],
          team_away: teamIds[j],
          round,
          leg: 1,
          status: 'scheduled',
        });

        round++;
      }
    }

    /* -------------------------------------------------- */
    /* 4️⃣ Jogos de volta                                 */
    /* -------------------------------------------------- */
    if (idaVolta) {
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          matchesToInsert.push({
            tenant_id: tenantId,
            championship_id: championshipId,
            competition_id: competitionId,
            team_home: teamIds[j],
            team_away: teamIds[i],
            round,
            leg: 2,
            status: 'scheduled',
          });

          round++;
        }
      }
    }

    /* -------------------------------------------------- */
    /* 5️⃣ Inserir jogos                                  */
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
