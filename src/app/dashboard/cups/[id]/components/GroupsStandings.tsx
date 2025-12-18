import { CompetitionGroup } from '@/@types/competition';
import { Standing } from '@/@types/standing';
import { Team } from '@/@types/team';
import { createServerSupabase } from '@/lib/supabaseServer';


export type StandingWithTeam = Pick<
  Standing,
  | 'id'
  | 'points'
  | 'wins'
  | 'draws'
  | 'losses'
  | 'goals_scored'
  | 'goals_against'
  | 'goal_diff'
> & {
  teams: Pick<Team, 'name'> | null;
};

export type CompetitionGroupWithStandings = Pick<
  CompetitionGroup,
  'id' | 'name' | 'code'
> & {
  standings: StandingWithTeam[] | null;
};


export default async function GroupsStandings({
  competitionId,
}: {
  competitionId: string;
}) {
  const { supabase, tenantId } = await createServerSupabase();

  const { data } = await supabase
    .from('competition_groups')
    .select(`
      id,
      name,
      code,
      standings (
        id,
        points,
        wins,
        draws,
        losses,
        goals_scored,
        goals_against,
        goal_diff,
        teams ( name )
      )
    `)
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('code');

  const groups = data as CompetitionGroupWithStandings[] | null;

  if (!groups || groups.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Grupos</h2>

      {groups.map((group) => {
        console.log("🚀 ~ GroupsStandings ~ group:", group)
        return (
          <div key={group.id} className="rounded border p-3">
            <h3 className="font-medium mb-2">{group.name}</h3>
  
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>Time</th>
                  <th>P</th>
                  <th>V</th>
                  <th>E</th>
                  <th>D</th>
                  <th>SG</th>
                </tr>
              </thead>
              <tbody>
                {group.standings
                  ?.sort(
                    (a, b) =>
                      b.points - a.points ||
                      b.goal_diff - a.goal_diff ||
                      b.goals_scored - a.goals_scored,
                  )
                  .map((s) => (
                    <tr key={s.id}>
                      <td>{s.teams?.name}</td>
                      <td>{s.points}</td>
                      <td>{s.wins}</td>
                      <td>{s.draws}</td>
                      <td>{s.losses}</td>
                      <td>{s.goal_diff}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
