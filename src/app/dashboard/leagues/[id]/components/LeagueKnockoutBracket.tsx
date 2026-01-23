import { createServerSupabase } from '@/lib/supabaseServer';
import type { CompetitionSettingsData, CompetitionSpecific } from '@/@types/competition';
import type { KnockoutRoundView } from '@/@types/knockout';
import { KnockoutBracketVisual } from '@/app/dashboard/cups/[id]/components/KnockoutBracketVisual';

function hasIdaVoltaLeague(
  specific: CompetitionSpecific,
): specific is { mata_em_ida_e_volta: boolean } {
  return typeof specific === 'object' && specific !== null && 'mata_em_ida_e_volta' in specific;
}

export default async function LeagueKnockoutBracket({
  competitionId,
  settings,
}: {
  competitionId: string;
  settings: CompetitionSettingsData;
}) {
  const { supabase, tenantId } = await createServerSupabase();

  const idaVolta = hasIdaVoltaLeague(settings.specific)
    ? settings.specific.mata_em_ida_e_volta === true
    : false;

  const { data, error } = await supabase
    .from('knockout_rounds')
    .select(
      `
      id,
      round_number,
      name,
      matches:matches!matches_knockout_round_fk (
        id,
        leg,
        score_home,
        score_away,
        penalties_home,
        penalties_away,
        status,
        is_locked,
        team_home:teams!matches_team_home_fk ( id, name ),
        team_away:teams!matches_team_away_fk ( id, name )
      )
    `,
    )
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('round_number', { ascending: false });

  if (error) {
    console.error('Erro knockout liga:', error);
    return <p>Erro ao carregar mata-mata</p>;
  }

  if (!data?.length) {
    return <p className="text-muted-foreground">Nenhuma rodada de mata-mata encontrada</p>;
  }

  const dataView = data as unknown as KnockoutRoundView[];

  const safeRounds: KnockoutRoundView[] =
    dataView.map((round) => ({
      id: round.id,
      round_number: round.round_number,
      matches: round.matches.map((m) => ({
        id: m.id,
        leg: m.leg,
        score_home: m.score_home,
        score_away: m.score_away,
        penalties_home: m.penalties_home,
        penalties_away: m.penalties_away,
        status: m.status,
        is_locked: (m as any).is_locked ?? false,
        team_home: m.team_home ?? { id: '—', name: '—' },
        team_away: m.team_away ?? { id: '—', name: '—' },
        competition_id: competitionId,
      })),
    })) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Mata-mata</h2>
      <KnockoutBracketVisual rounds={safeRounds} idaVolta={idaVolta} />
    </div>
  );
}
