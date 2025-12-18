import { SupabaseClient } from '@supabase/supabase-js';

type Acc = {
  goals_scored: number;
  goals_against: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

export async function recalcStandingsFromGroup({
  supabase,
  competition_id,
  tenant_id,
  group_id,
}: {
  supabase: SupabaseClient;
  competition_id: string;
  tenant_id: string;
  group_id: string;
}) {
  // 1️⃣ Buscar partidas finalizadas
  const { data: matches, error } = await supabase
    .from('matches')
    .select('team_home, team_away, score_home, score_away')
    .eq('competition_id', competition_id)
    .eq('tenant_id', tenant_id)
    .eq('group_id', group_id)
    .eq('status', 'finished');

  if (error || !matches || matches.length === 0) {
    console.error('Sem partidas para recalcular', error);
    return;
  }

  // 2️⃣ Limpar standings do grupo
  await supabase
    .from('standings')
    .delete()
    .eq('competition_id', competition_id)
    .eq('tenant_id', tenant_id)
    .eq('group_id', group_id);

  // 3️⃣ Acumulador em memória
  const table: Record<string, Acc> = {};

  function ensure(teamId: string) {
    if (!table[teamId]) {
      table[teamId] = {
        goals_scored: 0,
        goals_against: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
      };
    }
    return table[teamId];
  }

  // 4️⃣ Processar jogos
  for (const m of matches) {
    const draw = m.score_home === m.score_away;

    const home = ensure(m.team_home);
    const away = ensure(m.team_away);

    // 🏠 Casa
    home.goals_scored += m.score_home;
    home.goals_against += m.score_away;
    home.wins += m.score_home > m.score_away ? 1 : 0;
    home.draws += draw ? 1 : 0;
    home.losses += m.score_home < m.score_away ? 1 : 0;
    home.points += m.score_home > m.score_away ? 3 : draw ? 1 : 0;

    // ✈️ Visitante
    away.goals_scored += m.score_away;
    away.goals_against += m.score_home;
    away.wins += m.score_away > m.score_home ? 1 : 0;
    away.draws += draw ? 1 : 0;
    away.losses += m.score_away < m.score_home ? 1 : 0;
    away.points += m.score_away > m.score_home ? 3 : draw ? 1 : 0;
  }

  // 5️⃣ Persistir standings
  for (const [team_id, data] of Object.entries(table)) {
    await supabase.from('standings').insert({
      competition_id,
      tenant_id,
      group_id,
      team_id,
      ...data,
      goal_diff: data.goals_scored - data.goals_against,
    });
  }
}
