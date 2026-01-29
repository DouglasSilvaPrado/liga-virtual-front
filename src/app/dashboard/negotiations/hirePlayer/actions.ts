'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabaseServer';

type PlayerForHire = {
  id: number;
  position: string | null;
  price: string | null;
  price_value: number | null;
};

type WalletRow = {
  id: string;
  balance: number | string | null;
};

type TeamRow = {
  id: string;
  championship_id: string | null;
};

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

  // mantém só dígitos + separadores + sufixo K/M
  const m = raw.replace(/\s/g, '').match(/^R?\$?([\d.,]+)([KM])?$/i);
  if (!m) return 0;

  let numPart = m[1]; // "2.69" | "30.75" | "667" | "1.234,56"
  const suffix = (m[2] ?? '').toUpperCase(); // "K" | "M" | ""

  // Se tiver '.' e ',', assume pt-BR: 1.234,56
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

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select('id, position, price, price_value')
    .eq('id', playerId)
    .single<PlayerForHire>();

  if (playerErr || !player?.id) {
    redirect(withParam(returnTo, 'err', 'player_not_found'));
  }

  const price =
    player.price_value != null && Number.isFinite(player.price_value)
      ? player.price_value
      : parsePriceToNumber(player.price);

  if (!Number.isFinite(price) || price < 0) {
    redirect(withParam(returnTo, 'err', 'invalid_price'));
  }

  const { data: walletFound, error: walletErr } = await supabase
    .from('championship_wallet')
    .select('id, balance')
    .eq('tenant_member_id', tm.id)
    .eq('championship_id', team.championship_id)
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
        championship_id: team.championship_id,
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

  if (walletBalance < price) {
    redirect(withParam(returnTo, 'err', 'insufficient_funds'));
  }

  const { error: tpErr } = await supabase.from('team_players').insert({
    team_id: team.id,
    player_id: player.id,
    position: player.position,
    championship_id: team.championship_id,
    tenant_id: tenantId,
  });

  if (tpErr) {
    redirect(withParam(returnTo, 'err', 'already_hired'));
  }

  const { data: updatedWallet, error: updErr } = await supabase
    .from('championship_wallet')
    .update({ balance: walletBalance - price })
    .eq('id', walletId)
    .gte('balance', price)
    .select('balance')
    .maybeSingle<WalletRow>();

  if (updErr || !updatedWallet) {
    redirect(withParam(returnTo, 'err', 'wallet_debit'));
  }

  await supabase.from('wallet_transactions').insert({
    tenant_id: tenantId,
    championship_id: team.championship_id,
    tenant_member_id: tm.id,
    team_id: team.id,
    player_id: player.id,
    amount: price,
    kind: 'hire_player',
    metadata: { source: 'hire_player_page' },
  });

  revalidatePath(basePath);
  redirect(withParam(returnTo, 'ok', 'hired'));
}
