import { createServerSupabase } from '@/lib/supabaseServer';
import CupHeader from './components/CupHeader';
import CupStatus from './components/CupStatus';
import GroupsStandings from './components/GroupsStandings';
import GroupMatches from './components/GroupMatches';
import KnockoutBracket from './components/KnockoutBracket';
import GroupRounds from './components/GroupRounds';

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
    return <p className="p-6">Copa não encontrada</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <CupHeader cup={cup} />
      <CupStatus competitionId={cup.id} />

      <GroupsStandings competitionId={cup.id} />
      <GroupMatches competitionId={cup.id} />
      <KnockoutBracket competitionId={cup.id} />
      <GroupRounds competitionId={cup.id} />
    </div>
  );
}
