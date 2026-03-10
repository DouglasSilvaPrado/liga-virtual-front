import { createServerSupabase } from '@/lib/supabaseServer';
import { getSystemSettings } from '@/lib/systemSettings';

export async function validateTeamPlayerLimit(params: {
  teamId: string;
  championshipId: string;
  tenantId?: string;
}) {
  const { supabase, tenantId: currentTenantId } = await createServerSupabase();
  const tenantId = params.tenantId ?? currentTenantId;

  const settings = await getSystemSettings();

  if (!settings.max_players_per_team || settings.max_players_per_team <= 0) {
    return;
  }

  const { count, error } = await supabase
    .from('team_players')
    .select('player_id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('championship_id', params.championshipId)
    .eq('team_id', params.teamId);

  if (error) {
    throw new Error('team_limit_validation_failed');
  }

  if ((count ?? 0) >= settings.max_players_per_team) {
    throw new Error('team_player_limit_reached');
  }
}
