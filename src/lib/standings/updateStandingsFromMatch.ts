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
  points,
}: {
  supabase: SupabaseClient;
  competition_id: string;
  tenant_id: string;
  group_id: string;
  points?: { win: number; draw: number; loss: number };
}) {
  const pts = points ?? { win: 3, draw: 1, loss: 0 };

  // 1️⃣ Buscar partidas finalizadas
  const { data: matches, error } = await supabase
    .from('matches')
    .select('team_home, team_away, score_home, score_away')
    .eq('competition_id', competition_id)
    .eq('tenant_id', tenant_id)
    .eq('group_id', group_id)
    .eq('status', 'finished');

  if (error) {
    console.error('Erro ao buscar partidas para recalcular standings', error);
    return;
  }

  // Se não tem jogos finalizados, zera standings desse grupo
  if (!matches || matches.length === 0) {
    await supabase
      .from('standings')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenant_id)
      .eq('group_id', group_id);

    return;
  }

  // 2️⃣ Acumulador em memória
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

  // 3️⃣ Processar jogos
  for (const m of matches) {
    if (m.score_home == null || m.score_away == null) continue;

    const draw = m.score_home === m.score_away;

    const home = ensure(m.team_home);
    const away = ensure(m.team_away);

    // 🏠 Casa
    home.goals_scored += m.score_home;
    home.goals_against += m.score_away;

    if (m.score_home > m.score_away) {
      home.wins += 1;
      home.points += pts.win;
    } else if (draw) {
      home.draws += 1;
      home.points += pts.draw;
    } else {
      home.losses += 1;
      home.points += pts.loss;
    }

    // ✈️ Visitante
    away.goals_scored += m.score_away;
    away.goals_against += m.score_home;

    if (m.score_away > m.score_home) {
      away.wins += 1;
      away.points += pts.win;
    } else if (draw) {
      away.draws += 1;
      away.points += pts.draw;
    } else {
      away.losses += 1;
      away.points += pts.loss;
    }
  }

  // 4️⃣ Montar rows e UPSERT
  const rows = Object.entries(table).map(([team_id, data]) => ({
    competition_id,
    tenant_id,
    group_id,
    team_id,
    ...data,
    goal_diff: data.goals_scored - data.goals_against,
  }));

  // Recomendado ter UNIQUE (tenant_id, competition_id, group_id, team_id)
  const { error: upsertErr } = await supabase.from('standings').upsert(rows, {
    onConflict: 'tenant_id,competition_id,group_id,team_id',
  });

  if (upsertErr) {
    // fallback seguro (se ainda não tiver UNIQUE no banco)
    console.warn('Falha no upsert (talvez falte UNIQUE). Fazendo fallback...', upsertErr);

    await supabase
      .from('standings')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenant_id)
      .eq('group_id', group_id);

    await supabase.from('standings').insert(rows);
  }
}
