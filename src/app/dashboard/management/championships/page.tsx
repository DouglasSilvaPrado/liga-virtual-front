import { createServerSupabase } from '@/lib/supabaseServer';
import ChampionshipList from './ChampionshipList';
import { Championship } from '@/@types/championship';

export default async function ChampionshipsPage() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data, error } = await supabase
    .from('championships')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[CHAMPIONSHIPS_ERROR]', error);
  }

  const championships = (data || []) as Championship[];

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Campeonatos</h1>

      <ChampionshipList championships={championships} />
    </div>
  );
}
