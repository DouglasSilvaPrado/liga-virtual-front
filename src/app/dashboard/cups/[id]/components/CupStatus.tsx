import { createServerSupabase } from '@/lib/supabaseServer';
import GenerateKnockoutButton from './GenerateKnockoutButton';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    isAdminOrOwner =
      member?.role === 'admin' || member?.role === 'owner';
  }

  /* 📊 Contadores */
  const [
    { count: teams },
    { count: groupMatches },
    { count: knockoutMatches },
    { count: openGroupMatches },
  ] = await Promise.all([
    // Times
    supabase
      .from('competition_teams')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId),

    // Jogos da fase de grupos
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .not('group_id', 'is', null),

    // Jogos do mata-mata
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .is('group_id', null),

    // Jogos de grupo NÃO finalizados
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .not('group_id', 'is', null)
      .neq('status', 'finished'),
  ]);

  /* 🧠 Status */
  let status = 'Aguardando times';

  if ((teams ?? 0) > 0) {
    status = 'Fase de grupos';
  }

  if ((knockoutMatches ?? 0) > 0) {
    status = 'Mata-mata';
  }

  const groupFinished = (openGroupMatches ?? 0) === 0;

  const canGenerateKnockout =
    isAdminOrOwner &&
    groupFinished &&
    (groupMatches ?? 0) > 0 &&
    (knockoutMatches ?? 0) === 0;

  return (
    <div className="flex items-center justify-between rounded border bg-muted p-3 text-sm">
      <div>
        <strong>Status:</strong> {status}
        {!groupFinished && (
          <span className="ml-2 text-xs text-muted-foreground">
            (aguardando término da fase de grupos)
          </span>
        )}
      </div>

      {canGenerateKnockout && (
        <GenerateKnockoutButton competitionId={competitionId} />
      )}
    </div>
  );
}
