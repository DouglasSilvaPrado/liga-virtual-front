import { createServerSupabase } from '@/lib/supabaseServer';
import GenerateKnockoutButton from './GenerateKnockoutButton';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import FinalizeGroupsButton from './FinalizeGroupsButton';

export default async function CupStatus({ competitionId }: { competitionId: string }) {
  const { supabase, tenantId } = await createServerSupabase();
  const supabaseAuth = await createSupabaseServerClient();

  /* 🔐 Usuário */
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

  /* ✅ Pega o TIPO da competição (isso faltava) */
  const { data: competition } = await supabase
    .from('competitions')
    .select('type, status, champion_team_id')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single<{
      type: 'divisao' | 'divisao_mata' | 'copa_grupo' | 'copa_grupo_mata' | 'mata_mata';
      status: 'active' | 'finished';
      champion_team_id: string | null;
    }>();

  const competitionType = competition?.type ?? 'copa_grupo';
  const competitionStatus = competition?.status ?? 'active';

  let championName: string | null = null;

  if (competitionStatus === 'finished' && competition?.champion_team_id) {
    const { data: championTeam } = await supabase
      .from('teams')
      .select('name')
      .eq('id', competition.champion_team_id)
      .eq('tenant_id', tenantId)
      .single<{ name: string }>();

    championName = championTeam?.name ?? null;
  }

  /* 📊 Contadores */
  const [
    { count: teams },
    { count: groupMatches },
    { count: knockoutMatches },
    { count: openGroupMatches },
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
      .eq('tenant_id', tenantId)
      .not('group_id', 'is', null),

    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .is('group_id', null),

    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .not('group_id', 'is', null)
      .neq('status', 'finished'),
  ]);

  /* 🧠 Status */
  let statusLabel = 'Aguardando times';

  if ((teams ?? 0) > 0) statusLabel = 'Fase de grupos';
  if ((knockoutMatches ?? 0) > 0) statusLabel = 'Mata-mata';
  if (competitionStatus === 'finished') statusLabel = 'Finalizada';

  const groupFinished = (openGroupMatches ?? 0) === 0;

  const canGenerateKnockout =
    isAdminOrOwner &&
    competitionStatus !== 'finished' &&
    competitionType === 'copa_grupo_mata' &&
    groupFinished &&
    (groupMatches ?? 0) > 0 &&
    (knockoutMatches ?? 0) === 0;

  const canFinalizeGroupsOnly =
    isAdminOrOwner &&
    competitionStatus !== 'finished' &&
    competitionType === 'copa_grupo' &&
    groupFinished &&
    (groupMatches ?? 0) > 0 &&
    (knockoutMatches ?? 0) === 0;

  return (
    <div className="bg-muted flex items-center justify-between rounded border p-3 text-sm">
      <div>
        <strong>Status:</strong> {statusLabel}{' '}
        <span className="text-muted-foreground ml-2 text-xs">({competitionType})</span>
        {competitionStatus === 'finished' && championName && (
          <div className="text-muted-foreground mt-1 text-xs">
            <strong>Campeão:</strong> {championName}
          </div>
        )}
        {!groupFinished && competitionStatus !== 'finished' && (
          <span className="text-muted-foreground ml-2 text-xs">
            (aguardando término da fase de grupos)
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {canGenerateKnockout && <GenerateKnockoutButton competitionId={competitionId} />}

        {canFinalizeGroupsOnly && <FinalizeGroupsButton competitionId={competitionId} />}
      </div>
    </div>
  );
}
