import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { generateGroupMatches } from '@/lib/generateGroupMatches';
import { generateLeagueMatches } from '@/lib/generateLeagueMatches';

type CompetitionType = 'divisao' | 'divisao_mata' | 'copa_grupo' | 'copa_grupo_mata' | 'mata_mata';

type TeamPayload = {
  team_id: string;
  group_id: string | null;
};

type CompetitionSettingsRow = {
  id: string;
  type: CompetitionType;
  settings: {
    specific?: Record<string, unknown>;
  };
};

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|');
}

function getInitialRound(totalTeams: number): number {
  return Math.log2(totalTeams);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      competition_id?: string;
      championship_id?: string;
      teams?: TeamPayload[];
    };

    const competition_id = body.competition_id;
    const championship_id = body.championship_id;
    const teams = body.teams;

    if (
      !isString(competition_id) ||
      !isString(championship_id) ||
      !Array.isArray(teams) ||
      teams.length === 0
    ) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    const { supabase, tenantId } = await createServerSupabase();

    // 🔐 auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    // 🔎 valida competição + settings
    const { data: competition, error: compErr } = await supabase
      .from('competitions_with_settings')
      .select('id, type, settings')
      .eq('id', competition_id)
      .eq('tenant_id', tenantId)
      .single<CompetitionSettingsRow>();

    if (compErr || !competition) {
      return NextResponse.json({ error: 'Competição inválida' }, { status: 403 });
    }

    const type = competition.type;

    // ✅ para criar do zero sem sujeira (evita duplicar registros em testes)
    // (Se depois você quiser bloquear isso em produção, a gente ajusta com checks.)
    await supabase
      .from('matches')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);
    await supabase
      .from('standings')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);
    await supabase
      .from('competition_groups')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);
    await supabase
      .from('group_rounds')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);
    await supabase
      .from('knockout_rounds')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);
    await supabase
      .from('competition_teams')
      .delete()
      .eq('competition_id', competition_id)
      .eq('tenant_id', tenantId);

    // 1) insere competition_teams
    const inserts = teams
      .filter((t) => isString(t.team_id))
      .map((t) => ({
        competition_id,
        championship_id,
        tenant_id: tenantId,
        team_id: t.team_id,
        group_id: t.group_id ?? null,
      }));

    if (inserts.length === 0) {
      return NextResponse.json({ error: 'Nenhum time válido enviado' }, { status: 400 });
    }

    const { error: insertErr } = await supabase.from('competition_teams').insert(inserts);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    // 2) branch por tipo
    const specific = (competition.settings?.specific ?? {}) as Record<string, unknown>;

    // ─────────────────────────────────────────────────────────
    // A) COPAS COM GRUPOS (mantém seu fluxo)
    // ─────────────────────────────────────────────────────────
    if (type === 'copa_grupo' || type === 'copa_grupo_mata') {
      const numGroups = safeNumber(specific.num_grupos, 0);

      if (!numGroups || numGroups < 1) {
        return NextResponse.json({ success: true, mode: 'copa_sem_num_grupos' });
      }

      // busca times inseridos (id + team_id)
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

      // cria grupos (A,B,C...)
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

      // distribui times
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

      // gera jogos fase de grupos
      await generateGroupMatches({
        supabase,
        tenantId,
        competitionId: competition_id,
        championshipId: championship_id,
        idaVolta: typeof specific.ida_volta === 'boolean' ? specific.ida_volta : true,
      });

      // cria standings por grupo
      const { data: teamsWithGroup } = await supabase
        .from('competition_teams')
        .select('team_id, group_id')
        .eq('competition_id', competition_id)
        .eq('tenant_id', tenantId);

      const standingsInserts = (teamsWithGroup ?? []).map((t) => ({
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

      if (standingsInserts.length) {
        await supabase.from('standings').insert(standingsInserts);
      }

      return NextResponse.json({
        success: true,
        mode: type,
        groups_created: groups.length,
        teams_per_group: teamsPerGroup,
      });
    }

    // ─────────────────────────────────────────────────────────
    // B) LIGAS (divisao / divisao_mata)
    // ─────────────────────────────────────────────────────────
    if (type === 'divisao' || type === 'divisao_mata') {
      const teamIds = inserts.map((i) => i.team_id);

      // standings (group_id null)
      const standingsInserts = teamIds.map((team_id) => ({
        competition_id,
        tenant_id: tenantId,
        team_id,
        group_id: null,
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_scored: 0,
        goals_against: 0,
        goal_diff: 0,
      }));

      await supabase.from('standings').insert(standingsInserts);

      // gera jogos da liga
      const idaVoltaLiga = typeof specific.ida_volta === 'boolean' ? specific.ida_volta : true;

      const out = await generateLeagueMatches({
        supabase,
        tenantId,
        competitionId: competition_id,
        championshipId: championship_id,
        teamIds,
        idaVolta: idaVoltaLiga,
      });

      return NextResponse.json({
        success: true,
        mode: type,
        ida_volta: idaVoltaLiga,
        rounds: out.rounds,
        matches: out.matches,
      });
    }

    // ─────────────────────────────────────────────────────────
    // C) MATA-MATA DIRETO (mata_mata)
    // ─────────────────────────────────────────────────────────
    if (type === 'mata_mata') {
      const teamIds = inserts.map((i) => i.team_id);
      const totalTeams = teamIds.length;

      // precisa potência de 2
      const isPowerOfTwo = (n: number) => n > 1 && (n & (n - 1)) === 0;
      if (!isPowerOfTwo(totalTeams)) {
        return NextResponse.json(
          { error: 'Mata-mata direto exige número de times potência de 2 (ex: 2,4,8,16...)' },
          { status: 400 },
        );
      }

      const roundNumber = getInitialRound(totalTeams);

      const roundName =
        roundNumber === 1
          ? 'Final'
          : roundNumber === 2
            ? 'Semifinal'
            : roundNumber === 3
              ? 'Quartas'
              : roundNumber === 4
                ? 'Oitavas'
                : `Fase ${roundNumber}`;

      const { data: round, error: roundError } = await supabase
        .from('knockout_rounds')
        .insert({
          competition_id,
          tenant_id: tenantId,
          round_number: roundNumber,
          name: roundName,
          is_current: true,
          is_finished: false,
        })
        .select()
        .single<{ id: string }>();

      if (roundError || !round) {
        return NextResponse.json({ error: 'Erro ao criar rodada do mata-mata' }, { status: 500 });
      }

      // chaveamento
      const chaveAutomatica =
        typeof specific.chave_automatica === 'string' ? specific.chave_automatica : 'aleatorio';
      const idaVolta =
        typeof specific.jogos_ida_volta === 'boolean'
          ? specific.jogos_ida_volta
          : typeof specific.mata_em_ida_e_volta === 'boolean'
            ? specific.mata_em_ida_e_volta
            : false;

      const shuffled = [...teamIds].sort(() => Math.random() - 0.5);

      // melhor_x_pior: ordenação aqui não existe (sem standings),
      // então no mata_mata direto eu mantenho aleatório por enquanto.
      // Depois você pode adaptar para seed/ranking.
      const pairs: Array<{ a: string; b: string }> = [];

      if (chaveAutomatica === 'melhor_x_pior') {
        for (let i = 0; i < shuffled.length / 2; i++) {
          pairs.push({ a: shuffled[i], b: shuffled[shuffled.length - 1 - i] });
        }
      } else {
        for (let i = 0; i < shuffled.length; i += 2) {
          pairs.push({ a: shuffled[i], b: shuffled[i + 1] });
        }
      }

      type MatchInsert = {
        competition_id: string;
        championship_id: string;
        tenant_id: string;
        knockout_round_id: string;
        team_home: string;
        team_away: string;
        round: number;
        leg: number;
        status: 'scheduled';
        group_id: null;
        group_round_id: null;
      };

      const matchInserts: MatchInsert[] = [];

      for (const p of pairs) {
        matchInserts.push({
          competition_id,
          championship_id,
          tenant_id: tenantId,
          knockout_round_id: round.id,
          team_home: p.a,
          team_away: p.b,
          round: roundNumber,
          leg: 1,
          status: 'scheduled',
          group_id: null,
          group_round_id: null,
        });

        if (idaVolta) {
          matchInserts.push({
            competition_id,
            championship_id,
            tenant_id: tenantId,
            knockout_round_id: round.id,
            team_home: p.b,
            team_away: p.a,
            round: roundNumber,
            leg: 2,
            status: 'scheduled',
            group_id: null,
            group_round_id: null,
          });
        }
      }

      const { error: matchError } = await supabase.from('matches').insert(matchInserts);
      if (matchError) {
        return NextResponse.json({ error: 'Erro ao criar jogos do mata-mata' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        mode: 'mata_mata_direto',
        round_number: roundNumber,
        round_name: roundName,
        jogos_criados: matchInserts.length,
      });
    }

    return NextResponse.json({ success: true, mode: 'unknown_type' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
