import { createServerSupabase } from '@/lib/supabaseServer';
import LeagueHeader from './components/LeagueHeader';
import type { CompetitionWithSettings } from '@/@types/competition';
import LeagueStatus from './components/LeagueStatus';
import LeagueStandings from './components/LeagueStandings';
import LeagueRounds from './components/LeagueRounds';
import LeagueKnockoutBracket from './components/LeagueKnockoutBracket';

export default async function LeagueDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, tenantId } = await createServerSupabase();

  const { data: league } = await supabase
    .from('competitions_with_settings')
    .select(`
      id,
      name,
      type,
      status,
      champion_team_id,
      champion_team:teams!competitions_champion_team_id_fkey ( name ),
      settings,
      championships ( name )
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single<
    CompetitionWithSettings & {
      status: 'active' | 'finished';
      champion_team?: { name: string } | null;
    }
  >();

  if (!league) {
    return <div className="p-6">Liga não encontrada</div>;
  }

  // 🔍 Existe mata-mata? (na liga a forma correta é: knockout_round_id != null)
  const { count: knockoutMatches, error: koErr } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', league.id)
    .eq('tenant_id', tenantId)
    .not('knockout_round_id', 'is', null);

  if (koErr) {
    // não bloqueia a página, só registra
    console.error('Erro ao verificar mata-mata:', koErr);
  }

  const hasKnockout = (knockoutMatches ?? 0) > 0;

  return (
    <div className="space-y-6 p-6">
      <LeagueHeader league={league} />
      <LeagueStatus competitionId={league.id} leagueType={league.type} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <LeagueStandings competitionId={league.id} settings={league.settings} />

          {/* 🟦 DIVISÃO (liga) */}
          {!hasKnockout && <LeagueRounds competitionId={league.id} />}

          {/* 🟥 MATA-MATA */}
          {hasKnockout && (
            <LeagueKnockoutBracket competitionId={league.id} settings={league.settings} />
          )}
        </div>
      </div>
    </div>
  );
}
