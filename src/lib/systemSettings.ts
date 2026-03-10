import { cache } from 'react';
import { createServerSupabase } from '@/lib/supabaseServer';

export type SystemSettings = {
  negotiations_enabled: boolean;
  free_agent_negotiations_enabled: boolean;
  trades_enabled: boolean;
  loans_enabled: boolean;
  max_players_per_team: number;
};

export const getSystemSettings = cache(async (): Promise<SystemSettings> => {
  const { supabase, tenantId } = await createServerSupabase();

  const { data } = await supabase
    .from('system_settings')
    .select(
      'negotiations_enabled, free_agent_negotiations_enabled, trades_enabled, loans_enabled, max_players_per_team',
    )
    .eq('tenant_id', tenantId)
    .maybeSingle<SystemSettings>();

  return (
    data ?? {
      negotiations_enabled: true,
      free_agent_negotiations_enabled: true,
      trades_enabled: true,
      loans_enabled: true,
      max_players_per_team: 0,
    }
  );
});
