import { createServerSupabase } from '@/lib/supabaseServer';
import HirePlayerFilters from './components/HirePlayerFilters';
import PlayersTable from './components/PlayersTable';

export type HireSearchParams = {
  q?: string;
  pos?: string;
  min?: string;
  max?: string;
  page?: string;
  size?: string;
  sort?: 'rating' | 'name';
  dir?: 'asc' | 'desc';
  contract?: 'all' | 'free' | 'contracted'; // ✅ NOVO
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

  current_team_id: string | null;
  current_team_name: string | null;
  current_team_shield: string | null;

  contract_status: 'active' | 'loaned_out' | 'expired' | 'terminated' | null;
  contract_end_round: number | null;
  salary_per_round: number | null;
  buyout_amount: number | null;

  market_listing_id: string | null;
  market_price: number | null;
  market_seller_team_id: string | null;
}

type ContractJoinRow = {
  player_id: number | null;
  team_id: string | null;
  status: 'active' | 'loaned_out' | 'expired' | 'terminated' | null;
  end_round: number | null;
  salary_per_round: number | null;
  buyout_amount: number | null;
  teams: {
    id: string | null;
    name: string | null;
    shields?: { shield_url: string | null } | null;
  } | null;
};

type MarketListingRow = {
  id: string;
  player_id: number;
  price: number;
  seller_team_id: string;
  status: 'active' | 'sold' | 'cancelled';
};

type TeamPlayerMineRow = {
  player_id: number | null;
  players: {
    id: number;
    name: string | null;
    oa: string | null; // novo
    bp: string | null; // novo
    player_img: string | null;
  } | null;
};

export type MyTeamPlayerRow = {
  player_id: number;
  name: string | null;
  rating: number | null;
  position: string | null;
  player_img: string | null;
};

type WalletRow = { id: string; balance: number | string | null };
type TeamRow = { id: string; championship_id: string | null };

type PlayersListRow = {
  id: number;
  name: string | null;
  oa: string | null;
  bp: string | null;
  vl: string | null;
  player_img: string | null;
  nation_img: string | null;
  club_img: string | null;
  positions: string | null;
};

function safeInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function pad2(n: number) {
  const x = Math.max(0, Math.min(99, Math.trunc(n)));
  return String(x).padStart(2, '0');
}

function toIntOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : null;
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

function normalizeBalance(v: WalletRow['balance']): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

function feedbackText(sp: HireSearchParams): { type: 'success' | 'error'; text: string } | null {
  if (sp.ok === 'hired') return { type: 'success', text: 'Jogador contratado com sucesso!' };
  if (sp.ok === 'trade_sent')
    return { type: 'success', text: 'Proposta de troca enviada! Aguardando resposta.' };
  if (sp.ok === 'loan_sent')
    return { type: 'success', text: 'Proposta de empréstimo enviada! Aguardando resposta.' };

  if (sp.ok === 'market_bought') return { type: 'success', text: 'Jogador comprado com sucesso!' };

  if (!sp.err) return null;

  const map: Record<string, string> = {
    player_invalid: 'Jogador inválido.',
    not_logged: 'Você precisa estar logado.',
    no_tenant_member: 'Seu usuário não pertence ao tenant.',
    no_team: 'Você ainda não tem time criado.',
    no_championship: 'Seu time não está vinculado a um campeonato.',
    player_not_found: 'Jogador não encontrado.',
    invalid_price: 'Preço do jogador inválido.',
    wallet_read: 'Erro ao ler sua carteira.',
    wallet_create: 'Erro ao criar sua carteira.',
    insufficient_funds: 'Saldo insuficiente.',
    already_hired: 'Esse jogador já está no seu time.',
    wallet_debit: 'Erro ao debitar a carteira.',

    trade_invalid_requested: 'Jogador alvo inválido.',
    trade_invalid_offered: 'Jogador oferecido inválido.',
    trade_invalid_money_mode: 'Modo de dinheiro inválido.',
    trade_invalid_money_amount: 'Valor adicional inválido.',
    trade_offered_not_mine: 'O jogador oferecido não pertence ao seu time.',
    trade_requested_not_found: 'O jogador alvo não está em nenhum time.',
    trade_requested_is_mine: 'Você não pode propor troca por um jogador do seu próprio time.',
    trade_create_failed: 'Não foi possível criar a proposta de troca.',

    loan_player_invalid: 'Jogador inválido.',
    loan_invalid_money: 'Valor da proposta inválido.',
    loan_invalid_duration: 'Duração inválida.',
    loan_player_not_in_any_team: 'Este jogador não está em nenhum time.',
    loan_player_is_mine: 'Você não pode propor empréstimo do seu próprio jogador.',
    loan_create_failed: 'Não foi possível criar a proposta de empréstimo.',

    listing_invalid: 'Listagem inválida.',
    listing_not_found: 'Listagem não encontrada ou não está ativa.',
    cannot_buy_own: 'Você não pode comprar seu próprio jogador.',
    player_not_owned: 'O vendedor não possui mais este jogador.',
    market_buy_failed: 'Não foi possível concluir a compra.',

    contract_create_failed: 'Não foi possível criar o contrato do jogador.',
    loan_player_already_loaned: 'Este jogador já está emprestado no momento.',
    player_not_available: 'Este jogador não está disponível para negociação agora.',
  };

  return { type: 'error', text: map[sp.err] ?? `Erro: ${sp.err}` };
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

  const basePath = '/dashboard/negotiations/hirePlayer';
  const qs = buildQueryString(sp, { ok: '', err: '' });
  const returnTo = qs ? `${basePath}?${qs}` : basePath;

  const contract = (sp.contract ?? 'all') as 'all' | 'free' | 'contracted';

  // -------------------- Contexto usuário --------------------
  let walletBalance: number | null = null;
  let activeChampionshipId: string | null = null;
  let myTeamId: string | null = null;
  let myPlayers: MyTeamPlayerRow[] = [];

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;

  if (userId) {
    const { data: tm } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle<{ id: string }>();

    if (tm?.id) {
      const { data: team } = await supabase
        .from('teams')
        .select('id, championship_id')
        .eq('tenant_id', tenantId)
        .eq('tenant_member_id', tm.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<TeamRow>();

      myTeamId = team?.id ?? null;
      activeChampionshipId = team?.championship_id ?? null;

      if (activeChampionshipId) {
        const { data: wallet } = await supabase
          .from('championship_wallet')
          .select('id, balance')
          .eq('tenant_member_id', tm.id)
          .eq('championship_id', activeChampionshipId)
          .maybeSingle<WalletRow>();

        if (wallet) walletBalance = normalizeBalance(wallet.balance);
      }

      if (myTeamId && activeChampionshipId) {
        const { data: mine } = await supabase
          .from('team_players')
          .select(
            `
            player_id,
            players (
              id, name, oa, bp, player_img
            )
          `,
          )
          .eq('tenant_id', tenantId)
          .eq('championship_id', activeChampionshipId)
          .eq('team_id', myTeamId)
          .returns<TeamPlayerMineRow[]>();

        myPlayers = (mine ?? [])
          .filter((r): r is TeamPlayerMineRow & { player_id: number } =>
            Number.isFinite(r.player_id),
          )
          .map((r) => ({
            player_id: r.player_id,
            name: r.players?.name ?? null,
            rating: toIntOrNull(r.players?.oa) ?? null,
            position: r.players?.bp ?? null,
            player_img: r.players?.player_img ?? null,
          }));
      }
    }
  }

  // -------------------- FILTRO "LIVRE/CONTRATADO" --------------------
  let contractedIds: number[] = [];

  if (activeChampionshipId) {
    const { data: cIds } = await supabase
      .from('player_contracts')
      .select('player_id')
      .eq('tenant_id', tenantId)
      .eq('championship_id', activeChampionshipId)
      .in('status', ['active', 'loaned_out'])
      .returns<{ player_id: number | null }[]>();

    contractedIds = (cIds ?? [])
      .map((r) => r.player_id)
      .filter((id): id is number => Number.isFinite(id));
  }

  // -------------------- LISTAGEM --------------------
  let query = supabase
    .from('players')
    .select('id,name,oa,bp,vl,player_img,nation_img,club_img,positions', { count: 'exact' });

  if (q) query = query.ilike('name', `%${q}%`);
  if (pos) query = query.ilike('positions', `%${pos}%`);

  const minS = pad2(min);
  const maxS = pad2(max);
  query = query.gte('oa', minS).lte('oa', maxS);

  if (sort === 'name') {
    query = query.order('name', { ascending: dir === 'asc', nullsFirst: true });
  } else {
    query = query.order('oa', { ascending: dir === 'asc', nullsFirst: false });
  }
  // ✅ aplica o filtro
  if (contract === 'free') {
    if (contractedIds.length > 0) {
      // PostgREST: not.in.(1,2,3)
      query = query.not('id', 'in', `(${contractedIds.join(',')})`);
    }
  } else if (contract === 'contracted') {
    if (contractedIds.length === 0) {
      // nada contratado -> força vazio
      query = query.in('id', [-1]);
    } else {
      query = query.in('id', contractedIds);
    }
  }

  query = query.range(from, to);

  const { data, count, error } = await query.returns<PlayersListRow[]>();
  if (error) return <div className="p-6">Erro ao carregar jogadores</div>;

  const playersBase: Omit<
    PlayerRow,
    'current_team_id' | 'current_team_name' | 'current_team_shield'
  >[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name ?? null,
    rating: toIntOrNull(r.oa),
    position: r.bp ?? null,
    price: r.vl ?? null,
    player_img: r.player_img ?? null,
    nation_img: r.nation_img ?? null,
    club_img: r.club_img ?? null,

    // ✅ default contrato (vai ser preenchido no resolver depois)
    contract_status: null,
    contract_end_round: null,
    salary_per_round: null,
    buyout_amount: null,

    market_listing_id: null,
    market_price: null,
    market_seller_team_id: null,
  }));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const feedback = feedbackText(sp);

  // -------------------- Resolver "Contrato/Time" (player_contracts) --------------------
  let players: PlayerRow[] = playersBase.map((p) => ({
    ...p,
    current_team_id: null,
    current_team_name: null,
    current_team_shield: null,
  }));

  if (activeChampionshipId && playersBase.length > 0) {
    const ids = playersBase.map((p) => p.id);

    const { data: cRows } = await supabase
      .from('player_contracts')
      .select(
        `
        player_id, team_id, status, end_round, salary_per_round, buyout_amount,
        teams (
          id,
          name,
          shields ( shield_url )
        )
      `,
      )
      .eq('tenant_id', tenantId)
      .eq('championship_id', activeChampionshipId)
      .in('player_id', ids)
      .returns<ContractJoinRow[]>();

    const map = new Map<
      number,
      {
        teamId: string | null;
        name: string | null;
        shield: string | null;
        status: PlayerRow['contract_status'];
        end_round: number | null;
        salary: number | null;
        buyout: number | null;
      }
    >();

    (cRows ?? []).forEach((r) => {
      if (r.player_id == null) return;

      const teamId = r.team_id ?? null;
      const name = r.teams?.name ?? null;
      const shield = r.teams?.shields?.shield_url ?? null;

      map.set(r.player_id, {
        teamId,
        name,
        shield,
        status: r.status ?? null,
        end_round: r.end_round ?? null,
        salary: r.salary_per_round ?? null,
        buyout: r.buyout_amount ?? null,
      });
    });

    players = playersBase.map((p) => {
      const c = map.get(p.id);

      return {
        ...p,
        current_team_id: c?.teamId ?? null,
        current_team_name: c?.name ?? null,
        current_team_shield: c?.shield ?? null,

        contract_status: c?.status ?? null,
        contract_end_round: c?.end_round ?? null,
        salary_per_round: c?.salary ?? null,
        buyout_amount: c?.buyout ?? null,
      };
    });
  }

  // -------------------- Resolver Mercado --------------------
  if (activeChampionshipId && players.length > 0) {
    const ids = players.map((p) => p.id);

    const { data: listings } = await supabase
      .from('player_market_listings')
      .select('id, player_id, price, seller_team_id, status')
      .eq('tenant_id', tenantId)
      .eq('championship_id', activeChampionshipId)
      .eq('status', 'active')
      .in('player_id', ids)
      .returns<MarketListingRow[]>();

    const map = new Map<number, MarketListingRow>();
    (listings ?? []).forEach((l) => map.set(l.player_id, l));

    players = players.map((p) => {
      const l = map.get(p.id);
      return {
        ...p,
        market_listing_id: l?.id ?? null,
        market_price: l?.price ?? null,
        market_seller_team_id: l?.seller_team_id ?? null,
      };
    });
  } else {
    players = players.map((p) => ({
      ...p,
      market_listing_id: null,
      market_price: null,
      market_seller_team_id: null,
    }));
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contratar Jogadores</h1>
      </div>

      {feedback && (
        <div
          className={`rounded border p-3 text-sm ${
            feedback.type === 'error'
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-green-300 bg-green-50 text-green-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

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

      <PlayersTable
        players={players}
        returnTo={returnTo}
        walletBalance={walletBalance}
        myPlayers={myPlayers}
        myTeamId={myTeamId}
        activeChampionshipId={activeChampionshipId}
      />
    </div>
  );
}
