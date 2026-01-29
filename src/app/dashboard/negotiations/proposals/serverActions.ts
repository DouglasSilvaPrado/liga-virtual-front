'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabaseServer';
import type { MoneyDirection, ProposalStatus } from './page';

type TeamRow = { id: string; championship_id: string | null };

function withParam(url: string, key: string, value: string) {
  const u = new URL(url, 'http://local');
  u.searchParams.set(key, value);
  if (key === 'ok') u.searchParams.delete('err');
  if (key === 'err') u.searchParams.delete('ok');
  return u.pathname + u.search;
}

export async function acceptProposalAction(formData: FormData) {
  const proposalId = String(formData.get('proposal_id') ?? '');
  const returnTo = '/dashboard/negotiations/proposals';

  if (!proposalId) redirect(withParam(returnTo, 'err', 'proposal_invalid'));

  const { supabase, tenantId } = await createServerSupabase();

  // pega meu time (pra garantir que só o receiver pode aceitar)
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

  // marca accepted apenas se pending e se a proposta é “para mim”
  const { error } = await supabase
    .from('trade_proposals')
    .update({ status: 'accepted' satisfies ProposalStatus })
    .eq('tenant_id', tenantId)
    .eq('id', proposalId)
    .eq('status', 'pending' satisfies ProposalStatus)
    .eq('to_team_id', myTeamId);

  if (error) redirect(withParam(returnTo, 'err', 'accept_failed'));

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'accepted'));
}

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
  if (!myTeamId) redirect(withParam(returnTo, 'err', 'no_team'));

  // carrega proposta base
  const { data: base, error: bErr } = await supabase
    .from('trade_proposals')
    .select(
      `
      id, championship_id,
      from_team_id, to_team_id,
      offered_player_id, requested_player_id,
      status
    `,
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

  // ✅ só permite contra se eu sou o receiver da proposta base e ela está pending
  if (base.to_team_id !== myTeamId) redirect(withParam(returnTo, 'err', 'not_allowed'));
  if (base.status !== 'pending') redirect(withParam(returnTo, 'err', 'not_pending'));

  const amount = Number.isFinite(moneyAmount) ? Math.max(0, moneyAmount) : 0;
  const dir: MoneyDirection = moneyDirection ?? 'none';

  // ✅ Contra-proposta:
  // agora EU (receiver) viro FROM (proponente), e o outro time vira TO
  // eu ofereço um jogador meu (offered_player_id) e peço o jogador deles (base.offered_player_id)
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

  // (opcional) marca a base como countered para visual
  await supabase
    .from('trade_proposals')
    .update({ status: 'countered' satisfies ProposalStatus })
    .eq('tenant_id', tenantId)
    .eq('id', base.id)
    .eq('status', 'pending' satisfies ProposalStatus);

  revalidatePath(returnTo);
  redirect(withParam(returnTo, 'ok', 'counter_sent'));
}
