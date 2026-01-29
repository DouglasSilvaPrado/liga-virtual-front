'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabaseServer';

function withParam(url: string, key: string, value: string) {
  const u = new URL(url, 'http://local');
  u.searchParams.set(key, value);
  if (key === 'ok') u.searchParams.delete('err');
  if (key === 'err') u.searchParams.delete('ok');
  return u.pathname + u.search;
}

export async function createTradeProposalAction(formData: FormData) {
  const basePath = '/dashboard/negotiations/hirePlayer';

  const returnToRaw = String(formData.get('return_to') || basePath);
  const returnTo = returnToRaw.startsWith('/') ? returnToRaw : basePath;

  const requestedPlayerId = Number(formData.get('requested_player_id'));
  const offeredPlayerId = Number(formData.get('offered_player_id'));
  const moneyDirection = String(formData.get('money_direction') || 'none') as
    | 'none'
    | 'pay'
    | 'ask';
  const moneyAmount = Number(formData.get('money_amount') || 0);

  if (!Number.isFinite(requestedPlayerId) || requestedPlayerId <= 0) {
    redirect(withParam(returnTo, 'err', 'trade_invalid_requested'));
  }
  if (!Number.isFinite(offeredPlayerId) || offeredPlayerId <= 0) {
    redirect(withParam(returnTo, 'err', 'trade_invalid_offered'));
  }
  if (!['none', 'pay', 'ask'].includes(moneyDirection)) {
    redirect(withParam(returnTo, 'err', 'trade_invalid_money_mode'));
  }
  const amount = Number.isFinite(moneyAmount) ? Math.max(0, Math.trunc(moneyAmount)) : 0;
  if (moneyDirection !== 'none' && amount <= 0) {
    redirect(withParam(returnTo, 'err', 'trade_invalid_money_amount'));
  }

  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) redirect(withParam(returnTo, 'err', 'not_logged'));

  // acha tenant_member
  const { data: tm } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>();

  if (!tm?.id) redirect(withParam(returnTo, 'err', 'no_tenant_member'));

  // meu time/championship
  const { data: myTeam } = await supabase
    .from('teams')
    .select('id, championship_id')
    .eq('tenant_id', tenantId)
    .eq('tenant_member_id', tm.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; championship_id: string | null }>();

  if (!myTeam?.id) redirect(withParam(returnTo, 'err', 'no_team'));
  if (!myTeam.championship_id) redirect(withParam(returnTo, 'err', 'no_championship'));

  const championshipId = myTeam.championship_id;

  // offeredPlayer precisa ser do meu time
  const { data: offeredLink } = await supabase
    .from('team_players')
    .select('team_id, player_id')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('team_id', myTeam.id)
    .eq('player_id', offeredPlayerId)
    .maybeSingle<{ team_id: string; player_id: number }>();

  if (!offeredLink) redirect(withParam(returnTo, 'err', 'trade_offered_not_mine'));

  // requestedPlayer precisa estar em outro time
  const { data: requestedLink } = await supabase
    .from('team_players')
    .select('team_id, player_id')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('player_id', requestedPlayerId)
    .maybeSingle<{ team_id: string; player_id: number }>();

  if (!requestedLink) redirect(withParam(returnTo, 'err', 'trade_requested_not_found'));
  if (requestedLink.team_id === myTeam.id)
    redirect(withParam(returnTo, 'err', 'trade_requested_is_mine'));

  // se for "pay", valida saldo (NÃO debita agora — só garante que hoje você tem)
  if (moneyDirection === 'pay') {
    const { data: wallet } = await supabase
      .from('championship_wallet')
      .select('balance')
      .eq('tenant_member_id', tm.id)
      .eq('championship_id', championshipId)
      .maybeSingle<{ balance: number | string | null }>();

    const bal =
      typeof wallet?.balance === 'string'
        ? Number(wallet.balance)
        : typeof wallet?.balance === 'number'
          ? wallet.balance
          : 0;
    if (!Number.isFinite(bal) || bal < amount) {
      redirect(withParam(returnTo, 'err', 'insufficient_funds'));
    }
  }

  // cria proposta pendente
  const { error: insErr } = await supabase.from('trade_proposals').insert({
    tenant_id: tenantId,
    championship_id: championshipId,
    from_team_id: myTeam.id,
    to_team_id: requestedLink.team_id,
    offered_player_id: offeredPlayerId,
    requested_player_id: requestedPlayerId,
    money_direction: moneyDirection,
    money_amount: moneyDirection === 'none' ? 0 : amount,
    status: 'pending',
    created_by_user_id: userId,
  });

  if (insErr) {
    redirect(withParam(returnTo, 'err', 'trade_create_failed'));
  }

  revalidatePath(basePath);
  redirect(withParam(returnTo, 'ok', 'trade_sent'));
}
