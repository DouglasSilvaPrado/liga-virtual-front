// src/app/api/competition-teams/create/route.ts

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { generateGroupMatches } from '@/lib/generateGroupMatches';
import type { CompetitionSettingsData, CompetitionType } from '@/@types/competition';

/* ───────────────────────── TYPES ───────────────────────── */

type TeamPayload = {
  team_id: string;
  group_id?: string | null;
};

type CompetitionRow = {
  id: string;
  type: CompetitionType;
  settings: unknown;
};

type CompetitionTeamRow = {
  id: string;
  team_id: string;
};

type GroupRow = {
  id: string;
};

type StandingsInsert = {
  competition_id: string;
  tenant_id: string;
  team_id: string;
  group_id: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_against: number;
  goal_diff: number;
};

type KnockoutRoundInsert = {
  competition_id: string;
  tenant_id: string;
  round_number: number;
  name: string;
  is_current: boolean;
  is_finished: boolean;
};

type KnockoutRoundRow = {
  id: string;
  round_number: number;
};

type MatchInsert = {
  competition_id: string;
  championship_id: string;
  tenant_id: string;
  knockout_round_id: string;
  team_home: string;
  team_away: string;
  round: number;
  leg: 1 | 2;
  status: 'scheduled';
};

/* ───────────────────────── HELPERS ───────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

function initialRoundNumber(totalTeams: number): number {
  // Ex: 8 times -> 3 (Quartas), 4 times -> 2 (Semi), 2 times -> 1 (Final)
  return Math.log2(totalTeams);
}

function roundName(roundNumber: number): string {
  if (roundNumber === 1) return 'Final';
  if (roundNumber === 2) return 'Semifinal';
  if (roundNumber === 3) return 'Quartas';
  if (roundNumber === 4) return 'Oitavas';
  return `Fase ${roundNumber}`;
}

function isCompetitionSettingsData(x: unknown): x is CompetitionSettingsData {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return 'format' in o && 'specific' in o && 'match_settings' in o;
}

function getSettingsObject(settings: unknown): CompetitionSettingsData | null {
  // Se no seu projeto settings às vezes vier como string, adapte aqui
  // ou troque por normalizeCompetitionSettings(...)
  if (!isCompetitionSettingsData(settings)) return null;
  return settings;
}

function isCopaGrupoSpecific(s: unknown): s is { ida_volta?: boolean; num_grupos: number } {
  if (typeof s !== 'object' || s === null) return false;
  const o = s as Record<string, unknown>;
  return typeof o.num_grupos === 'number';
}

function isMataMataSpecific(
  s: unknown,
): s is { mata_em_ida_e_volta?: boolean; final_ida_volta?: boolean } {
  return typeof s === 'object' && s !== null;
}

function getIdaVoltaForRound(settings: CompetitionSettingsData, roundNumber: number): boolean {
  const specific = settings.specific;

  // roundNumber === 1 => Final
  if (roundNumber === 1) {
    if (isMataMataSpecific(specific)) return specific.final_ida_volta === true;
    return false;
  }

  if (isMataMataSpecific(specific)) return specific.mata_em_ida_e_volta === true;
  return false;
}

/* ───────────────────────── MAIN ───────────────────────── */

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      competition_id?: string;
      championship_id?: string;
      teams?: TeamPayload[];
    };

    const competition_id = body.competition_id;
    const championship_id = body.championship_id;
    const teams = body.teams ?? [];

    if (!competition_id || !championship_id || !Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    const { supabase, tenantId } = await createServerSupabase();

    /* ───────────────────────── 1) Valida competição ───────────────────────── */

    const { data: competition, error: compErr } = await supabase
      .from('competitions_with_settings')
      .select('id, type, settings')
      .eq('id', competition_id)
      .eq('tenant_id', tenantId)
      .single<CompetitionRow>();

    if (compErr || !competition) {
      return NextResponse.json({ error: 'Competição inválida' }, { status: 403 });
    }

    const settings = getSettingsObject(competition.settings);

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings inválido/ausente na competição' },
        { status: 400 },
      );
    }

    const isGroupCompetition =
      competition.type === 'copa_grupo' || competition.type === 'copa_grupo_mata';

    const isKnockoutOnly = competition.type === 'mata_mata';

    /* ───────────────────────── 2) Insere os times ───────────────────────── */

    const inserts = teams.map((t) => ({
      competition_id,
      championship_id,
      tenant_id: tenantId,
      team_id: t.team_id,
      group_id: isGroupCompetition ? (t.group_id ?? null) : null,
    }));

    const { error: insertErr } = await supabase.from('competition_teams').insert(inserts);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    /* ───────────────────────── 3) Se for MATA-MATA direto ───────────────────────── */

    if (isKnockoutOnly) {
      const totalTeams = teams.length;

      if (totalTeams < 2) {
        return NextResponse.json(
          { error: 'Mata-mata precisa de no mínimo 2 times' },
          { status: 400 },
        );
      }

      if (!isPowerOfTwo(totalTeams)) {
        return NextResponse.json(
          {
            error: `No mata-mata direto, a quantidade de times deve ser potência de 2 (2,4,8,16...). Recebido: ${totalTeams}`,
          },
          { status: 400 },
        );
      }

      // garante que não existe knockout já criado
      const { count: existingKnockoutMatches } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .eq('competition_id', competition_id)
        .eq('tenant_id', tenantId)
        .not('knockout_round_id', 'is', null);

      if ((existingKnockoutMatches ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Este mata-mata já possui jogos gerados' },
          { status: 409 },
        );
      }

      const roundNumber = initialRoundNumber(totalTeams);
      const name = roundName(roundNumber);

      const { data: round, error: roundErr } = await supabase
        .from('knockout_rounds')
        .insert({
          competition_id,
          tenant_id: tenantId,
          round_number: roundNumber,
          name,
          is_current: true,
          is_finished: false,
        } satisfies KnockoutRoundInsert)
        .select('id, round_number')
        .single<KnockoutRoundRow>();

      if (roundErr || !round) {
        return NextResponse.json({ error: 'Erro ao criar rodada do mata-mata' }, { status: 500 });
      }

      const idaVolta = getIdaVoltaForRound(settings, round.round_number);

      // embaralha e pareia
      const shuffledTeams = shuffle(teams.map((t) => t.team_id));
      const matchInserts: MatchInsert[] = [];

      for (let i = 0; i < shuffledTeams.length; i += 2) {
        const a = shuffledTeams[i];
        const b = shuffledTeams[i + 1];
        if (!a || !b) continue;

        matchInserts.push({
          competition_id,
          championship_id,
          tenant_id: tenantId,
          knockout_round_id: round.id,
          team_home: a,
          team_away: b,
          round: round.round_number,
          leg: 1,
          status: 'scheduled',
        });

        if (idaVolta) {
          matchInserts.push({
            competition_id,
            championship_id,
            tenant_id: tenantId,
            knockout_round_id: round.id,
            team_home: b,
            team_away: a,
            round: round.round_number,
            leg: 2,
            status: 'scheduled',
          });
        }
      }

      const { error: matchErr } = await supabase.from('matches').insert(matchInserts);

      if (matchErr) {
        return NextResponse.json({ error: 'Erro ao criar jogos do mata-mata' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        mode: 'mata_mata_direto',
        round_number: round.round_number,
        round_name: name,
        jogos_criados: matchInserts.length,
      });
    }

    /* ───────────────────────── 4) Se NÃO for competição de grupos ───────────────────────── */

    if (!isGroupCompetition) {
      // outros tipos que não são grupos nem mata_mata: só inserir times
      return NextResponse.json({ success: true, mode: 'somente_times' });
    }

    /* ───────────────────────── 5) Competição com grupos ───────────────────────── */

    const specific = settings.specific;

    const numGroups = isCopaGrupoSpecific(specific) ? specific.num_grupos : undefined;

    if (!numGroups || numGroups < 1) {
      return NextResponse.json(
        { error: 'Config específica inválida: num_grupos ausente' },
        { status: 400 },
      );
    }

    // busca os competition_teams recém inseridos
    const { data: competitionTeams, error: teamsErr } = await supabase
      .from('competition_teams')
      .select('id, team_id')
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId)
      .returns<CompetitionTeamRow[]>();

    if (teamsErr || !competitionTeams?.length) {
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

    // remove grupos antigos (segurança)
    await supabase
      .from('competition_groups')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);

    // cria grupos
    const groupsToInsert = Array.from({ length: numGroups }).map((_, i) => ({
      competition_id,
      tenant_id: tenantId,
      code: String.fromCharCode(65 + i),
      name: `Grupo ${String.fromCharCode(65 + i)}`,
    }));

    const { data: groups, error: groupErr } = await supabase
      .from('competition_groups')
      .insert(groupsToInsert)
      .select('id')
      .returns<GroupRow[]>();

    if (groupErr || !groups?.length) {
      return NextResponse.json({ error: 'Erro ao criar grupos' }, { status: 500 });
    }

    // distribui times (embaralhado)
    const shuffled = shuffle(competitionTeams);
    const teamsPerGroup = shuffled.length / groups.length;

    let index = 0;
    for (const group of groups) {
      for (let i = 0; i < teamsPerGroup; i++) {
        const team = shuffled[index++];
        if (!team) continue;

        await supabase
          .from('competition_teams')
          .update({ group_id: group.id })
          .eq('id', team.id)
          .eq('tenant_id', tenantId);
      }
    }

    // gera jogos dos grupos
    const idaVoltaGrupo = isCopaGrupoSpecific(specific) ? (specific.ida_volta ?? true) : true;

    await generateGroupMatches({
      supabase,
      tenantId,
      competitionId: competition_id,
      championshipId: championship_id,
      idaVolta: idaVoltaGrupo,
    });

    // cria standings zeradas (upsert pra não estourar constraint)
    const { data: teamsWithGroup } = await supabase
      .from('competition_teams')
      .select('team_id, group_id')
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId)
      .not('group_id', 'is', null)
      .returns<{ team_id: string; group_id: string }[]>();

    if (teamsWithGroup?.length) {
      const standings: StandingsInsert[] = teamsWithGroup.map((t) => ({
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

      await supabase.from('standings').upsert(standings, {
        // se sua constraint for outro nome, ajuste aqui
        onConflict: 'competition_id,team_id,group_id',
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'fase_de_grupos',
      groups_created: groups.length,
      teams_per_group: teamsPerGroup,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
