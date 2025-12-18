import { SupabaseClient } from '@supabase/supabase-js';

interface GenerateKnockoutParams {
  supabase: SupabaseClient;
  tenantId: string;
  competitionId: string;
  championshipId: string;
  classificadosPorGrupo: number;
}

export async function generateKnockoutMatches({
  supabase,
  tenantId,
  competitionId,
  championshipId,
  classificadosPorGrupo,
}: GenerateKnockoutParams) {
  /* ---------------------------------------------------------------- */
  /* 1️⃣ Busca standings ordenadas por grupo                           */
  /* ---------------------------------------------------------------- */
  const { data: standings, error } = await supabase
    .from('standings')
    .select('team_id, group_id, points, goal_diff, goals_scored')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('points', { ascending: false })
    .order('goal_diff', { ascending: false })
    .order('goals_scored', { ascending: false });

  if (error || !standings) {
    throw new Error('Erro ao buscar standings');
  }

  /* ---------------------------------------------------------------- */
  /* 2️⃣ Agrupa classificados por grupo                                */
  /* ---------------------------------------------------------------- */
  const classificadosPorGrupoMap = new Map<string, any[]>();

  for (const s of standings) {
    if (!classificadosPorGrupoMap.has(s.group_id)) {
      classificadosPorGrupoMap.set(s.group_id, []);
    }

    if (classificadosPorGrupoMap.get(s.group_id)!.length < classificadosPorGrupo) {
      classificadosPorGrupoMap.get(s.group_id)!.push(s);
    }
  }

  const grupos = Array.from(classificadosPorGrupoMap.values());

  if (grupos.length < 2) {
    throw new Error('Número insuficiente de grupos para mata-mata');
  }

  /* ---------------------------------------------------------------- */
  /* 3️⃣ Cruzamento A1 x B2 / B1 x A2                                   */
  /* ---------------------------------------------------------------- */
  const matchesToInsert = [];

  for (let i = 0; i < grupos.length; i += 2) {
    const grupoA = grupos[i];
    const grupoB = grupos[i + 1];

    if (!grupoA || !grupoB) continue;

    // A1 x B2
    matchesToInsert.push({
      competition_id: competitionId,
      championship_id: championshipId,
      tenant_id: tenantId,
      home_team_id: grupoA[0].team_id,
      away_team_id: grupoB[1].team_id,
    });

    // B1 x A2
    matchesToInsert.push({
      competition_id: competitionId,
      championship_id: championshipId,
      tenant_id: tenantId,
      home_team_id: grupoB[0].team_id,
      away_team_id: grupoA[1].team_id,
    });
  }

  /* ---------------------------------------------------------------- */
  /* 4️⃣ Insere jogos                                                  */
  /* ---------------------------------------------------------------- */
  const { error: insertErr } = await supabase.from('matches').insert(matchesToInsert);

  if (insertErr) {
    throw new Error(insertErr.message);
  }
}
