// app/dashboard/cups/[id]/page.tsx
import { createServerSupabase } from '@/lib/supabaseServer';
import CupHeader from '../components/CupHeader';
import CupActions from '../components/CupActions';
import CupTabs from '../components/CupTabs';

export default async function CupDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; 
  const { supabase, tenantId } = await createServerSupabase();

  const { data: cup } = await supabase
    .from('competitions_with_settings')
    .select(`
      id,
      name,
      type,
      settings,
      championships ( name )
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!cup) {
    return <p>Copa não encontrada</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <CupHeader cup={cup} />
      <CupActions competitionId={cup.id} />
      <CupTabs competitionId={cup.id} />
    </div>
  );
}
