import { createServerSupabase } from '@/lib/supabaseServer';
import {
  CompetitionSettingsData,
  CompetitionSpecific,
  MataMataSpecific,
} from '@/@types/competition';
import { KnockoutBracketVisual } from './KnockoutBracketVisual';
import { KnockoutRoundView } from '@/@types/knockout';
import { unknown } from 'zod';

interface KnockoutBracketProps {
  competitionId: string;
  settings: CompetitionSettingsData;
}

/* ───────── TYPE GUARD ───────── */

function hasJogosIdaVolta(specific: CompetitionSpecific): specific is MataMataSpecific {
  return typeof specific === 'object' && specific !== null && 'jogos_ida_volta' in specific;
}

export default async function KnockoutBracket({ competitionId, settings }: KnockoutBracketProps) {
  const { supabase, tenantId } = await createServerSupabase();

  const idaVolta = hasJogosIdaVolta(settings.specific) ? settings.specific.jogos_ida_volta : false;

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
      team_home:teams!matches_team_home_fk (
        id,
        name
      ),
      team_away:teams!matches_team_away_fk (
        id,
        name
      )
    )
  `,
    )
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('round_number', { ascending: false });

  if (error) {
    console.error('Erro knockout:', error);
    return <p>Erro ao carregar mata-mata</p>;
  }

  if (!data?.length) {
    return <p className="text-muted-foreground">Nenhuma rodada de mata-mata encontrada</p>;
  }

  const dataView = data as unknown as KnockoutRoundView[];

  const safeRounds: KnockoutRoundView[] =
    dataView?.map((round) => ({
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
