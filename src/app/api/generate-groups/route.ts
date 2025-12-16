import { createServerSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

/**
 * Gera grupos automaticamente para uma competição
 * - Cria competition_groups (A, B, C...)
 * - Distribui os times igualmente
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { competition_id } = body;

  if (!competition_id) {
    return NextResponse.json({ error: 'competition_id é obrigatório' }, { status: 400 });
  }

  const { supabase, tenantId } = await createServerSupabase();

  /* ---------------------------------------------------------------- */
  /* 1️⃣ Valida competição                                            */
  /* ---------------------------------------------------------------- */
  const { data: competition, error: compErr } = await supabase
    .from('competitions')
    .select('id, settings')
    .eq('id', competition_id)
    .eq('tenant_id', tenantId)
    .single();

  if (compErr || !competition) {
    return NextResponse.json({ error: 'Competição inválida' }, { status: 403 });
  }

  const settings = competition.settings;
  const numGroups: number | undefined = settings?.specific?.num_grupos;

  if (!numGroups || numGroups < 1) {
    return NextResponse.json({ error: 'Número de grupos inválido nas settings' }, { status: 400 });
  }

  /* ---------------------------------------------------------------- */
  /* 2️⃣ Busca times da competição                                     */
  /* ---------------------------------------------------------------- */
  const { data: teams, error: teamsErr } = await supabase
    .from('competition_teams')
    .select('id, team_id')
    .eq('competition_id', competition_id)
    .eq('tenant_id', tenantId);

  if (teamsErr || !teams || teams.length === 0) {
    return NextResponse.json({ error: 'Nenhum time encontrado na competição' }, { status: 400 });
  }

  if (teams.length % numGroups !== 0) {
    return NextResponse.json(
      {
        error: `Quantidade de times (${teams.length}) não divisível por ${numGroups} grupos`,
      },
      { status: 400 },
    );
  }

  /* ---------------------------------------------------------------- */
  /* 3️⃣ Cria grupos (A, B, C...)                                      */
  /* ---------------------------------------------------------------- */
  const groups = Array.from({ length: numGroups }).map((_, i) => ({
    competition_id,
    tenant_id: tenantId,
    code: String.fromCharCode(65 + i), // A, B, C...
    name: `Grupo ${String.fromCharCode(65 + i)}`,
  }));

  const { data: createdGroups, error: groupErr } = await supabase
    .from('competition_groups')
    .insert(groups)
    .select('id, code');

  if (groupErr || !createdGroups) {
    return NextResponse.json({ error: 'Erro ao criar grupos' }, { status: 500 });
  }

  /* ---------------------------------------------------------------- */
  /* 4️⃣ Embaralha times (fair play)                                   */
  /* ---------------------------------------------------------------- */
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  const teamsPerGroup = shuffledTeams.length / numGroups;

  /* ---------------------------------------------------------------- */
  /* 5️⃣ Distribui times igualmente                                   */
  /* ---------------------------------------------------------------- */
  const updates: { id: string; group_id: string }[] = [];

  createdGroups.forEach((group, index) => {
    const start = index * teamsPerGroup;
    const end = start + teamsPerGroup;

    shuffledTeams.slice(start, end).forEach((team) => {
      updates.push({
        id: team.id,
        group_id: group.id,
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* 6️⃣ Atualiza competition_teams                                    */
  /* ---------------------------------------------------------------- */
  for (const u of updates) {
    const { error } = await supabase
      .from('competition_teams')
      .update({ group_id: u.group_id })
      .eq('id', u.id)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: 'Erro ao atribuir times aos grupos' }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    groups: createdGroups,
    teams_per_group: teamsPerGroup,
  });
}
