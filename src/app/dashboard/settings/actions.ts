'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabaseServer';

type Payload = {
  negotiations_enabled: boolean;
  free_agent_negotiations_enabled: boolean;
  trades_enabled: boolean;
  loans_enabled: boolean;
};

export async function saveNegotiationSettings(payload: Payload) {
  try {
    const { supabase, tenantId } = await createServerSupabase();

    const normalized = {
      negotiations_enabled: payload.negotiations_enabled,
      free_agent_negotiations_enabled: payload.negotiations_enabled
        ? payload.free_agent_negotiations_enabled
        : false,
      trades_enabled: payload.negotiations_enabled ? payload.trades_enabled : false,
      loans_enabled: payload.negotiations_enabled ? payload.loans_enabled : false,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: findError } = await supabase
      .from('system_settings')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle<{ id: string }>();

    if (findError) {
      return {
        ok: false,
        message: `Erro ao buscar configurações: ${findError.message}`,
      };
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('system_settings')
        .update(normalized)
        .eq('id', existing.id);

      if (updateError) {
        return {
          ok: false,
          message: `Erro ao atualizar: ${updateError.message}`,
        };
      }
    } else {
      const { error: insertError } = await supabase.from('system_settings').insert({
        ...normalized,
      });

      if (insertError) {
        return {
          ok: false,
          message: `Erro ao criar: ${insertError.message}`,
        };
      }
    }

    revalidatePath('/dashboard/settings');

    return {
      ok: true,
      message: 'Configurações salvas com sucesso.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado';
    return { ok: false, message };
  }
}
