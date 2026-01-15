import { createServerSupabase } from '@/lib/supabaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import GenerateLeagueCalendarButton from './GenerateLeagueCalendarButton';

export default async function LeagueStatus({ competitionId }: { competitionId: string }) {
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

  const [{ count: teams }, { count: matches }, { count: finishedMatches }] = await Promise.all([
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
  ]);

  const teamsCount = teams ?? 0;
  const matchesCount = matches ?? 0;
  const finishedCount = finishedMatches ?? 0;

  const label =
    teamsCount === 0
      ? 'Aguardando times'
      : matchesCount === 0
        ? 'Pronta para gerar partidas'
        : finishedCount === matchesCount
          ? 'Todas partidas finalizadas'
          : 'Em andamento';

  const canGenerate = isAdminOrOwner && teamsCount >= 2 && matchesCount === 0;

  return (
    <div className="flex items-center justify-between rounded border bg-muted p-3 text-sm">
      <div>
        <strong>Status:</strong> {label}
        <span className="ml-2 text-xs text-muted-foreground">
          (times: {teamsCount} • jogos: {matchesCount} • finalizados: {finishedCount})
        </span>
      </div>

      {isAdminOrOwner && (
        <GenerateLeagueCalendarButton competitionId={competitionId} disabled={!canGenerate} />
      )}
    </div>
  );
}
