import { createServerSupabase } from '@/lib/supabaseServer';
import MatchRow from './MatchRow';

type MatchGroup = {
  id: string;
  name: string;
  code: string;
};

type MatchSelect = {
  id: string;
  round: number;
  score_home: number | null;
  score_away: number | null;
  group: MatchGroup | null;
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
};


export type MatchWithTeamName = {
  id: string;
  group_round: number;
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



type GroupedRounds = Record<
  string,
  {
    groupName: string;
    groupCode: string;
    rounds: Record<number, MatchWithTeamName[]>;
  }
>;

type MatchFromDB = {
  id: string;
  group_round: number;
  score_home: number | null;
  score_away: number | null;
  status: 'scheduled' | 'in_progress' | 'finished' | 'canceled';

  group: MatchGroup | null;

  round_info: {
    round: number;
    is_open: boolean;
  } | null;

  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
};

function isCompleteMatch(
  m: MatchFromDB
): m is MatchWithTeamName {
  return (
    m.group !== null &&
    m.home_team !== null &&
    m.away_team !== null &&
    m.round_info !== null
  );
}


export default async function GroupRounds({
  competitionId,
}: {
  competitionId: string;
}) {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: dataMatch, error } = await supabase
  .from('matches')
  .select(`
    id,
    score_home,
    score_away,
    group_round,
    status,
    group:competition_groups!matches_group_fk (
      id,
      name,
      code
    ),
    round_info:group_rounds!inner (
      round,
      is_open
    ),
    home_team:teams!team_home (
      id,
      name
    ),
    away_team:teams!team_away (
      id,
      name
    )
  `)
  .eq('competition_id', competitionId)
  .eq('tenant_id', tenantId)
  .order('group_round', { ascending: true });



  const data = dataMatch as MatchFromDB[] | null;


  if (error) {
    console.error(error);
    return <p>Erro ao carregar rodadas</p>;
  }

  if (!data || data.length === 0) {
    return <p>Nenhuma rodada encontrada</p>;
  }

  const matches: MatchWithTeamName[] = (data ?? []).filter(isCompleteMatch);


  const grouped = matches.reduce<GroupedRounds>((acc, match) => {
    const groupId = match.group.id;
    const round = match.group_round;

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


  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Fase de Grupos</h2>

      {Object.values(grouped)
        .sort((a, b) => a.groupCode.localeCompare(b.groupCode))
        .map((group) => (
        <div key={group.groupName} className="space-y-4">
          <h2 className="text-lg font-semibold">{group.groupName}</h2>

          {Object.entries(group.rounds).map(([round, matches]) => (
            <div key={round} className="rounded border p-4 space-y-2">
              <h3 className="font-medium">Rodada {round}</h3>

              {matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          ))}
        </div>
      ))}

    </div>
  );
}
