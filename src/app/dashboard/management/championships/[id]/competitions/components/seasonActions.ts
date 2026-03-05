'use server';

import { createServerSupabase } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function withParam(url: string, key: string, value: string) {
  const u = new URL(url, 'http://local');
  u.searchParams.set(key, value);
  if (key === 'ok') u.searchParams.delete('err');
  if (key === 'err') u.searchParams.delete('ok');
  return u.pathname + u.search;
}

export async function closeSeasonAction(formData: FormData) {
  const championshipId = String(formData.get('championship_id') ?? '');
  const nextSeason = String(formData.get('next_season') ?? '').trim();
  const returnTo = String(
    formData.get('return_to') ??
      `/dashboard/management/championships/${championshipId}/competitions`,
  );

  if (!championshipId) redirect(withParam(returnTo, 'err', 'missing_championship_id'));
  if (!nextSeason) redirect(withParam(returnTo, 'err', 'missing_next_season'));

  const { supabase, tenantId } = await createServerSupabase();

  // auth
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id;
  if (!userId) redirect(withParam(returnTo, 'err', 'not_logged'));

  // opcional: só admin/owner (recomendado)
  const { data: tm } = await supabase
    .from('tenant_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string; role: 'owner' | 'admin' | 'member' }>();

  if (!tm?.id) redirect(withParam(returnTo, 'err', 'no_tenant_member'));
  if (tm.role !== 'owner' && tm.role !== 'admin') redirect(withParam(returnTo, 'err', 'forbidden'));

  // temporada atual
  const { data: champ } = await supabase
    .from('championships')
    .select('id, season')
    .eq('id', championshipId)
    .eq('tenant_id', tenantId)
    .maybeSingle<{ id: string; season: string | null }>();

  if (!champ?.id) redirect(withParam(returnTo, 'err', 'champ_not_found'));

  const currentSeason = (champ.season ?? '').trim();
  if (!currentSeason) redirect(withParam(returnTo, 'err', 'season_not_set'));

  // 1) encerra empréstimos da season atual
  type CloseLoansRpcRow = {
    ok: boolean;
    closed_count: number;
    code: string | null;
    message: string | null;
  };
  const { data: closeData, error: closeErr } = await supabase
    .rpc('close_loans_for_season', {
      p_tenant_id: tenantId,
      p_championship_id: championshipId,
      p_season: currentSeason,
    })
    .returns<CloseLoansRpcRow[]>();

  if (closeErr) {
    console.error('close_loans_for_season RPC error', closeErr);
    redirect(withParam(returnTo, 'err', `close_loans_${closeErr.code ?? 'error'}`));
  }

  const closeRow = Array.isArray(closeData) && closeData.length ? closeData[0] : null;
  if (!closeRow?.ok) {
    redirect(withParam(returnTo, 'err', closeRow?.code ?? 'close_loans_failed'));
  }

  // 2) vira a season
  const { error: updErr } = await supabase
    .from('championships')
    .update({ season: nextSeason })
    .eq('id', championshipId)
    .eq('tenant_id', tenantId);

  if (updErr) {
    console.error('championships season update error', updErr);
    redirect(withParam(returnTo, 'err', 'season_update_failed'));
  }

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', `season_closed_${closeRow.closed_count}`));
}
