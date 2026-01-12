import { createServerSupabase } from '@/lib/supabaseServer';
import LeagueHeader from './components/LeagueHeader';
import type { CompetitionWithSettings } from '@/@types/competition';
import LeagueStatus from './components/LeagueStatus';
import LeagueStandings from './components/LeagueStandings';
import LeagueMatches from './components/LeagueMatches';
import LeagueTeams from './components/LeagueTeams';

export default async function LeagueDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log("🚀 ~ LeagueDetailsPage ~ id:", id)
  const { supabase, tenantId } = await createServerSupabase();
  console.log("🚀 ~ LeagueDetailsPage ~ tenantId:", tenantId)

  const { data: league, error: leagueError } = await supabase
    .from('competitions_with_settings')
    .select(
      `
      id,
      name,
      type,
      status,
      champion_team_id,
      settings,
      championships ( name )
    `,
    )
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single<CompetitionWithSettings & { status: 'active' | 'finished' }>();

  if (!league) {
    return <div className="p-6">Liga não encontrada</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <LeagueHeader league={league} />
      <LeagueStatus competitionId={league.id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <LeagueStandings competitionId={league.id} settings={league.settings} />
          <LeagueMatches competitionId={league.id} />
        </div>

        <div className="space-y-6">
          <LeagueTeams competitionId={league.id} />
        </div>
      </div>
    </div>
  );
}
