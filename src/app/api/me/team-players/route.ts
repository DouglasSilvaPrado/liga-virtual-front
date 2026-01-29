import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

type TeamRow = { id: string; championship_id: string | null };

type MineRow = {
  player_id: number | null;
  players: {
    id: number;
    name: string | null;
    rating: number | null;
    position: string | null;
    player_img: string | null;
  } | null;
};

export async function GET() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) return NextResponse.json({ players: [] }, { status: 200 });

  const { data: tm } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>();

  if (!tm?.id) return NextResponse.json({ players: [] }, { status: 200 });

  const { data: team } = await supabase
    .from('teams')
    .select('id, championship_id')
    .eq('tenant_id', tenantId)
    .eq('tenant_member_id', tm.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<TeamRow>();

  const myTeamId = team?.id ?? null;
  const championshipId = team?.championship_id ?? null;

  if (!myTeamId || !championshipId) return NextResponse.json({ players: [] }, { status: 200 });

  const { data } = await supabase
    .from('team_players')
    .select(
      `
      player_id,
      players ( id, name, rating, position, player_img )
    `,
    )
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('team_id', myTeamId)
    .returns<MineRow[]>();

  const players = (data ?? [])
    .filter((r): r is MineRow & { player_id: number } => Number.isFinite(r.player_id))
    .map((r) => ({
      player_id: r.player_id,
      name: r.players?.name ?? null,
      rating: r.players?.rating ?? null,
      position: r.players?.position ?? null,
      player_img: r.players?.player_img ?? null,
    }));

  return NextResponse.json({ players }, { status: 200 });
}
