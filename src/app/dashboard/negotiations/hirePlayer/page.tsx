import { createServerSupabase } from '@/lib/supabaseServer';
import HirePlayerFilters from './components/HirePlayerFilters';
import PlayersTable from './components/PlayersTable';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export type HireSearchParams = {
  q?: string;
  pos?: string;
  min?: string;
  max?: string;
  page?: string;
  size?: string;
  sort?: 'rating' | 'name';
  dir?: 'asc' | 'desc';
  ok?: string;
  err?: string;
};

export interface PlayerRow {
  id: number;
  name: string | null;
  rating: number | null;
  position: string | null;
  price: string | null;
  player_img: string | null;
  nation_img: string | null;
  club_img: string | null;
}

function safeInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function buildQueryString(sp: HireSearchParams, override: Partial<HireSearchParams> = {}) {
  const params = new URLSearchParams();
  const merged: HireSearchParams = { ...sp, ...override };

  (Object.keys(merged) as (keyof HireSearchParams)[]).forEach((key) => {
    const value = merged[key];
    if (value == null || value === '') return;
    params.set(String(key), String(value));
  });

  return params.toString();
}

/**
 * Adds/overwrites one search param in a (possibly relative) path+query string safely.
 * Example: withParam('/a?x=1', 'err', 'no_team') => '/a?x=1&err=no_team'
 */
function withParam(url: string, key: string, value: string) {
  const u = new URL(url, 'http://local'); // base fake só pra parsear
  u.searchParams.set(key, value);
  return u.pathname + u.search;
}

function parsePriceToNumber(priceText: string | null | undefined): number {
  if (!priceText) return 0;

  const raw = priceText.toString().trim().toUpperCase();

  // tenta lidar com "1.2M", "850K", "1000000", "R$ 1.000.000"
  const cleaned = raw
    .replaceAll('R$', '')
    .replaceAll(' ', '')
    .replaceAll('.', '')
    .replaceAll(',', '.');

  const mult = cleaned.endsWith('M') ? 1_000_000 : cleaned.endsWith('K') ? 1_000 : 1;
  const numeric = cleaned.replace(/[MK]$/g, '');

  const n = Number(numeric);
  if (!Number.isFinite(n)) return 0;

  return Math.round(n * mult);
}

export default async function HirePlayerPage({
  searchParams,
}: {
  searchParams: Promise<HireSearchParams>;
}) {
  const sp = await searchParams;

  const q = (sp.q ?? '').trim();
  const pos = (sp.pos ?? '').trim();
  const min = safeInt(sp.min, 0);
  const max = safeInt(sp.max, 99);

  const page = Math.max(1, safeInt(sp.page, 1));
  const size = Math.min(50, Math.max(10, safeInt(sp.size, 20)));

  const sort = sp.sort ?? 'rating';
  const dir = sp.dir ?? 'desc';

  const from = (page - 1) * size;
  const to = from + size - 1;

  const { supabase, tenantId } = await createServerSupabase();

  // ✅ URL de retorno ABSOLUTA (path + query). Nunca use somente "?..."
  const basePath = '/dashboard/negotiations/hirePlayer';
  const qs = buildQueryString(sp);
  const returnTo = qs ? `${basePath}?${qs}` : basePath;

  // ✅ server action
  async function hirePlayerAction(formData: FormData) {
    'use server';

    const playerId = Number(formData.get('player_id'));
    const returnToRaw = String(formData.get('return_to') || basePath);
    const returnTo = returnToRaw.startsWith('/') ? returnToRaw : basePath; // sanity

    if (!Number.isFinite(playerId) || playerId <= 0) {
      redirect(withParam(returnTo, 'err', 'player_invalid'));
    }

    const { supabase, tenantId } = await createServerSupabase();

    // user
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;

    if (userErr || !userId) {
      redirect(withParam(returnTo, 'err', 'not_logged'));
    }

    // tenant_member
    const { data: tm, error: tmErr } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle();

    if (tmErr || !tm?.id) {
      redirect(withParam(returnTo, 'err', 'no_tenant_member'));
    }

    // team do usuário (mais recente)
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .select('id, championship_id')
      .eq('tenant_id', tenantId)
      .eq('tenant_member_id', tm.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (teamErr || !team?.id) {
      redirect(withParam(returnTo, 'err', 'no_team'));
    }
    if (!team.championship_id) {
      redirect(withParam(returnTo, 'err', 'no_championship'));
    }

    // player
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .select('id, position, price, price_value')
      .eq('id', playerId)
      .single();

    if (playerErr || !player?.id) {
      redirect(withParam(returnTo, 'err', 'player_not_found'));
    }

    const price =
      (player as any).price_value != null
        ? Number((player as any).price_value)
        : parsePriceToNumber((player as any).price);

    if (!Number.isFinite(price) || price < 0) {
      redirect(withParam(returnTo, 'err', 'invalid_price'));
    }

    // wallet (cria se não existir)
    const { data: walletFound, error: walletErr } = await supabase
      .from('championship_wallet')
      .select('id, balance')
      .eq('tenant_member_id', tm.id)
      .eq('championship_id', team.championship_id)
      .maybeSingle();

    if (walletErr) {
      redirect(withParam(returnTo, 'err', 'wallet_read'));
    }

    let walletId = walletFound?.id ?? null;
    let walletBalance = Number(walletFound?.balance ?? 0);

    if (!walletId) {
      const { data: createdWallet, error: createWalletErr } = await supabase
        .from('championship_wallet')
        .insert({
          tenant_member_id: tm.id,
          championship_id: team.championship_id,
          balance: 0,
        })
        .select('id, balance')
        .single();

      if (createWalletErr || !createdWallet?.id) {
        redirect(withParam(returnTo, 'err', 'wallet_create'));
      }

      walletId = createdWallet.id;
      walletBalance = Number(createdWallet.balance ?? 0);
    }

    // saldo suficiente?
    if (walletBalance < price) {
      redirect(withParam(returnTo, 'err', 'insufficient_funds'));
    }

    // insere jogador no time (evita duplicado pelo unique index que você deve criar)
    const { error: tpErr } = await supabase.from('team_players').insert({
      team_id: team.id,
      player_id: player.id,
      position: (player as any).position,
      championship_id: team.championship_id,
      tenant_id: tenantId,
    });

    if (tpErr) {
      redirect(withParam(returnTo, 'err', 'already_hired'));
    }

    // debita wallet com proteção: só atualiza se balance >= price
    const { data: updatedWallet, error: updErr } = await supabase
      .from('championship_wallet')
      .update({ balance: walletBalance - price })
      .eq('id', walletId)
      .gte('balance', price)
      .select('balance')
      .maybeSingle();

    if (updErr || !updatedWallet) {
      redirect(withParam(returnTo, 'err', 'wallet_debit'));
    }

    // registra transação (opcional, se a tabela existir)
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

  // -------------------- LISTAGEM --------------------
  let query = supabase
    .from('players')
    .select('id,name,rating,position,price,player_img,nation_img,club_img', { count: 'exact' });

  // filtros
  if (q) query = query.ilike('name', `%${q}%`);
  if (pos) query = query.eq('position', pos);
  if (Number.isFinite(min)) query = query.gte('rating', min);
  if (Number.isFinite(max)) query = query.lte('rating', max);

  // ordenação
  if (sort === 'name') {
    query = query.order('name', { ascending: dir === 'asc', nullsFirst: true });
  } else {
    query = query.order('rating', { ascending: dir === 'asc', nullsFirst: false });
  }

  // paginação
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return <div className="p-6">Erro ao carregar jogadores</div>;
  }

  const players = (data ?? []) as PlayerRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contratar Jogadores</h1>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <HirePlayerFilters value={sp} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {total} jogador(es) • página {page} de {totalPages}
        </div>

        <div className="flex gap-2">
          <a
            className={`rounded border px-3 py-1 ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
            href={`?${buildQueryString(sp, { page: String(page - 1), ok: '', err: '' })}`}
          >
            Anterior
          </a>

          <a
            className={`rounded border px-3 py-1 ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
            href={`?${buildQueryString(sp, { page: String(page + 1), ok: '', err: '' })}`}
          >
            Próxima
          </a>
        </div>
      </div>

      <PlayersTable players={players} hireAction={hirePlayerAction} returnTo={returnTo} />
    </div>
  );
}
