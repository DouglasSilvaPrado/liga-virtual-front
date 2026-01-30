'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabaseServer';

type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'cancelled';
type TeamRow = { id: string; championship_id: string | null };

function withParam(url: string, key: string, value: string) {
  const u = new URL(url, 'http://local');
  u.searchParams.set(key, value);
  if (key === 'ok') u.searchParams.delete('err');
  if (key === 'err') u.searchParams.delete('ok');
  return u.pathname + u.search;
}

/** ✅ SEND LOAN (por temporada) */
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
  const championshipId = myTeam?.championship_id ?? null;

  if (!myTeamId) redirect(withParam(returnTo, 'err', 'no_team'));
  if (!championshipId) redirect(withParam(returnTo, 'err', 'no_championship'));

  // descobrir o time atual do jogador (dono)
  const { data: ownerTp } = await supabase
    .from('team_players')
    .select('team_id')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('player_id', playerId)
    .maybeSingle<{ team_id: string }>();

  const ownerTeamId = ownerTp?.team_id ?? null;
  if (!ownerTeamId) redirect(withParam(returnTo, 'err', 'loan_player_not_in_any_team'));
  if (ownerTeamId === myTeamId) redirect(withParam(returnTo, 'err', 'loan_player_is_mine'));

  // cria proposta: from = meu time (quem pede), to = dono do jogador
  // ✅ duration_rounds = null (temporada)
  const { error: insErr } = await supabase.from('loan_proposals').insert({
    tenant_id: tenantId,
    championship_id: championshipId,
    from_team_id: myTeamId,
    to_team_id: ownerTeamId,
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

/** ✅ ACCEPT LOAN (via RPC) */
export async function acceptLoanProposalAction(formData: FormData) {
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

/** ✅ REJECT LOAN */
export async function rejectLoanProposalAction(formData: FormData) {
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
    .from('loan_proposals')
    .update({ status: 'rejected' satisfies ProposalStatus })
    .eq('tenant_id', tenantId)
    .eq('id', proposalId)
    .eq('status', 'pending' satisfies ProposalStatus)
    .eq('to_team_id', myTeamId);

  if (error) redirect(withParam(returnTo, 'err', 'loan_reject_failed'));

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'loan_rejected'));
}

/** ✅ COUNTER LOAN */
export async function counterLoanProposalAction(formData: FormData) {
  const proposalId = String(formData.get('proposal_id') ?? '');
  const moneyAmount = Number(formData.get('money_amount') ?? 0);

  const returnTo = '/dashboard/negotiations/proposals';
  if (!proposalId || !Number.isFinite(moneyAmount)) {
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
  if (!myTeamId) redirect(withParam(returnTo, 'err', 'no_team'));

  // base
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

  if (bErr || !base) redirect(withParam(returnTo, 'err', 'proposal_invalid'));
  if (base.to_team_id !== myTeamId) redirect(withParam(returnTo, 'err', 'not_allowed'));
  if (base.status !== 'pending') redirect(withParam(returnTo, 'err', 'not_pending'));

  // marca base como countered
  await supabase
    .from('loan_proposals')
    .update({ status: 'countered' satisfies ProposalStatus })
    .eq('tenant_id', tenantId)
    .eq('id', base.id)
    .eq('status', 'pending' satisfies ProposalStatus);

  // cria nova pendente invertendo quem envia/recebe
  const { error: insErr } = await supabase.from('loan_proposals').insert({
    tenant_id: tenantId,
    championship_id: base.championship_id,
    from_team_id: myTeamId,
    to_team_id: base.from_team_id,
    player_id: base.player_id,
    money_amount: Math.max(0, Math.trunc(moneyAmount)),
    duration_rounds: null,
    status: 'pending' satisfies ProposalStatus,
    parent_id: base.id,
  });

  if (insErr) redirect(withParam(returnTo, 'err', 'loan_counter_failed'));

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'loan_counter_sent'));
}
