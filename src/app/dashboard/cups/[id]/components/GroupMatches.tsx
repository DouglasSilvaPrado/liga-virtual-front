import { createServerSupabase } from '@/lib/supabaseServer';

export default async function GroupMatches({
  competitionId,
}: {
  competitionId: string;
}) {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id,
      round,
      home_goals,
      away_goals,
      home_team:teams!home_team_id(name),
      away_team:teams!away_team_id(name)
    `)
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('stage', 'group')
    .order('round');

  if (!matches || matches.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Jogos da fase de grupos</h2>

      {matches.map((m) => (
        <div key={m.id} className="flex justify-between border-b py-1 text-sm">
          <span>{m.home_team?.name}</span>
          <span>
            {m.home_goals ?? '-'} x {m.away_goals ?? '-'}
          </span>
          <span>{m.away_team?.name}</span>
        </div>
      ))}
    </div>
  );
}
