import { createServerSupabase } from '@/lib/supabaseServer';

export default async function CupStatus({
  competitionId,
}: {
  competitionId: string;
}) {
  const { supabase, tenantId } = await createServerSupabase();

  const [
    { count: teams },
    { count: groupMatches },
    { count: knockoutMatches },
  ] = await Promise.all([
    supabase
      .from('competition_teams')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId),

    // 🟢 matches da fase de grupos
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .not('group_id', 'is', null),

    // 🔴 matches de mata-mata
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .is('group_id', null),
  ]);

  let status = 'Aguardando times';

  if ((teams ?? 0) > 0) {
    status = 'Fase de grupos';
  }

  if ((knockoutMatches ?? 0) > 0) {
    status = 'Mata-mata';
  }

  return (
    <div className="rounded border bg-muted p-3 text-sm">
      <strong>Status:</strong> {status}
    </div>
  );
}
