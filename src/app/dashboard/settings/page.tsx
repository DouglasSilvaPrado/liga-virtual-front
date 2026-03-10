import { createServerSupabase } from '@/lib/supabaseServer';
import SettingsNegotiationsForm from './components/SettingsNegotiationsForm';

type SystemSettingsRow = {
  id: string;
  negotiations_enabled: boolean;
  free_agent_negotiations_enabled: boolean;
  trades_enabled: boolean;
  loans_enabled: boolean;
  max_players_per_team: number;
};

export default async function SettingsPage() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data } = await supabase
    .from('system_settings')
    .select(
      'id, negotiations_enabled, free_agent_negotiations_enabled, trades_enabled, loans_enabled, max_players_per_team',
    )
    .eq('tenant_id', tenantId)
    .maybeSingle<SystemSettingsRow>();

  const settings: SystemSettingsRow = data ?? {
    id: '',
    negotiations_enabled: true,
    free_agent_negotiations_enabled: true,
    trades_enabled: true,
    loans_enabled: true,
    max_players_per_team: 0,
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-gray-500">
            Controle as opções de negociação do sistema.
          </p>
        </div>

        <SettingsNegotiationsForm initialData={settings} />
      </div>
    </div>
  );
}