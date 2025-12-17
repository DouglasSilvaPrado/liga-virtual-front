import { createServerSupabase } from '@/lib/supabaseServer';
import MatchRow from './MatchRow';


type MatchDB = {
  id: string;
  round: number;
  score_home: number | null;
  score_away: number | null;
  home_team: { id: string; name: string }[] | { id: string; name: string };
  away_team: { id: string; name: string }[] | { id: string; name: string };
};


type Match = {
  id: string;
  round: number;
  score_home: number | null;
  score_away: number | null;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
};

function normalizeTeam(
  team: { id: string; name: string }[] | { id: string; name: string }
) {
  return Array.isArray(team) ? team[0] : team;
}


export default async function GroupRounds({
  competitionId,
}: {
  competitionId: string;
}) {
  const { supabase, tenantId } = await createServerSupabase();

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      round,
      score_home,
      score_away,
      home_team:teams!team_home(id, name),
      away_team:teams!team_away(id, name)
    `)
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('round', { ascending: true });

  if (error) {
    console.error(error);
    return <p>Erro ao carregar rodadas</p>;
  }

  if (!data || data.length === 0) {
    return <p>Nenhuma rodada encontrada</p>;
  }

  const matches: Match[] = (data as MatchDB[]).map((m) => ({
    id: m.id,
    round: m.round,
    score_home: m.score_home,
    score_away: m.score_away,
    home_team: normalizeTeam(m.home_team),
    away_team: normalizeTeam(m.away_team),
  }));


  const rounds = matches.reduce<Record<number, Match[]>>((acc, match) => {
    acc[match.round] ??= [];
    acc[match.round].push(match);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Fase de Grupos</h2>

      {Object.entries(rounds).map(([round, roundMatches]) => (
        <div key={round} className="rounded border p-4 space-y-2">
          <h3 className="font-medium">Rodada {round}</h3>

          {roundMatches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </div>
      ))}
    </div>
  );
}
