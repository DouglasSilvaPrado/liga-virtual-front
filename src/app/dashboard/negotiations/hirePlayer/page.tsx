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
}

type TeamPlayerMineRow = {
  player_id: number | null;
  players: {
    id: number;
    name: string | null;
    rating: number | null;
    position: string | null;
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


type TeamPlayerJoinRow = {
  player_id: number | null;
  teams: {
    id: string | null;
    name: string | null;
    shields?: { shield_url: string | null } | null;
  } | null;
};

type WalletRow = { id: string; balance: number | string | null };
type TeamRow = { id: string; championship_id: string | null };

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

function normalizeBalance(v: WalletRow['balance']): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

function feedbackText(sp: HireSearchParams): { type: 'success' | 'error'; text: string } | null {
  if (sp.ok === 'hired') return { type: 'success', text: 'Jogador contratado com sucesso!' };
  if (sp.ok === 'trade_sent') return { type: 'success', text: 'Proposta de troca enviada! Aguardando resposta.' };

  if (!sp.err) return null;

  const map: Record<string, string> = {
    player_invalid: 'Jogador inválido.',
    not_logged: 'Você precisa estar logado.',
    no_tenant_member: 'Seu usuário não pertence a este tenant.',
    no_team: 'Você ainda não tem time criado.',
    no_championship: 'Seu time não está vinculado a um campeonato.',
    player_not_found: 'Jogador não encontrado.',
    invalid_price: 'Preço do jogador inválido.',
    wallet_read: 'Erro ao ler sua carteira.',
    wallet_create: 'Erro ao criar sua carteira.',
    insufficient_funds: 'Saldo insuficiente.',
    already_hired: 'Esse jogador já está no seu time.',
    wallet_debit: 'Erro ao debitar a carteira.',

    // trade (se você usar a action de troca)
    trade_invalid_requested: 'Jogador alvo inválido.',
    trade_invalid_offered: 'Jogador oferecido inválido.',
    trade_invalid_money_mode: 'Modo de dinheiro inválido.',
    trade_invalid_money_amount: 'Valor adicional inválido.',
    trade_offered_not_mine: 'O jogador oferecido não pertence ao seu time.',
    trade_requested_not_found: 'O jogador alvo não está em nenhum time.',
    trade_requested_is_mine: 'Você não pode propor troca por um jogador do seu próprio time.',
    trade_create_failed: 'Não foi possível criar a proposta de troca.',
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

  // returnTo absoluto (pra action)
  const basePath = '/dashboard/negotiations/hirePlayer';
  const qs = buildQueryString(sp, { ok: '', err: '' });
  const returnTo = qs ? `${basePath}?${qs}` : basePath;

  // -------------------- Contexto usuário (time/campeonato e saldo) --------------------
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

      // ✅ meus jogadores (para modal de troca)
      if (myTeamId && activeChampionshipId) {
      const { data: mine } = await supabase
        .from('team_players')
        .select(
          `
          player_id,
          players (
            id, name, rating, position, player_img
          )
        `,
        )
        .eq('tenant_id', tenantId)
        .eq('championship_id', activeChampionshipId)
        .eq('team_id', myTeamId)
        .returns<TeamPlayerMineRow[]>(); // ✅ TIPAGEM SUPABASE

      myPlayers =
        (mine ?? [])
          .filter((r): r is TeamPlayerMineRow & { player_id: number } => Number.isFinite(r.player_id))
          .map((r) => ({
            player_id: r.player_id,
            name: r.players?.name ?? null,
            rating: r.players?.rating ?? null,
            position: r.players?.position ?? null,
            player_img: r.players?.player_img ?? null,
          }));
      }
    }
  }

  // -------------------- LISTAGEM --------------------
  let query = supabase
    .from('players')
    .select('id,name,rating,position,price,player_img,nation_img,club_img', { count: 'exact' });

  if (q) query = query.ilike('name', `%${q}%`);
  if (pos) query = query.eq('position', pos);
  if (Number.isFinite(min)) query = query.gte('rating', min);
  if (Number.isFinite(max)) query = query.lte('rating', max);

  if (sort === 'name') {
    query = query.order('name', { ascending: dir === 'asc', nullsFirst: true });
  } else {
    query = query.order('rating', { ascending: dir === 'asc', nullsFirst: false });
  }

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) return <div className="p-6">Erro ao carregar jogadores</div>;

  const playersBase = (data ?? []) as Omit<
    PlayerRow,
    'current_team_id' | 'current_team_name' | 'current_team_shield'
  >[];

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const feedback = feedbackText(sp);

  // -------------------- Resolver "Time" (quem contratou) --------------------
  let players: PlayerRow[] = playersBase.map((p) => ({
    ...p,
    current_team_id: null,
    current_team_name: null,
    current_team_shield: null,
  }));

  if (activeChampionshipId && playersBase.length > 0) {
    const ids = playersBase.map((p) => p.id);

    const { data: tpRows } = await supabase
      .from('team_players')
      .select(
        `
        player_id,
        teams (
          id,
          name,
          shields ( shield_url )
        )
      `,
      )
      .eq('tenant_id', tenantId)
      .eq('championship_id', activeChampionshipId)
      .in('player_id', ids);

    const map = new Map<number, { teamId: string; name: string; shield: string | null }>();

    (tpRows as TeamPlayerJoinRow[] | null)?.forEach((r) => {
      if (r.player_id == null) return;

      const teamId = r.teams?.id ?? null;
      const name = r.teams?.name ?? null;
      if (!teamId || !name) return;

      const shield = r.teams?.shields?.shield_url ?? null;
      map.set(r.player_id, { teamId, name, shield });
    });

    players = playersBase.map((p) => {
      const t = map.get(p.id);
      return {
        ...p,
        current_team_id: t?.teamId ?? null,
        current_team_name: t?.name ?? null,
        current_team_shield: t?.shield ?? null,
      };
    });
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
            className={`rounded border px-3 py-1 ${
              page >= totalPages ? 'pointer-events-none opacity-50' : ''
            }`}
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
