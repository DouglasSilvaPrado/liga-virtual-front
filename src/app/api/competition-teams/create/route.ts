import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { generateGroupMatches } from '@/lib/generateGroupMatches';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { competition_id, championship_id, teams } = body;

    if (!competition_id || !championship_id || !Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    const { supabase, tenantId } = await createServerSupabase();

    /* ---------------------------------------------------------------- */
    /* 1️⃣ Valida competição                                            */
    /* ---------------------------------------------------------------- */
    const { data: competition, error: compErr } = await supabase
      .from('competitions_with_settings')
      .select('id, type, settings')
      .eq('id', competition_id)
      .eq('tenant_id', tenantId)
      .single();

    if (compErr || !competition) {
      return NextResponse.json({ error: 'Competição inválida' }, { status: 403 });
    }

    /* ---------------------------------------------------------------- */
    /* 2️⃣ Insere os times                                               */
    /* ---------------------------------------------------------------- */
    const inserts = teams.map((t: { team_id: string }) => ({
      competition_id,
      championship_id,
      tenant_id: tenantId,
      team_id: t.team_id,
      group_id: null,
    }));

    const { error: insertErr } = await supabase.from('competition_teams').insert(inserts);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    /* ---------------------------------------------------------------- */
    /* 3️⃣ Verifica se é competição com grupos                          */
    /* ---------------------------------------------------------------- */
    const numGroups: number | undefined = competition.settings?.specific?.num_grupos;

    const isGroupCompetition =
      competition.type === 'copa_grupo' || competition.type === 'copa_grupo_mata';

    if (!isGroupCompetition || !numGroups || numGroups < 1) {
      return NextResponse.json({ success: true });
    }

    /* ---------------------------------------------------------------- */
    /* 4️⃣ Busca times inseridos (AGORA COM team_id)                     */
    /* ---------------------------------------------------------------- */
    const { data: competitionTeams, error: teamsErr } = await supabase
      .from('competition_teams')
      .select('id, team_id')
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);

    if (teamsErr || !competitionTeams || competitionTeams.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum time encontrado para gerar grupos' },
        { status: 400 },
      );
    }

    if (competitionTeams.length % numGroups !== 0) {
      return NextResponse.json(
        {
          error: `Quantidade de times (${competitionTeams.length}) não divisível por ${numGroups} grupos`,
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------- */
    /* 5️⃣ Remove grupos antigos (segurança)                            */
    /* ---------------------------------------------------------------- */
    await supabase
      .from('competition_groups')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);

    /* ---------------------------------------------------------------- */
    /* 6️⃣ Cria grupos (A, B, C...)                                      */
    /* ---------------------------------------------------------------- */
    const groupsToInsert = Array.from({ length: numGroups }).map((_, i) => ({
      competition_id,
      tenant_id: tenantId,
      code: String.fromCharCode(65 + i),
      name: `Grupo ${String.fromCharCode(65 + i)}`,
    }));

    const { data: groups, error: groupErr } = await supabase
      .from('competition_groups')
      .insert(groupsToInsert)
      .select('id');

    if (groupErr || !groups) {
      return NextResponse.json({ error: 'Erro ao criar grupos' }, { status: 500 });
    }

    /* ---------------------------------------------------------------- */
    /* 7️⃣ Embaralha e distribui times                                   */
    /* ---------------------------------------------------------------- */
    const shuffled = [...competitionTeams].sort(() => Math.random() - 0.5);
    const teamsPerGroup = shuffled.length / groups.length;

    let index = 0;
    for (const group of groups) {
      for (let i = 0; i < teamsPerGroup; i++) {
        const team = shuffled[index++];
        await supabase
          .from('competition_teams')
          .update({ group_id: group.id })
          .eq('id', team.id)
          .eq('tenant_id', tenantId);
      }
    }

    /* ---------------------------------------------------------------- */
    /* 8️⃣ Gera jogos da fase de grupos                                  */
    /* ---------------------------------------------------------------- */
    await generateGroupMatches({
      supabase,
      tenantId,
      competitionId: competition_id,
      championshipId: championship_id,
      idaVolta: competition.settings?.specific?.ida_volta ?? true,
    });

    /* ---------------------------------------------------------------- */
    /* 9️⃣ Cria standings zeradas por grupo                              */
    /* ---------------------------------------------------------------- */
    const { data: teamsWithGroup } = await supabase
      .from('competition_teams')
      .select('team_id, group_id')
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);

    const standings = teamsWithGroup!.map((t) => ({
      competition_id,
      tenant_id: tenantId,
      team_id: t.team_id,
      group_id: t.group_id,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_scored: 0,
      goals_against: 0,
      goal_diff: 0,
    }));

    await supabase.from('standings').insert(standings);

    /* ---------------------------------------------------------------- */
    /* ✅ Final                                                          */
    /* ---------------------------------------------------------------- */
    return NextResponse.json({
      success: true,
      groups_created: groups.length,
      teams_per_group: teamsPerGroup,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message ?? 'Erro interno' }, { status: 500 });
  }
}
