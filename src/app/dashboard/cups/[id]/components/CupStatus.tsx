import { createServerSupabase } from '@/lib/supabaseServer';

export default async function CupStatus({
  competitionId,
}: {
  competitionId: string;
}) {
  const { supabase, tenantId } = await createServerSupabase();

  const [{ count: teams }, { count: matches }] = await Promise.all([
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
  ]);

  let status = 'Aguardando times';

  if ((teams ?? 0) > 0 && (matches ?? 0) === 0) {
    status = 'Fase de grupos';
  }

  if ((matches ?? 0) > 0) {
    status = 'Mata-mata';
  }

  return (
    <div className="rounded border bg-muted p-3 text-sm">
      <strong>Status:</strong> {status}
    </div>
  );
}
