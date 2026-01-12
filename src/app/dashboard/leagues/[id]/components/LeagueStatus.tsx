import { createServerSupabase } from '@/lib/supabaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function LeagueStatus({ competitionId }: { competitionId: string }) {
  const { supabase, tenantId } = await createServerSupabase();
  const supabaseAuth = await createSupabaseServerClient();

  const { data: { user } } = await supabaseAuth.auth.getUser();

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

  const label =
    (teams ?? 0) === 0
      ? 'Aguardando times'
      : (matches ?? 0) === 0
        ? 'Pronta para gerar partidas'
        : (finishedMatches ?? 0) === (matches ?? 0)
          ? 'Todas partidas finalizadas'
          : 'Em andamento';

  return (
    <div className="flex items-center justify-between rounded border bg-muted p-3 text-sm">
      <div>
        <strong>Status:</strong> {label}
        <span className="ml-2 text-xs text-muted-foreground">
          (times: {teams ?? 0} • jogos: {matches ?? 0} • finalizados: {finishedMatches ?? 0})
        </span>
      </div>

      {isAdminOrOwner && (
        <div className="text-xs text-muted-foreground">
          Próximo: adicionar botão “Gerar calendário”
        </div>
      )}
    </div>
  );
}
