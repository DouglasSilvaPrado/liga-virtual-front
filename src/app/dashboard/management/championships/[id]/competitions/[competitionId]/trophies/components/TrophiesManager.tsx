import { createServerSupabase } from '@/lib/supabaseServer';
import TrophyClient from './TrophyClient';

export default async function TrophiesManager({ competitionId }: { competitionId: string }) {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: trophies } = await supabase
    .from('trophies')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  return (
    <TrophyClient trophies={trophies || []} competitionId={competitionId} tenantId={tenantId} />
  );
}
