import { createServerSupabase } from '@/lib/supabaseServer';
import { CompetitionSettingsData } from '@/@types/competition';

type BracketMatch = {
  id: string;
  round: number;
  leg: number;
  score_home: number | null;
  score_away: number | null;
  home_team: { name: string };
  away_team: { name: string };
  status: string;
};

interface KnockoutBracketProps {
  competitionId: string;
  settings: CompetitionSettingsData;
}

function hasJogosIdaVolta(
  specific: unknown
): specific is { jogos_ida_volta: boolean } {
  return (
    typeof specific === 'object' &&
    specific !== null &&
    'jogos_ida_volta' in specific &&
    typeof (specific as any).jogos_ida_volta === 'boolean'
  );
}


export default async function KnockoutBracket({
  competitionId,
  settings,
}: KnockoutBracketProps) {
  const { supabase, tenantId } = await createServerSupabase();

  // 🔥 EXEMPLO DE USO FUTURO
  const idaVolta = hasJogosIdaVolta(settings.specific)
    ? settings.specific.jogos_ida_volta
    : false;


  const { data } = await supabase
    .from('matches')
    .select(`
      id,
      round,
      leg,
      score_home,
      score_away,
      status,
      home_team:teams!team_home ( name ),
      away_team:teams!team_away ( name )
    `)
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .is('group_id', null)
    .order('round')
    .order('leg');

  if (!data || data.length === 0) return null;

  const rounds = data.reduce<Record<number, BracketMatch[]>>(
    (acc, m) => {
      acc[m.round] ??= [];
      acc[m.round].push(m);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Mata-mata</h2>

      <div className="flex gap-8 overflow-x-auto">
        {Object.entries(rounds).map(([round, matches]) => (
          <div key={round} className="min-w-[250px] space-y-4">
            <h3 className="text-center font-medium">
              {round === '1' ? 'Semifinal' : 'Final'}
              {idaVolta && <span className="text-xs"> (Ida e Volta)</span>}
            </h3>

            {matches.map((m) => (
              <div
                key={m.id}
                className="rounded border p-3 bg-background"
              >
                <div className="flex justify-between text-sm">
                  <span>{m.home_team.name}</span>
                  <strong>
                    {m.score_home ?? '-'} x {m.score_away ?? '-'}
                  </strong>
                  <span>{m.away_team.name}</span>
                </div>

                {idaVolta && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Jogo {m.leg}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
