import { createServerSupabase } from '@/lib/supabaseServer';
import ProposalsTable from './components/ProposalsTable';

type TeamRow = { id: string; championship_id: string | null };
type WalletRow = { id: string; balance: number | string | null };

function normalizeBalance(v: WalletRow['balance']): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

export type MoneyDirection = 'none' | 'from_to' | 'to_from';
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

  from_team: { id: string; name: string | null; shield_url: string | null } | null;
  to_team: { id: string; name: string | null; shield_url: string | null } | null;

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

  const proposals = proposalsRaw ?? [];

  if (proposals.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Propostas</h1>
        <div className="text-sm text-muted-foreground">Nenhuma proposta encontrada.</div>
      </div>
    );
  }

  // ✅ 2) Busca times envolvidos
  const teamIds = Array.from(
    new Set<string>(proposals.flatMap((p) => [p.from_team_id, p.to_team_id])),
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

  const teamsMap = new Map<string, { id: string; name: string | null; shield_url: string | null }>();
  (teamsRaw ?? []).forEach((t) => {
    teamsMap.set(t.id, {
      id: t.id,
      name: t.name ?? null,
      shield_url: t.shields?.shield_url ?? null,
    });
  });

  // ✅ 3) Busca players envolvidos
  const playerIds = Array.from(
    new Set<number>(proposals.flatMap((p) => [p.offered_player_id, p.requested_player_id])),
  );

  const { data: playersRaw } = await supabase
    .from('players')
    .select('id, name, rating, position, player_img')
    .in('id', playerIds)
    .returns<PlayerMini[]>();

  const playersMap = new Map<number, PlayerMini>();
  (playersRaw ?? []).forEach((pl) => playersMap.set(pl.id, pl));

  // ✅ 4) Monta DTO final
  const list: ProposalListItem[] = proposals.map((p) => ({
    id: p.id,
    status: p.status,
    created_at: p.created_at,
    from_team_id: p.from_team_id,
    to_team_id: p.to_team_id,
    offered_player_id: p.offered_player_id,
    requested_player_id: p.requested_player_id,
    money_direction: p.money_direction,
    money_amount: p.money_amount,

    from_team: teamsMap.get(p.from_team_id) ?? null,
    to_team: teamsMap.get(p.to_team_id) ?? null,
    offered_player: playersMap.get(p.offered_player_id) ?? null,
    requested_player: playersMap.get(p.requested_player_id) ?? null,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Propostas</h1>
        <div className="text-sm text-muted-foreground">
          Seu saldo: {walletBalance == null ? '—' : `R$ ${walletBalance.toLocaleString('pt-BR')}`}
        </div>
      </div>

      <ProposalsTable proposals={list} myTeamId={myTeamId} walletBalance={walletBalance} />
    </div>
  );
}
