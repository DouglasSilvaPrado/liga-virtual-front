'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabaseServer';
import { getSystemSettings } from '@/lib/systemSettings';

type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'cancelled';
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

async function ensureLoansEnabled(returnTo: string) {
  const settings = await getSystemSettings();

  if (!settings.negotiations_enabled) {
    redirect(withParam(returnTo, 'err', 'negotiations_disabled'));
  }

  if (!settings.loans_enabled) {
    redirect(withParam(returnTo, 'err', 'loans_disabled'));
  }
}

export async function sendLoanProposalAction(formData: FormData) {
  const basePath = '/dashboard/negotiations/hirePlayer';

  const playerId = Number(formData.get('player_id'));
  const moneyAmountRaw = String(formData.get('money_amount') ?? '');
  const returnToRaw = String(formData.get('return_to') || basePath);
  const returnTo = returnToRaw.startsWith('/') ? returnToRaw : basePath;

  const moneyAmount = Number(moneyAmountRaw);

  if (!Number.isFinite(playerId) || playerId <= 0) {
    redirect(withParam(returnTo, 'err', 'loan_player_invalid'));
  }
  if (!Number.isFinite(moneyAmount) || moneyAmount <= 0) {
    redirect(withParam(returnTo, 'err', 'loan_invalid_money'));
  }

  await ensureLoansEnabled(returnTo);

  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (userErr || !userId) {
    redirect(withParam(returnTo, 'err', 'not_logged'));
  }

  const { data: tm } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>();

  if (!tm?.id) {
    redirect(withParam(returnTo, 'err', 'no_tenant_member'));
  }

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

  if (!myTeamId) {
    redirect(withParam(returnTo, 'err', 'no_team'));
  }
  if (!championshipId) {
    redirect(withParam(returnTo, 'err', 'no_championship'));
  }

  const { data: ownerContract } = await supabase
    .from('player_contracts')
    .select('player_id, team_id, status')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('player_id', playerId)
    .maybeSingle<PlayerContractRow>();

  if (!ownerContract?.player_id || !ownerContract.team_id) {
    redirect(withParam(returnTo, 'err', 'loan_player_not_in_any_team'));
  }

  if (ownerContract.team_id === myTeamId) {
    redirect(withParam(returnTo, 'err', 'loan_player_is_mine'));
  }

  if (ownerContract.status === 'loaned_out') {
    redirect(withParam(returnTo, 'err', 'loan_player_already_loaned'));
  }

  if (ownerContract.status !== 'active') {
    redirect(withParam(returnTo, 'err', 'player_not_available'));
  }

  const { error: insErr } = await supabase.from('loan_proposals').insert({
    tenant_id: tenantId,
    championship_id: championshipId,
    from_team_id: myTeamId,
    to_team_id: ownerContract.team_id,
    player_id: playerId,
    money_amount: Math.trunc(moneyAmount),
    duration_rounds: null,
    status: 'pending' satisfies ProposalStatus,
    created_by_user_id: userId,
  });

  if (insErr) {
    console.error('loan_proposals insert error:', {
      code: insErr.code,
      message: insErr.message,
      details: insErr.details,
      hint: insErr.hint,
    });

    const msg = String(insErr.message ?? '')
      .slice(0, 60)
      .replace(/\s+/g, '_');
    redirect(withParam(returnTo, 'err', `loan_create_failed_${insErr.code ?? 'error'}_${msg}`));
  }

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'loan_sent'));
}

export async function acceptLoanProposalAction(formData: FormData) {
  const proposalId = String(formData.get('proposal_id') ?? '');
  const returnTo = '/dashboard/negotiations/proposals';

  if (!proposalId) {
    redirect(withParam(returnTo, 'err', 'proposal_invalid'));
  }

  await ensureLoansEnabled(returnTo);

  const { supabase } = await createServerSupabase();

  type AcceptRpcRow = {
    ok: boolean;
    proposal_id: string;
    code: string | null;
    message: string | null;
  };

  const { data, error } = await supabase
    .rpc('accept_loan_proposal', { p_proposal_id: proposalId })
    .returns<AcceptRpcRow[]>();

  if (error) {
    console.error('accept_loan_proposal RPC error:', {
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
    redirect(withParam(returnTo, 'err', row?.code ?? 'loan_accept_failed'));
  }

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'loan_accepted'));
}

export async function rejectLoanProposalAction(formData: FormData) {
  const proposalId = String(formData.get('proposal_id') ?? '');
  const returnTo = '/dashboard/negotiations/proposals';

  if (!proposalId) {
    redirect(withParam(returnTo, 'err', 'proposal_invalid'));
  }

  await ensureLoansEnabled(returnTo);

  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) {
    redirect(withParam(returnTo, 'err', 'not_logged'));
  }

  const { data: tm } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>();

  if (!tm?.id) {
    redirect(withParam(returnTo, 'err', 'no_tenant_member'));
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id, championship_id')
    .eq('tenant_id', tenantId)
    .eq('tenant_member_id', tm.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<TeamRow>();

  const myTeamId = team?.id ?? null;
  if (!myTeamId) {
    redirect(withParam(returnTo, 'err', 'no_team'));
  }

  const { error } = await supabase
    .from('loan_proposals')
    .update({ status: 'rejected' satisfies ProposalStatus })
    .eq('tenant_id', tenantId)
    .eq('id', proposalId)
    .eq('status', 'pending' satisfies ProposalStatus)
    .eq('to_team_id', myTeamId);

  if (error) {
    redirect(withParam(returnTo, 'err', 'loan_reject_failed'));
  }

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'loan_rejected'));
}

export async function counterLoanProposalAction(formData: FormData) {
  const proposalId = String(formData.get('proposal_id') ?? '');
  const moneyAmount = Number(formData.get('money_amount') ?? 0);

  const returnTo = '/dashboard/negotiations/proposals';

  if (!proposalId || !Number.isFinite(moneyAmount)) {
    redirect(withParam(returnTo, 'err', 'proposal_invalid'));
  }

  await ensureLoansEnabled(returnTo);

  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) {
    redirect(withParam(returnTo, 'err', 'not_logged'));
  }

  const { data: tm } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>();

  if (!tm?.id) {
    redirect(withParam(returnTo, 'err', 'no_tenant_member'));
  }

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

  if (!myTeamId) {
    redirect(withParam(returnTo, 'err', 'no_team'));
  }
  if (!championshipId) {
    redirect(withParam(returnTo, 'err', 'no_championship'));
  }

  const { data: base, error: bErr } = await supabase
    .from('loan_proposals')
    .select('id, championship_id, from_team_id, to_team_id, player_id, duration_rounds, status')
    .eq('tenant_id', tenantId)
    .eq('id', proposalId)
    .single<{
      id: string;
      championship_id: string;
      from_team_id: string;
      to_team_id: string;
      player_id: number;
      duration_rounds: number | null;
      status: ProposalStatus;
    }>();

  if (bErr || !base) {
    redirect(withParam(returnTo, 'err', 'proposal_invalid'));
  }
  if (base.to_team_id !== myTeamId) {
    redirect(withParam(returnTo, 'err', 'not_allowed'));
  }
  if (base.status !== 'pending') {
    redirect(withParam(returnTo, 'err', 'not_pending'));
  }

  const { data: ownerContract } = await supabase
    .from('player_contracts')
    .select('player_id, team_id, status')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('player_id', base.player_id)
    .maybeSingle<PlayerContractRow>();

  if (!ownerContract?.player_id) {
    redirect(withParam(returnTo, 'err', 'loan_player_not_in_any_team'));
  }
  if (ownerContract.team_id !== myTeamId) {
    redirect(withParam(returnTo, 'err', 'not_allowed'));
  }
  if (ownerContract.status !== 'active') {
    redirect(withParam(returnTo, 'err', 'player_not_available'));
  }

  await supabase
    .from('loan_proposals')
    .update({ status: 'countered' satisfies ProposalStatus })
    .eq('tenant_id', tenantId)
    .eq('id', base.id)
    .eq('status', 'pending' satisfies ProposalStatus);

  const { error: insErr } = await supabase.from('loan_proposals').insert({
    tenant_id: tenantId,
    championship_id: base.championship_id,
    from_team_id: myTeamId,
    to_team_id: base.from_team_id,
    player_id: base.player_id,
    money_amount: Math.max(0, Math.trunc(moneyAmount)),
    duration_rounds: null,
    status: 'pending' satisfies ProposalStatus,
    created_by_user_id: userId,
  });

  if (insErr) {
    redirect(withParam(returnTo, 'err', 'loan_counter_failed'));
  }

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'loan_counter_sent'));
}
