'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabaseServer';

type TeamRow = { id: string; championship_id: string | null };
type TPRow = { team_id: string | null };

function withParam(url: string, key: string, value: string) {
  const u = new URL(url, 'http://local');
  u.searchParams.set(key, value);
  if (key === 'ok') u.searchParams.delete('err');
  if (key === 'err') u.searchParams.delete('ok');
  return u.pathname + u.search;
}

export async function listPlayerOnMarketAction(formData: FormData) {
  const returnTo = '/dashboard/management/my-team';

  const championshipId = String(formData.get('championship_id') ?? '');
  const playerId = Number(formData.get('player_id'));
  const price = Number(formData.get('price'));

  if (!championshipId) redirect(withParam(returnTo, 'err', 'no_championship'));
  if (!Number.isFinite(playerId) || playerId <= 0)
    redirect(withParam(returnTo, 'err', 'player_invalid'));
  if (!Number.isFinite(price) || price <= 0) redirect(withParam(returnTo, 'err', 'invalid_price'));

  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) redirect(withParam(returnTo, 'err', 'not_logged'));

  // tenant_member
  const { data: tm } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>();

  if (!tm?.id) redirect(withParam(returnTo, 'err', 'no_tenant_member'));

  // meu time
  const { data: myTeam } = await supabase
    .from('teams')
    .select('id, championship_id')
    .eq('tenant_id', tenantId)
    .eq('tenant_member_id', tm.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<TeamRow>();

  const myTeamId = myTeam?.id ?? null;
  if (!myTeamId) redirect(withParam(returnTo, 'err', 'no_team'));
  if (myTeam?.championship_id !== championshipId) {
    redirect(withParam(returnTo, 'err', 'wrong_championship'));
  }

  // validar: jogador pertence ao meu time no campeonato
  const { data: tp } = await supabase
    .from('team_players')
    .select('team_id')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('player_id', playerId)
    .maybeSingle<TPRow>();

  if (!tp?.team_id) redirect(withParam(returnTo, 'err', 'player_not_in_any_team'));
  if (tp.team_id !== myTeamId) redirect(withParam(returnTo, 'err', 'not_owner'));

  // ✅ upsert listing ativo (se já existe, edita preço)
  const { error } = await supabase.from('player_market_listings').upsert(
    {
      tenant_id: tenantId,
      championship_id: championshipId,
      player_id: playerId,
      seller_team_id: myTeamId,
      price: Math.trunc(price),
      status: 'active',
      created_by_user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,championship_id,player_id' },
  );

  // Se seu unique é parcial (where status='active'), o onConflict acima pode não bater.
  // Nesse caso: trocamos por estratégia "cancel previous + insert".
  // Mas primeiro testa com esse; se der erro, eu te passo a versão alternativa.

  if (error) {
    console.error('player_market_listings upsert error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const msg = String(error.message ?? '')
      .slice(0, 70)
      .replace(/\s+/g, '_');
    redirect(withParam(returnTo, 'err', `market_list_failed_${error.code ?? 'error'}_${msg}`));
  }

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'market_listed'));
}

export async function unlistPlayerFromMarketAction(formData: FormData) {
  const returnTo = '/dashboard/management/my-team';

  const championshipId = String(formData.get('championship_id') ?? '');
  const playerId = Number(formData.get('player_id'));

  if (!championshipId) redirect(withParam(returnTo, 'err', 'no_championship'));
  if (!Number.isFinite(playerId) || playerId <= 0)
    redirect(withParam(returnTo, 'err', 'player_invalid'));

  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) redirect(withParam(returnTo, 'err', 'not_logged'));

  // achar meu time
  const { data: tm } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>();

  if (!tm?.id) redirect(withParam(returnTo, 'err', 'no_tenant_member'));

  const { data: myTeam } = await supabase
    .from('teams')
    .select('id, championship_id')
    .eq('tenant_id', tenantId)
    .eq('tenant_member_id', tm.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<TeamRow>();

  const myTeamId = myTeam?.id ?? null;
  if (!myTeamId) redirect(withParam(returnTo, 'err', 'no_team'));

  const { error } = await supabase
    .from('player_market_listings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('player_id', playerId)
    .eq('status', 'active')
    .eq('seller_team_id', myTeamId);

  if (error) redirect(withParam(returnTo, 'err', 'market_unlist_failed'));

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'market_unlisted'));
}
