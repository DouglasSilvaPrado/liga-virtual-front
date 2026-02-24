// src/app/dashboard/negotiations/proposals/serverActions.ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabaseServer';
import type { MoneyDirection, ProposalStatus } from './types';

type TeamRow = { id: string; championship_id: string | null };

type PlayerContractRow = {
  player_id: number | null;
  team_id: string | null;
  status: 'active' | 'loaned_out' | 'expired' | 'terminated' | null;
};

function withParam(url: string, key: string, value: string) {
  const u = new URL(url, 'http://local');
  u.searchParams.set(key, value);
  if (key === 'ok') u.searchParams.delete('err');
  if (key === 'err') u.searchParams.delete('ok');
  return u.pathname + u.search;
}

/** ✅ ACCEPT (via RPC) */
export async function acceptProposalAction(formData: FormData) {
  const proposalId = String(formData.get('proposal_id') ?? '');
  const returnTo = '/dashboard/negotiations/proposals';
  if (!proposalId) redirect(withParam(returnTo, 'err', 'proposal_invalid'));

  const { supabase } = await createServerSupabase();

  type AcceptRpcRow = {
    ok: boolean;
    proposal_id: string;
    code: string | null;
    message: string | null;
  };

  const { data, error } = await supabase
    .rpc('accept_trade_proposal', { p_proposal_id: proposalId })
    .returns<AcceptRpcRow[]>();

  if (error) {
    console.error('accept_trade_proposal RPC error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const msg = String(error.message ?? '')
      .slice(0, 60)
      .replace(/\s+/g, '_');
    redirect(withParam(returnTo, 'err', `rpc_${error.code ?? 'error'}_${msg}`));
  }

  const row: AcceptRpcRow | null = Array.isArray(data) && data.length > 0 ? data[0] : null;

  if (!row?.ok) {
    redirect(withParam(returnTo, 'err', row?.code ?? 'accept_failed'));
  }

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'accepted'));
}

/** ✅ REJECT */
export async function rejectProposalAction(formData: FormData) {
  const proposalId = String(formData.get('proposal_id') ?? '');
  const returnTo = '/dashboard/negotiations/proposals';
  if (!proposalId) redirect(withParam(returnTo, 'err', 'proposal_invalid'));

  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) redirect(withParam(returnTo, 'err', 'not_logged'));

  const { data: tm } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>();
  if (!tm?.id) redirect(withParam(returnTo, 'err', 'no_tenant_member'));

  const { data: team } = await supabase
    .from('teams')
    .select('id, championship_id')
    .eq('tenant_id', tenantId)
    .eq('tenant_member_id', tm.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<TeamRow>();

  const myTeamId = team?.id ?? null;
  if (!myTeamId) redirect(withParam(returnTo, 'err', 'no_team'));

  const { error } = await supabase
    .from('trade_proposals')
    .update({ status: 'rejected' satisfies ProposalStatus })
    .eq('tenant_id', tenantId)
    .eq('id', proposalId)
    .eq('status', 'pending' satisfies ProposalStatus)
    .eq('to_team_id', myTeamId);

  if (error) redirect(withParam(returnTo, 'err', 'reject_failed'));

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'rejected'));
}

/** ✅ COUNTER (agora valida offered_player_id via player_contracts) */
export async function counterProposalAction(formData: FormData) {
  const baseProposalId = String(formData.get('base_proposal_id') ?? '');
  const offeredPlayerId = Number(formData.get('offered_player_id'));
  const moneyDirection = String(formData.get('money_direction') ?? 'none') as MoneyDirection;
  const moneyAmount = Number(formData.get('money_amount') ?? 0);

  const returnTo = '/dashboard/negotiations/proposals';

  if (!baseProposalId || !Number.isFinite(offeredPlayerId) || offeredPlayerId <= 0) {
    redirect(withParam(returnTo, 'err', 'proposal_invalid'));
  }

  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) redirect(withParam(returnTo, 'err', 'not_logged'));

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
  const championshipId = myTeam?.championship_id ?? null;
  if (!myTeamId) redirect(withParam(returnTo, 'err', 'no_team'));
  if (!championshipId) redirect(withParam(returnTo, 'err', 'no_championship'));

  const { data: base, error: bErr } = await supabase
    .from('trade_proposals')
    .select(
      'id, championship_id, from_team_id, to_team_id, offered_player_id, requested_player_id, status',
    )
    .eq('tenant_id', tenantId)
    .eq('id', baseProposalId)
    .single<{
      id: string;
      championship_id: string;
      from_team_id: string;
      to_team_id: string;
      offered_player_id: number;
      requested_player_id: number;
      status: ProposalStatus;
    }>();

  if (bErr || !base) redirect(withParam(returnTo, 'err', 'proposal_invalid'));
  if (base.to_team_id !== myTeamId) redirect(withParam(returnTo, 'err', 'not_allowed'));
  if (base.status !== 'pending') redirect(withParam(returnTo, 'err', 'not_pending'));

  // ✅ offered_player_id precisa ser MEU e ativo (não loaned_out)
  const { data: offeredContract } = await supabase
    .from('player_contracts')
    .select('player_id, team_id, status')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('player_id', offeredPlayerId)
    .maybeSingle<PlayerContractRow>();

  if (!offeredContract?.player_id) redirect(withParam(returnTo, 'err', 'trade_invalid_offered'));
  if (offeredContract.team_id !== myTeamId)
    redirect(withParam(returnTo, 'err', 'trade_offered_not_mine'));
  if (offeredContract.status !== 'active')
    redirect(withParam(returnTo, 'err', 'player_not_available'));

  // ✅ requested (o que eu quero receber) deve estar com o outro time e ativo/loaned_out (depende sua regra)
  // aqui vou exigir active ou loaned_out, mas você pode travar só active.
  const { data: requestedContract } = await supabase
    .from('player_contracts')
    .select('player_id, team_id, status')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('player_id', base.offered_player_id)
    .maybeSingle<PlayerContractRow>();

  // se o jogador alvo "sumiu" ou mudou de time, bloqueia contra
  if (!requestedContract?.player_id)
    redirect(withParam(returnTo, 'err', 'trade_requested_not_found'));
  if (requestedContract.team_id !== base.from_team_id)
    redirect(withParam(returnTo, 'err', 'trade_requested_not_found'));
  if (!['active', 'loaned_out'].includes(requestedContract.status ?? '')) {
    redirect(withParam(returnTo, 'err', 'player_not_available'));
  }

  const amount = Number.isFinite(moneyAmount) ? Math.max(0, moneyAmount) : 0;
  const dir: MoneyDirection = moneyDirection ?? 'none';

  const { error: insErr } = await supabase.from('trade_proposals').insert({
    tenant_id: tenantId,
    championship_id: base.championship_id,
    from_team_id: myTeamId,
    to_team_id: base.from_team_id,
    offered_player_id: offeredPlayerId,
    requested_player_id: base.offered_player_id,
    money_direction: dir,
    money_amount: amount,
    status: 'pending' satisfies ProposalStatus,
    created_by_user_id: userId,
  });

  if (insErr) redirect(withParam(returnTo, 'err', 'counter_failed'));

  await supabase
    .from('trade_proposals')
    .update({ status: 'countered' satisfies ProposalStatus })
    .eq('tenant_id', tenantId)
    .eq('id', base.id)
    .eq('status', 'pending' satisfies ProposalStatus);

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'counter_sent'));
}
