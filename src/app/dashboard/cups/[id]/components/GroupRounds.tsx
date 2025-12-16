import { createServerSupabase } from '@/lib/supabaseServer';
import MatchRow from './MatchRow';

export default async function GroupRounds({
  competitionId,
}: {
  competitionId: string;
}) {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: groups } = await supabase
    .from('competition_groups')
    .select(`
      id,
      name,
      code,
      matches (
        id,
        round,
        home_goals,
        away_goals,
        home_team:teams!home_team_id(id, name),
        away_team:teams!away_team_id(id, name)
      )
    `)
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('matches.stage', 'group')
    .order('code')
    .order('round', { foreignTable: 'matches' });

  if (!groups || groups.length === 0) {
    return <p>Nenhuma rodada encontrada</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Fase de Grupos</h2>

      {groups.map((group) => {
        const rounds = group.matches.reduce<Record<number, any[]>>(
          (acc, match) => {
            acc[match.round] ??= [];
            acc[match.round].push(match);
            return acc;
          },
          {},
        );

        return (
          <div key={group.id} className="space-y-3">
            <h3 className="font-medium">
              {group.name ?? `Grupo ${group.code}`}
            </h3>

            {Object.entries(rounds).map(([round, matches]) => (
              <div key={round} className="rounded border p-3 space-y-2">
                <p className="text-sm font-medium">Rodada {round}</p>

                {matches.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
