import { createServerSupabase } from '@/lib/supabaseServer';
import { CompetitionSettingsData } from '@/@types/competition';
import { KnockoutBracketVisual } from './KnockoutBracketVisual';
import { BracketMatch } from '@/@types/knockout';

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
    team_home:teams!team_home(id, name),
    team_away:teams!team_away(id, name)
  `)
  .eq('competition_id', competitionId)
  .eq('tenant_id', tenantId)
  .is('group_id', null)
  .order('round')
  .order('leg');


  if (!data || data.length === 0) return null;

  const dataRound = data as unknown as BracketMatch[]
  console.log("🚀 ~ KnockoutBracket ~ dataRound:", dataRound)

  const normalized: BracketMatch[] = dataRound.map((m) => {
    return {
    id: m.id,
    round: m.round,
    leg: m.leg,
    score_home: m.score_home,
    score_away: m.score_away,
    status: m.status === 'finished' ? 'finished' : 'scheduled',

    team_home: {
      name: m.team_home?.name ?? '—',
    },
    team_away: {
      name: m.team_away?.name ?? '—',
    },
  };
  });


  const rounds = normalized.reduce<Record<number, BracketMatch[]>>(
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

      <KnockoutBracketVisual
        rounds={rounds}
        idaVolta={idaVolta}
      />
    </div>
  );
}
