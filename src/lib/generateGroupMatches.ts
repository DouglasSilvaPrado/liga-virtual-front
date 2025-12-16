import { SupabaseClient } from '@supabase/supabase-js';

export async function generateGroupMatches({
  supabase,
  tenantId,
  competitionId,
  championshipId,
  idaVolta = true,
}: {
  supabase: SupabaseClient;
  tenantId: string;
  competitionId: string;
  championshipId: string;
  idaVolta?: boolean;
}) {
  /* ---------------------------------------------------------------- */
  /* 1️⃣ Busca os grupos                                              */
  /* ---------------------------------------------------------------- */
  const { data: groups } = await supabase
    .from('competition_groups')
    .select('id')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId);

  if (!groups || groups.length === 0) return;

  const matches: any[] = [];

  /* ---------------------------------------------------------------- */
  /* 2️⃣ Para cada grupo, gera confrontos                              */
  /* ---------------------------------------------------------------- */
  for (const group of groups) {
    const { data: teams } = await supabase
      .from('competition_teams')
      .select('team_id')
      .eq('competition_id', competitionId)
      .eq('group_id', group.id)
      .eq('tenant_id', tenantId);

    if (!teams || teams.length < 2) continue;

    const teamIds = teams.map((t) => t.team_id);
    let round = 1;

    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        // Ida
        matches.push({
          competition_id: competitionId,
          championship_id: championshipId,
          tenant_id: tenantId,
          team_home: teamIds[i],
          team_away: teamIds[j],
          round,
          leg: 1,
          status: 'scheduled',
        });

        // Volta
        if (idaVolta) {
          matches.push({
            competition_id: competitionId,
            championship_id: championshipId,
            tenant_id: tenantId,
            team_home: teamIds[j],
            team_away: teamIds[i],
            round,
            leg: 2,
            status: 'scheduled',
          });
        }

        round++;
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 3️⃣ Insere os jogos                                              */
  /* ---------------------------------------------------------------- */
  if (matches.length > 0) {
    await supabase.from('matches').insert(matches);
  }
}
