import { createServerSupabase } from '@/lib/supabaseServer';
import GenerateKnockoutButton from './GenerateKnockoutButton';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export default async function CupStatus({
  competitionId,
}: {
  competitionId: string;
}) {
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
    .select('type, status')
    .eq('id', competitionId)
    .eq('tenant_id', tenantId)
    .single<{
      type:
        | 'divisao'
        | 'divisao_mata'
        | 'copa_grupo'
        | 'copa_grupo_mata'
        | 'mata_mata';
      status: 'active' | 'finished';
    }>();

  const competitionType = competition?.type ?? 'copa_grupo';
  const competitionStatus = competition?.status ?? 'active';

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
    <div className="flex items-center justify-between rounded border bg-muted p-3 text-sm">
      <div>
        <strong>Status:</strong> {statusLabel}{' '}
        <span className="ml-2 text-xs text-muted-foreground">
          ({competitionType})
        </span>

        {!groupFinished && competitionStatus !== 'finished' && (
          <span className="ml-2 text-xs text-muted-foreground">
            (aguardando término da fase de grupos)
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {canGenerateKnockout && (
          <GenerateKnockoutButton competitionId={competitionId} />
        )}

        {canFinalizeGroupsOnly && (
          <form action={`/api/competitions/${competitionId}/finalize-groups`} method="post">
            <Button variant="default" size="sm" type="submit">
              Finalizar competição
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
