import { createServerSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = await context.params;

  console.log('🚀 competitionId:', competitionId);

  const { supabase, tenantId } = await createServerSupabase();

  /* ───────────────────────── 🔐 USUÁRIO ───────────────────────── */

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  /* ───────────────────────── 🔐 TENANT + ROLE ───────────────────────── */

  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single();

  if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
    return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
  }

  /* ───────────────────────── ⛔ JOGOS DE GRUPO ABERTOS ───────────────────────── */

  const { count: openGroupMatches } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .not('group_id', 'is', null)
    .neq('status', 'finished');

  if ((openGroupMatches ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Ainda existem jogos da fase de grupos em aberto' },
      { status: 400 },
    );
  }

  /* ───────────────────────── 📖 SETTINGS ───────────────────────── */

  const { data: competition } = await supabase
    .from('competitions_with_settings')
    .select('settings')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single();
  console.log('🚀 ~ POST ~ competition:', competition);

  if (!competition?.settings) {
    return NextResponse.json(
      { error: 'Configurações da competição não encontradas' },
      { status: 400 },
    );
  }

  const specific = competition.settings.specific;

  const qtdPorGrupo: number = specific?.qtd_classifica_por_grupo;

  const chaveAutomatica: 'aleatorio' | 'cruzado' = specific?.chave_automatica ?? 'cruzado';

  const idaVolta: boolean = specific?.mata_em_ida_e_volta ?? false;

  if (!qtdPorGrupo || qtdPorGrupo < 1) {
    return NextResponse.json({ error: 'Configuração inválida de classificação' }, { status: 400 });
  }

  /* ───────────────────────── 📊 CLASSIFICAÇÃO ───────────────────────── */

  const { data: standings } = await supabase
    .from('standings')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('points', { ascending: false })
    .order('goal_diff', { ascending: false })
    .order('goals_scored', { ascending: false });

  if (!standings || standings.length === 0) {
    return NextResponse.json({ error: 'Classificação não encontrada' }, { status: 400 });
  }

  /* ───────────────────────── 🏆 CLASSIFICADOS ───────────────────────── */

  const classificadosPorGrupo: Record<string, any[]> = {};

  for (const s of standings) {
    if (!s.group_id) continue;

    classificadosPorGrupo[s.group_id] ??= [];
    classificadosPorGrupo[s.group_id].push(s);
  }
  console.log('🚀 ~ POST ~ classificadosPorGrupo:', classificadosPorGrupo);

  const classificados: any[] = [];

  for (const groupId in classificadosPorGrupo) {
    classificados.push(...classificadosPorGrupo[groupId].slice(0, qtdPorGrupo));
  }

  if (classificados.length < 2) {
    return NextResponse.json({ error: 'Classificados insuficientes' }, { status: 400 });
  }
  console.log('🚀 ~ POST ~ classificados:', classificados);

  /* ───────────────────────── 🔀 MONTAGEM DA CHAVE ───────────────────────── */

  let confrontos: any[][] = [];

  if (chaveAutomatica === 'aleatorio') {
    const shuffled = [...classificados].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += 2) {
      confrontos.push([shuffled[i], shuffled[i + 1]]);
    }
  } else {
    // cruzado (Grupo A 1º x Grupo B 2º)
    const grupos = Object.values(classificadosPorGrupo);

    if (grupos.length !== 2) {
      return NextResponse.json(
        { error: 'Chave cruzada requer exatamente 2 grupos' },
        { status: 400 },
      );
    }

    confrontos = [
      [grupos[0][0], grupos[1][1]],
      [grupos[1][0], grupos[0][1]],
    ];
  }

  /* ───────────────────────── ⚽ CRIA JOGOS ───────────────────────── */

  const matchesToInsert: any[] = [];

  confrontos.forEach((confronto, index) => {
    const [home, away] = confronto;

    matchesToInsert.push({
      competition_id: competitionId,
      championship_id: home.championship_id,
      tenant_id: tenantId,
      team_home: home.team_id,
      team_away: away.team_id,
      round: 1, // semifinal
      leg: 1,
      status: 'scheduled',
      group_id: null,
      is_final: false,
    });

    if (idaVolta) {
      matchesToInsert.push({
        competition_id: competitionId,
        championship_id: home.championship_id,
        tenant_id: tenantId,
        team_home: away.team_id,
        team_away: home.team_id,
        round: 1,
        leg: 2,
        status: 'scheduled',
        group_id: null,
        is_final: false,
      });
    }
    console.log('🚀 ~ POST ~ matchesToInsert:', matchesToInsert);
  });

  const { error: insertError } = await supabase.from('matches').insert(matchesToInsert);

  if (insertError) {
    console.error(insertError);
    return NextResponse.json({ error: 'Erro ao criar jogos do mata-mata' }, { status: 500 });
  }

  /* ───────────────────────── 📝 LOG (opcional) ───────────────────────── */

  await supabase.from('activity_logs').insert({
    tenant_id: tenantId,
    user_id: user.id,
    action: 'generate_knockout',
    metadata: {
      competition_id: competitionId,
      classificados: classificados.map((c) => c.team_id),
    },
  });

  return NextResponse.json({
    success: true,
    matches_created: matchesToInsert.length,
  });
}
