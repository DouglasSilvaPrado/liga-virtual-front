import { createServerSupabase } from '@/lib/supabaseServer';
import ProposalsTable from './components/ProposalsTable';

type TeamRow = { id: string; championship_id: string | null };
type WalletRow = { id: string; balance: number | string | null };

function normalizeBalance(v: WalletRow['balance']): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

export type MoneyDirection = 'none' | 'pay' | 'ask';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'cancelled';

export type ProposalRow = {
  id: string;
  tenant_id: string;
  championship_id: string;
  from_team_id: string;
  to_team_id: string;
  offered_player_id: number;
  requested_player_id: number;
  money_direction: MoneyDirection;
  money_amount: number;
  status: ProposalStatus;
  created_by_user_id: string;
  created_at: string;
};

export type ProposalListItem = {
  id: string;
  status: ProposalStatus;
  created_at: string;

  from_team_id: string;
  to_team_id: string;

  offered_player_id: number;
  requested_player_id: number;

  money_direction: MoneyDirection;
  money_amount: number;

  pay: { id: string; name: string | null; shield_url: string | null } | null;
  ask: { id: string; name: string | null; shield_url: string | null } | null;

  offered_player: {
    id: number;
    name: string | null;
    rating: number | null;
    position: string | null;
    player_img: string | null;
  } | null;

  requested_player: {
    id: number;
    name: string | null;
    rating: number | null;
    position: string | null;
    player_img: string | null;
  } | null;
};

type TeamWithShield = {
  id: string;
  name: string | null;
  shields: { shield_url: string | null } | null;
};

type PlayerMini = {
  id: number;
  name: string | null;
  rating: number | null;
  position: string | null;
  player_img: string | null;
};

export type LoanProposalStatus = ProposalStatus; 

export type LoanProposalRow = {
  id: string;
  tenant_id: string;
  championship_id: string;
  from_team_id: string;
  to_team_id: string;
  player_id: number;
  money_amount: number;
  duration_rounds: number | null;
  status: LoanProposalStatus;
  created_at: string;
};

export type LoanListItem = {
  kind: 'loan';

  id: string;
  status: LoanProposalStatus;
  created_at: string;

  from_team_id: string;
  to_team_id: string;

  money_amount: number;
  duration_rounds: number | null;

  pay: { id: string; name: string | null; shield_url: string | null } | null; // quem envia
  ask: { id: string; name: string | null; shield_url: string | null } | null; // quem recebe

  player: PlayerMini | null;
};

export type TradeListItem = ProposalListItem & { kind: 'trade' };

export type AnyProposalListItem = TradeListItem | LoanListItem;


export default async function ProposalsPage() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;

  let myTeamId: string | null = null;
  let activeChampionshipId: string | null = null;
  let walletBalance: number | null = null;

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
    }
  }

  if (!myTeamId || !activeChampionshipId) {
    return <div className="p-6">Você ainda não tem time/campeonato ativo.</div>;
  }

  // ✅ 1) Propostas do campeonato envolvendo meu time
  const { data: proposalsRaw, error: pErr } = await supabase
    .from('trade_proposals')
    .select(
      `
      id, tenant_id, championship_id,
      from_team_id, to_team_id,
      offered_player_id, requested_player_id,
      money_direction, money_amount,
      status, created_by_user_id, created_at
    `,
    )
    .eq('tenant_id', tenantId)
    .eq('championship_id', activeChampionshipId)
    .or(`from_team_id.eq.${myTeamId},to_team_id.eq.${myTeamId}`)
    .order('created_at', { ascending: false })
    .returns<ProposalRow[]>();

  if (pErr) return <div className="p-6">Erro ao carregar propostas.</div>;

   // ✅ 1b) Propostas de empréstimo do campeonato envolvendo meu time
  const { data: loansRaw, error: lErr } = await supabase
    .from('loan_proposals')
    .select(
      `
      id, tenant_id, championship_id,
      from_team_id, to_team_id,
      player_id,
      money_amount, duration_rounds,
      status, created_at
    `,
    )
    .eq('tenant_id', tenantId)
    .eq('championship_id', activeChampionshipId)
    .or(`from_team_id.eq.${myTeamId},to_team_id.eq.${myTeamId}`)
    .order('created_at', { ascending: false })
    .returns<LoanProposalRow[]>();

  if (lErr) return <div className="p-6">Erro ao carregar propostas de empréstimo.</div>;

  const loans = loansRaw ?? [];

  const proposals = proposalsRaw ?? [];

  if (proposals.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Propostas</h1>
        <div className="text-muted-foreground text-sm">Nenhuma proposta encontrada.</div>
      </div>
    );
  }

  // ✅ 2) Busca times envolvidos
  const teamIds = Array.from(
    new Set<string>([
      ...proposals.flatMap((p) => [p.from_team_id, p.to_team_id]),
      ...loans.flatMap((p) => [p.from_team_id, p.to_team_id]),
    ]),
  );

  const { data: teamsRaw } = await supabase
    .from('teams')
    .select(
      `
      id, name,
      shields ( shield_url )
    `,
    )
    .eq('tenant_id', tenantId)
    .in('id', teamIds)
    .returns<TeamWithShield[]>();

  const teamsMap = new Map<
    string,
    { id: string; name: string | null; shield_url: string | null }
  >();
  (teamsRaw ?? []).forEach((t) => {
    teamsMap.set(t.id, {
      id: t.id,
      name: t.name ?? null,
      shield_url: t.shields?.shield_url ?? null,
    });
  });

  // ✅ 3) Busca players envolvidos
    const playerIds = Array.from(
    new Set<number>([
      ...proposals.flatMap((p) => [p.offered_player_id, p.requested_player_id]),
      ...loans.map((l) => l.player_id),
    ]),
  );


  const { data: playersRaw } = await supabase
    .from('players')
    .select('id, name, rating, position, player_img')
    .in('id', playerIds)
    .returns<PlayerMini[]>();

  const playersMap = new Map<number, PlayerMini>();
  (playersRaw ?? []).forEach((pl) => playersMap.set(pl.id, pl));

  // ✅ 4) Monta DTO final
  const tradeList: TradeListItem[] = proposals.map((p) => ({
    kind: 'trade',
    id: p.id,
    status: p.status,
    created_at: p.created_at,
    from_team_id: p.from_team_id,
    to_team_id: p.to_team_id,
    offered_player_id: p.offered_player_id,
    requested_player_id: p.requested_player_id,
    money_direction: p.money_direction,
    money_amount: p.money_amount,
    pay: teamsMap.get(p.from_team_id) ?? null,
    ask: teamsMap.get(p.to_team_id) ?? null,
    offered_player: playersMap.get(p.offered_player_id) ?? null,
    requested_player: playersMap.get(p.requested_player_id) ?? null,
  }));

  const loanList: LoanListItem[] = loans.map((l) => ({
    kind: 'loan',
    id: l.id,
    status: l.status,
    created_at: l.created_at,
    from_team_id: l.from_team_id,
    to_team_id: l.to_team_id,
    money_amount: l.money_amount ?? 0,
    duration_rounds: l.duration_rounds ?? null,
    pay: teamsMap.get(l.from_team_id) ?? null,
    ask: teamsMap.get(l.to_team_id) ?? null,
    player: playersMap.get(l.player_id) ?? null,
  }));

  // ✅ junta e ordena por data desc
  const list: AnyProposalListItem[] = [...tradeList, ...loanList].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
);


  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Propostas</h1>
        <div className="text-muted-foreground text-sm">
          Seu saldo: {walletBalance == null ? '—' : `R$ ${walletBalance.toLocaleString('pt-BR')}`}
        </div>
      </div>

      <ProposalsTable proposals={list} myTeamId={myTeamId} walletBalance={walletBalance} />
    </div>
  );
}
