// src/app/dashboard/management/my-team/page.tsx
import { createServerSupabase } from '@/lib/supabaseServer';
import CreateTeamModal from './components/CreateTeamModal';
import { Team } from '@/@types/team';
import MyTeamCard from './components/MyTeamCard';
import { Shield } from '@/@types/shield';
import MyPlayersGrid, { MyTeamPlayerCardItem } from './components/MyPlayersGrid';

type TeamRow = { id: string; championship_id: string | null; shield_id: string | null };

type ChampionshipRow = { id: string };

type TenantMemberRow = { id: string };

type TeamPlayerJoinRow = {
  player_id: number | null;
  players: {
    id: number;
    name: string | null;
    oa: string | null;
    bp: string | null;
    player_img: string | null;
    nation_img: string | null;
    club_img: string | null;
  } | null;
};

type ListingRow = {
  player_id: number;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
};

function toIntOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export default async function MyTeamPage() {
  const { supabase, tenantId } = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-red-500">Você não está autenticado.</p>
      </div>
    );
  }

  // campeonato ativo (por enquanto 1º)
  const { data: championship } = await supabase
    .from('championships')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<ChampionshipRow>();

  const { data: tenantMember, error: memberError } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle<TenantMemberRow>();

  if (memberError) console.error('Erro buscando tenant_member:', memberError);

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('tenant_member_id', tenantMember?.id ?? '')
    .maybeSingle<Team>();

  const hasTeam = !!team;

  const { data: shield } = await supabase
    .from('shields')
    .select('*')
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .eq('id', (team as TeamRow | null)?.shield_id ?? null)
    .maybeSingle<Shield>();

  // ---------------------------
  // ✅ Buscar meus jogadores
  // ---------------------------
  let myPlayers: MyTeamPlayerCardItem[] = [];

  if (hasTeam && championship?.id) {
    const { data: tp } = await supabase
      .from('team_players')
      .select(
        `
          player_id,
          players (
            id, name, oa, bp, player_img, nation_img, club_img
          )
        `,
      )
      .eq('tenant_id', tenantId)
      .eq('championship_id', championship.id)
      .eq('team_id', team.id)
      .returns<TeamPlayerJoinRow[]>();

    const playersBase: MyTeamPlayerCardItem[] = (tp ?? [])
      .filter((r): r is TeamPlayerJoinRow & { player_id: number } => Number.isFinite(r.player_id))
      .map((r) => ({
        player_id: r.player_id,
        id: r.players?.id ?? r.player_id,
        name: r.players?.name ?? null,
        rating: toIntOrNull(r.players?.oa),
        position: r.players?.bp ?? null,
        player_img: r.players?.player_img ?? null,
        nation_img: r.players?.nation_img ?? null,
        club_img: r.players?.club_img ?? null,
        listing_price: null,
      }));

    const ids = playersBase.map((p) => p.player_id);

    if (ids.length > 0) {
      const { data: listings } = await supabase
        .from('player_market_listings')
        .select('player_id, price, status')
        .eq('tenant_id', tenantId)
        .eq('championship_id', championship.id)
        .eq('status', 'active')
        .in('player_id', ids)
        .returns<ListingRow[]>();

      const map = new Map<number, number>();
      (listings ?? []).forEach((l) => map.set(l.player_id, l.price));

      myPlayers = playersBase.map((p) => ({
        ...p,
        listing_price: map.get(p.player_id) ?? null,
      }));
    } else {
      myPlayers = playersBase;
    }
  }

  const canCreateTeam = !!tenantMember?.id && !!championship?.id;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meu time</h1>
      </div>

      {!hasTeam && (
        <div className="mt-6">
          {canCreateTeam ? (
            <CreateTeamModal
              tenantId={tenantId}
              tenantMemberId={tenantMember.id}
              championshipId={championship.id}
            />
          ) : (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Não foi possível criar o time: faltam dados de tenantMember ou campeonato ativo.
            </div>
          )}
        </div>
      )}

      {hasTeam && (
        <div className="mt-6 space-y-6">
          <MyTeamCard team={team} shield={shield} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Meus jogadores</h2>
              <div className="text-muted-foreground text-sm">{myPlayers.length} jogador(es)</div>
            </div>

            <MyPlayersGrid items={myPlayers} championshipId={championship?.id ?? null} />
          </div>
        </div>
      )}
    </div>
  );
}
