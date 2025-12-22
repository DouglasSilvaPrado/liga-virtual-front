import { createServerSupabase } from '@/lib/supabaseServer';
import { CompetitionSettingsData } from '@/@types/competition';
import { KnockoutBracketVisual } from './KnockoutBracketVisual';
import { BracketMatch } from '@/@types/knockout';

interface KnockoutBracketProps {
  competitionId: string;
  settings: CompetitionSettingsData;
  championshipId: string;
}

function hasJogosIdaVolta(
  specific: unknown
): specific is { jogos_ida_volta: boolean } {
  return (
    typeof specific === 'object' &&
    specific !== null &&
    'jogos_ida_volta' in specific
  );
}

export default async function KnockoutBracket({
  competitionId,
  settings,
  championshipId,
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
      penalties_home,
      penalties_away,
      status,
      is_locked,
      team_home:teams!team_home(name),
      team_away:teams!team_away(name),
      competition_id,
      championship_id
    `)
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .is('group_id', null)
    .order('round', { ascending: false })
    .order('leg');

  if (!data?.length) return null;

   const dataRound = data as unknown as BracketMatch[]

   const normalized: BracketMatch[] = dataRound.map(m => ({
    id: m.id,
    round: m.round,
    leg: m.leg,
    score_home: m.score_home,
    score_away: m.score_away,
    penalties_home: m.penalties_home,
    penalties_away: m.penalties_away,
    status: m.status === 'finished' ? 'finished' : 'scheduled',
    is_locked: m.is_locked,

    team_home: { name: m.team_home?.name ?? '—' },
    team_away: { name: m.team_away?.name ?? '—' },

    competition_id: competitionId,
    championship_id: championshipId,
  }));


  const rounds = normalized.reduce<Record<number, BracketMatch[]>>(
    (acc, match) => {
      acc[match.round] ??= [];
      acc[match.round].push(match);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Mata-mata</h2>

      <div className="relative overflow-x-auto">
        <KnockoutBracketVisual rounds={rounds} idaVolta={idaVolta} />
      </div>
    </div>
  );
}
