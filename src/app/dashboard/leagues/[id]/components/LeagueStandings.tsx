import { createServerSupabase } from '@/lib/supabaseServer';
import type { CompetitionSettingsData } from '@/@types/competition';

type StandingRow = {
  id: string;
  team_id: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_against: number;
  goal_diff: number;
  teams: { name: string } | null;
};

function safeInt(v: unknown, fallback = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export default async function LeagueStandings({
  competitionId,
  settings,
}: {
  competitionId: string;
  settings: CompetitionSettingsData;
}) {
  const { supabase, tenantId } = await createServerSupabase();

  const specific = (settings.specific ?? {}) as Record<string, unknown>;
  const qtdAcessos = safeInt(specific.qtd_acessos, 0);
  const qtdRebaixados = safeInt(specific.qtd_rebaixados, 0);

  const { data, error } = await supabase
    .from('standings')
    .select(
      `
      id,
      team_id,
      points,
      wins,
      draws,
      losses,
      goals_scored,
      goals_against,
      goal_diff,
      teams ( name )
    `,
    )
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('points', { ascending: false })
    .order('goal_diff', { ascending: false })
    .order('goals_scored', { ascending: false });

  if (error) return <div className="rounded border bg-white p-4">Erro ao carregar tabela</div>;

  const rows = (data ?? []) as unknown as StandingRow[];

  const accessCut = qtdAcessos > 0 ? qtdAcessos : 0;
  const relegationCut = qtdRebaixados > 0 ? rows.length - qtdRebaixados : rows.length + 1;

  return (
    <div className="rounded border bg-white p-4">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-semibold">Classificação</h2>

        <div className="text-xs text-muted-foreground">
          {qtdAcessos > 0 && <span className="mr-3">⬆️ Acesso: top {qtdAcessos}</span>}
          {qtdRebaixados > 0 && <span>⬇️ Rebaixamento: últimos {qtdRebaixados}</span>}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Sem classificação ainda.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="w-10">#</th>
              <th>Time</th>
              <th className="w-12">P</th>
              <th className="w-12">V</th>
              <th className="w-12">E</th>
              <th className="w-12">D</th>
              <th className="w-12">SG</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const pos = idx + 1;

              const isAccess = accessCut > 0 && pos <= accessCut;
              const isRelegation = qtdRebaixados > 0 && pos > relegationCut;

              return (
                <tr
                  key={r.id}
                  className={[
                    'border-t',
                    isAccess ? 'bg-green-50' : '',
                    isRelegation ? 'bg-red-50' : '',
                  ].join(' ')}
                >
                  <td className="py-1">{pos}</td>
                  <td className="py-1">{r.teams?.name ?? '—'}</td>
                  <td className="py-1 font-medium">{r.points}</td>
                  <td className="py-1">{r.wins}</td>
                  <td className="py-1">{r.draws}</td>
                  <td className="py-1">{r.losses}</td>
                  <td className="py-1">{r.goal_diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
