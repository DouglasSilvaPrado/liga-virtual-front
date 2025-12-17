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


type MatchWithTeamName = {
  id: string;
  round: number;
  group_round: number;
  score_home: number | null;
  score_away: number | null;
  group: MatchGroup;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
};


type GroupedRounds = Record<
  string,
  {
    groupName: string;
    rounds: Record<number, MatchWithTeamName[]>;
  }
>;

function isCompleteMatch(
  m: MatchSelect
): m is MatchWithTeamName {
  return (
    m.group !== null &&
    m.home_team !== null &&
    m.away_team !== null
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
      round,
      group_round,
      score_home,
      score_away,
      group:competition_groups!matches_group_fk (
        id,
        name,
        code
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


  const data = dataMatch as MatchSelect[] | null;

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

      {Object.values(grouped).map((group) => (
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
