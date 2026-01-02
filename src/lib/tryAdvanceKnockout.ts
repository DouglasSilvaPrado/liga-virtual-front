import { SupabaseClient } from '@supabase/supabase-js';
import { CompetitionSettingsData } from '@/@types/competition';

/* ───────────────────────── HELPERS ───────────────────────── */

function getIdaVolta(settings: CompetitionSettingsData, roundNumber: number): boolean {
  const specific = settings?.specific as Partial<{
    mata_em_ida_e_volta: boolean;
    final_ida_volta: boolean;
  }>;

  if (!specific) return false;

  if (roundNumber === 1) {
    return specific.final_ida_volta === true;
  }

  return specific.mata_em_ida_e_volta === true;
}

/* ───────────────────────── MAIN ───────────────────────── */

export async function tryAdvanceKnockout({
  supabase,
  competitionId,
  tenantId,
  settings,
}: {
  supabase: SupabaseClient;
  competitionId: string;
  tenantId: string;
  settings: CompetitionSettingsData;
}) {
  /* 🔎 Rodada atual */
  const { data: round } = await supabase
    .from('knockout_rounds')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .eq('is_current', true)
    .single();

  if (!round || round.is_finished) return;

  const idaVolta = getIdaVolta(settings, round.round_number);

  /* 🔎 Jogos da rodada */
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('knockout_round_id', round.id)
    .eq('tenant_id', tenantId);

  if (!matches?.length) return;

  /* ⛔ Ainda há jogos abertos */
  if (matches.some((m) => m.status !== 'finished')) return;

  /* 🧮 Agrupar confrontos (ida/volta) */
  const confrontos = new Map<string, typeof matches>();

  for (const m of matches) {
    const key = [m.team_home, m.team_away].sort().join('|');
    confrontos.set(key, [...(confrontos.get(key) ?? []), m]);
  }

  /* ⛔ Se for ida/volta, garantir 2 jogos por confronto */
  if (idaVolta) {
    for (const jogos of confrontos.values()) {
      if (jogos.length < 2) {
        console.log('⛔ Ida/volta incompleto, aguardando volta');
        return;
      }
    }
  }

  /* 🏆 Determinar vencedores */
  const winners: string[] = [];

  for (const jogos of confrontos.values()) {
    const gols: Record<string, number> = {};

    for (const j of jogos) {
      gols[j.team_home] = (gols[j.team_home] ?? 0) + (j.score_home ?? 0);
      gols[j.team_away] = (gols[j.team_away] ?? 0) + (j.score_away ?? 0);
    }

    const [[a, ga], [b, gb]] = Object.entries(gols);

    if (ga > gb) {
      winners.push(a);
    } else if (gb > ga) {
      winners.push(b);
    } else {
      const pen = jogos.find((j) => j.penalties_home != null);
      if (!pen) return;

      winners.push(pen.penalties_home > pen.penalties_away ? pen.team_home : pen.team_away);
    }
  }

  /* 🔒 Finaliza rodada atual */
  await supabase
    .from('knockout_rounds')
    .update({ is_current: false, is_finished: true })
    .eq('id', round.id)
    .eq('tenant_id', tenantId);

  /* 🏆 Final do campeonato */
  if (winners.length === 1) {
    await supabase
      .from('competitions')
      .update({
        status: 'finished',
        champion_team_id: winners[0],
      })
      .eq('id', competitionId)
      .eq('tenant_id', tenantId);

    return;
  }

  /* ➕ Próxima rodada */
  const nextRoundNumber = round.round_number - 1;

  const roundName =
    nextRoundNumber === 1
      ? 'Final'
      : nextRoundNumber === 2
        ? 'Semifinal'
        : nextRoundNumber === 3
          ? 'Quartas'
          : `Fase ${nextRoundNumber}`;

  const { data: nextRound } = await supabase
    .from('knockout_rounds')
    .insert({
      competition_id: competitionId,
      tenant_id: tenantId,
      round_number: nextRoundNumber,
      is_current: true,
      name: roundName,
    })
    .select()
    .single();

  if (!nextRound) return;

  /* 🆕 Criar jogos da próxima rodada */
  const inserts = [];

  for (let i = 0; i < winners.length; i += 2) {
    if (!winners[i + 1]) continue;

    inserts.push({
      competition_id: competitionId,
      tenant_id: tenantId,
      knockout_round_id: nextRound.id,
      team_home: winners[i],
      team_away: winners[i + 1],
      leg: 1,
      status: 'scheduled',
    });

    if (idaVolta) {
      inserts.push({
        competition_id: competitionId,
        tenant_id: tenantId,
        knockout_round_id: nextRound.id,
        team_home: winners[i + 1],
        team_away: winners[i],
        leg: 2,
        status: 'scheduled',
      });
    }
  }

  if (inserts.length) {
    await supabase.from('matches').insert(inserts);
  }
}
