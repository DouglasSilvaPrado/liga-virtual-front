import { createServerSupabase } from '@/lib/supabaseServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import ToggleLeagueRoundButton from './ToggleLeagueRoundButton';
import LeagueMatchRow from './LeagueMatchRow';

type MatchFromDB = {
  id: string;
  round: number | null;
  score_home: number | null;
  score_away: number | null;
  status: 'scheduled' | 'in_progress' | 'finished' | 'canceled';

  round_info: { round: number; is_open: boolean } | null;

  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
};

function isComplete(m: MatchFromDB) {
  return m.round_info && m.home_team && m.away_team;
}

export default async function LeagueRounds({ competitionId }: { competitionId: string }) {
  const { supabase, tenantId } = await createServerSupabase();
  const supabaseAuth = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  let isAdminOrOwner = false;
  let memberTeamId: string | null = null;

  if (user) {
    const { data: member } = await supabase
      .from('tenant_members')
      .select('id, role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    isAdminOrOwner = member?.role === 'admin' || member?.role === 'owner';

    if (member?.role === 'member') {
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('tenant_member_id', member.id)
        .eq('tenant_id', tenantId)
        .single();

      memberTeamId = team?.id ?? null;
    }
  }

  let query = supabase
    .from('matches')
    .select(
      `
      id,
      round,
      score_home,
      score_away,
      status,
      round_info:league_rounds!matches_league_round_fk (
        round,
        is_open
      ),
      home_team:teams!matches_team_home_fk ( id, name ),
      away_team:teams!matches_team_away_fk ( id, name )
    `,
    )
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('round', { ascending: true })
    .order('created_at', { ascending: true });

  // 🔒 MEMBER: só jogos do time + rodada aberta (igual seu GroupRounds)
  if (!isAdminOrOwner && memberTeamId) {
    query = query
      .or(`team_home.eq.${memberTeamId},team_away.eq.${memberTeamId}`)
      .eq('round_info.is_open', true);
  }

  const { data, error } = await query;

  if (error) return <p>Erro ao carregar rodadas da liga</p>;
  if (!data || data.length === 0) return <p>Nenhuma rodada encontrada</p>;

  const matches = (data as unknown as MatchFromDB[]).filter(isComplete);

  // Agrupa por rodada
  const grouped = matches.reduce<Record<number, MatchFromDB[]>>((acc, m) => {
    const r = m.round_info!.round;
    acc[r] ??= [];
    acc[r].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6 rounded border bg-white p-4">
      <h2 className="text-lg font-semibold">Partidas (Liga)</h2>

      {Object.entries(grouped).map(([roundStr, roundMatches]) => {
        const round = Number(roundStr);
        const isOpen = roundMatches[0].round_info!.is_open;

        return (
          <div key={round} className="space-y-2 rounded border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Rodada {round}</h3>

              {isAdminOrOwner && (
                <ToggleLeagueRoundButton
                  competitionId={competitionId}
                  round={round}
                  isOpen={isOpen}
                />
              )}
            </div>

            {roundMatches.map((match) => (
              <LeagueMatchRow
                key={match.id}
                match={{
                  id: match.id,
                  score_home: match.score_home,
                  score_away: match.score_away,
                  status: match.status,
                  round_info: { is_open: isOpen },
                  home_team: match.home_team!,
                  away_team: match.away_team!,
                }}
                viewer={{
                  isAdminOrOwner,
                  memberTeamId,
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
