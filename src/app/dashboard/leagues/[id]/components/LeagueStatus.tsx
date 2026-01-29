import { createServerSupabase } from '@/lib/supabaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import GenerateLeagueCalendarButton from './GenerateLeagueCalendarButton';
import GenerateKnockoutFromLeagueButton from './GenerateKnockoutFromLeagueButton';

export default async function LeagueStatus({
  competitionId,
  leagueType,
}: {
  competitionId: string;
  leagueType: string;
}) {
  const { supabase, tenantId } = await createServerSupabase();
  const supabaseAuth = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  let isAdminOrOwner = false;

  if (user) {
    const { data: member } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    isAdminOrOwner = member?.role === 'admin' || member?.role === 'owner';
  }

  const [
    { count: teams },
    { count: matches },
    { count: finishedMatches },
    { count: knockoutMatches },
  ] = await Promise.all([
    supabase
      .from('competition_teams')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId),

    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId),

    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .eq('status', 'finished'),

    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .not('knockout_round_id', 'is', null),
  ]);

  const teamsCount = teams ?? 0;
  const matchesCount = matches ?? 0;
  const finishedCount = finishedMatches ?? 0;
  const knockoutCount = knockoutMatches ?? 0;

  const label =
    teamsCount === 0
      ? 'Aguardando times'
      : matchesCount === 0
        ? 'Pronta para gerar partidas'
        : finishedCount === matchesCount
          ? 'Todas partidas finalizadas'
          : 'Em andamento';

  const canGenerateCalendar = isAdminOrOwner && teamsCount >= 2 && matchesCount === 0;

  const canGenerateKnockout =
    leagueType === 'divisao_mata' &&
    isAdminOrOwner &&
    matchesCount > 0 &&
    finishedCount === matchesCount &&
    knockoutCount === 0;

  return (
    <div className="bg-muted flex items-center justify-between rounded border p-3 text-sm">
      <div>
        <strong>Status:</strong> {label}
        <span className="text-muted-foreground ml-2 text-xs">
          (times: {teamsCount} • jogos: {matchesCount} • finalizados: {finishedCount})
          {knockoutCount > 0 && <span className="ml-2">(mata-mata: {knockoutCount} jogos)</span>}
        </span>
      </div>

      {isAdminOrOwner && (
        <div className="flex gap-2">
          {matchesCount === 0 ? (
            <GenerateLeagueCalendarButton
              competitionId={competitionId}
              disabled={!canGenerateCalendar}
            />
          ) : finishedCount === matchesCount && leagueType === 'divisao_mata' ? (
            <GenerateKnockoutFromLeagueButton
              competitionId={competitionId}
              disabled={!canGenerateKnockout}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
