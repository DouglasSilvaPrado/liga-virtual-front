import { createServerSupabase } from '@/lib/supabaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import MatchRow from './MatchRow';
import ToggleRoundButton from './ToggleRoundButton';

/* ───────────────────────── TYPES ───────────────────────── */

type MatchGroup = {
  id: string;
  name: string;
  code: string;
};

export type MatchWithTeamName = {
  id: string;
  score_home: number | null;
  score_away: number | null;
  status: 'scheduled' | 'in_progress' | 'finished' | 'canceled';

  round_info: {
    round: number;
    is_open: boolean;
  };

  group: MatchGroup;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
};

type MatchFromDB = {
  id: string;
  score_home: number | null;
  score_away: number | null;
  status: 'scheduled' | 'in_progress' | 'finished' | 'canceled';

  group: MatchGroup | null;
  round_info: { round: number; is_open: boolean } | null;
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
};

type GroupedRounds = Record<
  string,
  {
    groupName: string;
    groupCode: string;
    rounds: Record<number, MatchWithTeamName[]>;
  }
>;

/* ───────────────────────── HELPERS ───────────────────────── */

function isCompleteMatch(m: MatchFromDB): m is MatchWithTeamName {
  return (
    m.group !== null &&
    m.home_team !== null &&
    m.away_team !== null &&
    m.round_info !== null
  );
}

/* ───────────────────────── COMPONENT ───────────────────────── */

export default async function GroupRounds({
  competitionId,
}: {
  competitionId: string;
}) {
  const { supabase, tenantId } = await createServerSupabase();
  const supabaseAuth = await createSupabaseServerClient();

  /* 🔐 Usuário logado */
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  let isAdminOrOwner = false;
  let memberTeamId: string | null = null;

  /* 🔑 Descobre role e time */
  if (user) {
    const { data: member } = await supabase
      .from('tenant_members')
      .select('id, role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    isAdminOrOwner =
      member?.role === 'admin' || member?.role === 'owner';

    if (member?.role === 'member') {
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('tenant_member_id', member.id)
        .eq('tenant_id', tenantId)
        .single();

      memberTeamId = team?.id ?? null;
    }
  }

  /* 📥 Query base (CORRIGIDA) */
  let query = supabase
    .from('matches')
    .select(`
      id,
      score_home,
      score_away,
      status,
      group:competition_groups!matches_group_fk (
        id,
        name,
        code
      ),
      round_info:group_rounds!matches_group_round_id_fkey (
        round,
        is_open
      ),
      home_team:teams!matches_team_home_fk (
        id,
        name
      ),
      away_team:teams!matches_team_away_fk (
        id,
        name
      )
    `)
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('round', {
      referencedTable: 'group_rounds',
      ascending: true,
    });

  /* 🔒 Filtro para MEMBER */
  if (!isAdminOrOwner && memberTeamId) {
    query = query
      .or(
        `team_home.eq.${memberTeamId},team_away.eq.${memberTeamId}`
      )
      .eq('round_info.is_open', true);
  }

  const { data: dataMatch, error } = await query;

  if (error) {
    console.error(error);
    return <p>Erro ao carregar rodadas</p>;
  }

  if (!dataMatch || dataMatch.length === 0) {
    return <p>Nenhuma rodada encontrada</p>;
  }

  const matches = (dataMatch as unknown as MatchFromDB[]).filter(isCompleteMatch);

  /* 🧠 Agrupamento por grupo → rodada */
  const grouped = matches.reduce<GroupedRounds>((acc, match) => {
    const groupId = match.group.id;
    const round = match.round_info.round;

    if (!acc[groupId]) {
      acc[groupId] = {
        groupName: match.group.name,
        groupCode: match.group.code,
        rounds: {},
      };
    }

    acc[groupId].rounds[round] ??= [];
    acc[groupId].rounds[round].push(match);

    return acc;
  }, {});

  /* 🖥️ Render */
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Fase de Grupos</h2>

      {Object.values(grouped).map((group) => (
        <div key={group.groupCode} className="space-y-4">
          <h2 className="text-lg font-semibold">
            {group.groupName}
          </h2>

          {Object.entries(group.rounds).map(([round, matches]) => {
            const isOpen = matches[0].round_info.is_open;
            const groupId = matches[0].group.id;

            return (
              <div
                key={round}
                className="rounded border p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    Rodada {round}
                  </h3>

                  {isAdminOrOwner && (
                    <ToggleRoundButton
                      competitionId={competitionId}
                      groupId={groupId}
                      round={Number(round)}
                      isOpen={isOpen}
                    />
                  )}
                </div>

                {matches.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
