// src/app/dashboard/negotiations/hirePlayer/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabaseServer';

type PlayerForHire = {
  id: number;
  bp: string | null; // posição base
  vl: string | null; // valor (texto)
};

type WalletRow = {
  id: string;
  balance: number | string | null;
};

type TeamRow = {
  id: string;
  championship_id: string | null;
};

type CycleRow = { current_round: number };

type ContractCheckRow = {
  player_id: number;
  status: 'active' | 'loaned_out' | 'expired' | 'terminated' | null;
  team_id: string | null;
};

const BUYOUT_MULTIPLIER = 3;

// salário por rodada: 1% do valor (ajuste depois)
function calcSalaryPerRound(price: number) {
  return Math.max(0, Math.round(price * 0.01));
}
function calcBuyout(price: number) {
  return Math.max(0, Math.round(price * BUYOUT_MULTIPLIER));
}

function withParam(url: string, key: string, value: string) {
  const u = new URL(url, 'http://local');
  u.searchParams.set(key, value);
  if (key === 'ok') u.searchParams.delete('err');
  if (key === 'err') u.searchParams.delete('ok');
  return u.pathname + u.search;
}

function parsePriceToNumber(priceText: string | null | undefined): number {
  if (!priceText) return 0;

  const raw = priceText.toString().trim().toUpperCase();

  // aceita R$, €, £, $
  const cleaned = raw
    .replace(/\s/g, '')
    .replace(/^R\$/i, '')
    .replace(/^[€£$]/, '');

  const m = cleaned.match(/^([\d.,]+)([KM])?$/i);
  if (!m) return 0;

  let numPart = m[1];
  const suffix = (m[2] ?? '').toUpperCase();

  if (numPart.includes('.') && numPart.includes(',')) {
    numPart = numPart.replace(/\./g, '').replace(',', '.');
  } else if (numPart.includes(',')) {
    numPart = numPart.replace(',', '.');
  }

  const n = Number(numPart);
  if (!Number.isFinite(n)) return 0;

  const mult = suffix === 'M' ? 1_000_000 : suffix === 'K' ? 1_000 : 1;
  return Math.round(n * mult);
}

function normalizeBalance(v: WalletRow['balance']): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function hirePlayerAction(formData: FormData) {
  const basePath = '/dashboard/negotiations/hirePlayer';

  const playerId = Number(formData.get('player_id'));
  const returnToRaw = String(formData.get('return_to') || basePath);
  const returnTo = returnToRaw.startsWith('/') ? returnToRaw : basePath;

  if (!Number.isFinite(playerId) || playerId <= 0) {
    redirect(withParam(returnTo, 'err', 'player_invalid'));
  }

  const { supabase, tenantId } = await createServerSupabase();

  // -------------------- Auth / tenant_member --------------------
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const userId = userRes?.user?.id;
  if (userErr || !userId) {
    redirect(withParam(returnTo, 'err', 'not_logged'));
  }

  const { data: tm, error: tmErr } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>();

  if (tmErr || !tm?.id) {
    redirect(withParam(returnTo, 'err', 'no_tenant_member'));
  }

  // -------------------- Meu time / campeonato --------------------
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('id, championship_id')
    .eq('tenant_id', tenantId)
    .eq('tenant_member_id', tm.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<TeamRow>();

  if (teamErr || !team?.id) {
    redirect(withParam(returnTo, 'err', 'no_team'));
  }
  if (!team.championship_id) {
    redirect(withParam(returnTo, 'err', 'no_championship'));
  }

  const championshipId = team.championship_id;

  // -------------------- Jogador --------------------
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select('id, bp, vl')
    .eq('id', playerId)
    .single<PlayerForHire>();

  if (playerErr || !player?.id) {
    redirect(withParam(returnTo, 'err', 'player_not_found'));
  }

  // ✅ impede contratar jogador que já está sob contrato ativo/emprestado
  const { data: cCheck } = await supabase
    .from('player_contracts')
    .select('player_id, status, team_id')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('player_id', player.id)
    .in('status', ['active', 'loaned_out'])
    .maybeSingle<ContractCheckRow>();

  if (cCheck?.player_id) {
    redirect(withParam(returnTo, 'err', 'already_hired'));
  }

  // -------------------- Preço --------------------
  const price = parsePriceToNumber(player.vl);
  if (!Number.isFinite(price) || price < 0) {
    redirect(withParam(returnTo, 'err', 'invalid_price'));
  }

  // -------------------- Wallet (cria se não existir) --------------------
  const { data: walletFound, error: walletErr } = await supabase
    .from('championship_wallet')
    .select('id, balance')
    .eq('tenant_member_id', tm.id)
    .eq('championship_id', championshipId)
    .maybeSingle<WalletRow>();

  if (walletErr) {
    redirect(withParam(returnTo, 'err', 'wallet_read'));
  }

  let walletId = walletFound?.id ?? null;
  let walletBalance = normalizeBalance(walletFound?.balance ?? 0);

  if (!walletId) {
    const { data: createdWallet, error: createWalletErr } = await supabase
      .from('championship_wallet')
      .insert({
        tenant_member_id: tm.id,
        championship_id: championshipId,
        balance: 0,
      })
      .select('id, balance')
      .single<WalletRow>();

    if (createWalletErr || !createdWallet?.id) {
      redirect(withParam(returnTo, 'err', 'wallet_create'));
    }

    walletId = createdWallet.id;
    walletBalance = normalizeBalance(createdWallet.balance);
  }

  // ✅ saldo
  if (walletBalance < price) {
    redirect(withParam(returnTo, 'err', 'insufficient_funds'));
  }

  // -------------------- Rodada atual (cria ciclo se não existir) --------------------
  let currentRound = 1;

  const { data: cycle } = await supabase
    .from('championship_cycles')
    .select('current_round')
    .eq('championship_id', championshipId)
    .maybeSingle<CycleRow>();

  if (cycle?.current_round && Number.isFinite(cycle.current_round)) {
    currentRound = Math.max(1, Math.trunc(cycle.current_round));
  } else {
    // MVP: tenta criar (pode falhar se já existir por race, mas ok)
    await supabase.from('championship_cycles').insert({
      championship_id: championshipId,
      current_round: 1,
    });
    currentRound = 1;
  }

  const startRound = currentRound;
  const endRound: number | null = null;

  const salaryPerRound = calcSalaryPerRound(price);
  const buyoutAmount = calcBuyout(price);

  // -------------------- Elenco (team_players) --------------------
  const { error: tpErr } = await supabase.from('team_players').insert({
    team_id: team.id,
    player_id: player.id,
    position: player.bp, // posição base
    championship_id: championshipId,
    tenant_id: tenantId,
  });

  if (tpErr) {
    // normalmente unique(player_id, championship_id, tenant_id) ou afins
    redirect(withParam(returnTo, 'err', 'already_hired'));
  }

  // -------------------- Contrato (player_contracts) --------------------
  const { error: cInsErr } = await supabase.from('player_contracts').insert({
    tenant_id: tenantId,
    championship_id: championshipId,
    player_id: player.id,
    team_id: team.id,
    status: 'active',
    start_round: startRound,
    end_round: null,
    salary_per_round: salaryPerRound,
    buyout_amount: buyoutAmount,
  });

  if (cInsErr) {
    // rollback simples: remove do elenco pra não ficar inconsistente
    await supabase
      .from('team_players')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('championship_id', championshipId)
      .eq('team_id', team.id)
      .eq('player_id', player.id);

    redirect(withParam(returnTo, 'err', 'contract_create_failed'));
  }

  // -------------------- Debita carteira (com guard gte) --------------------
  const { data: updatedWallet, error: updErr } = await supabase
    .from('championship_wallet')
    .update({ balance: walletBalance - price })
    .eq('id', walletId)
    .gte('balance', price)
    .select('balance')
    .maybeSingle<WalletRow>();

  if (updErr || !updatedWallet) {
    // rollback contrato + elenco
    await supabase
      .from('player_contracts')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('championship_id', championshipId)
      .eq('player_id', player.id);

    await supabase
      .from('team_players')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('championship_id', championshipId)
      .eq('team_id', team.id)
      .eq('player_id', player.id);

    redirect(withParam(returnTo, 'err', 'wallet_debit'));
  }

  // -------------------- Logs / eventos (best-effort) --------------------
  {
    const { error: evErr } = await supabase.from('contract_events').insert({
      tenant_id: tenantId,
      championship_id: championshipId,
      player_id: player.id,
      from_team_id: null,
      to_team_id: team.id,
      kind: 'sign',
      payload: {
        startRound,
        endRound: null,
        salaryPerRound,
        buyoutAmount,
        source: 'hire_player_page',
      },
    });
    if (evErr) console.warn('contract_events insert failed', evErr);
  }

  {
    const { error: txErr } = await supabase.from('wallet_transactions').insert({
      tenant_id: tenantId,
      championship_id: championshipId,
      tenant_member_id: tm.id,
      team_id: team.id,
      player_id: player.id,
      amount: price,
      kind: 'hire_player',
      metadata: { source: 'hire_player_page' },
    });
    if (txErr) console.warn('wallet_transactions insert failed', txErr);
  }

  revalidatePath(basePath);
  redirect(withParam(returnTo, 'ok', 'hired'));
}

export async function buyMarketListingAction(formData: FormData) {
  const basePath = '/dashboard/negotiations/hirePlayer';

  const listingId = String(formData.get('listing_id') ?? '');
  const returnToRaw = String(formData.get('return_to') || basePath);
  const returnTo = returnToRaw.startsWith('/') ? returnToRaw : basePath;

  if (!listingId) {
    redirect(withParam(returnTo, 'err', 'listing_invalid'));
  }

  const { supabase } = await createServerSupabase();

  type BuyRpcRow = { ok: boolean; code: string | null; message: string | null };

  const { data, error } = await supabase
    .rpc('buy_market_listing', { p_listing_id: listingId })
    .returns<BuyRpcRow[]>();

  if (error) {
    console.error('buy_market_listing RPC error:', {
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

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!row?.ok) {
    redirect(withParam(returnTo, 'err', row?.code ?? 'market_buy_failed'));
  }

  revalidatePath(basePath);
  redirect(withParam(returnTo, 'ok', 'market_bought'));
}
