import { createServerSupabase } from '@/lib/supabaseServer';

type Row = {
  id: string;
  round: number | null;
  score_home: number | null;
  score_away: number | null;
  status: string;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

export default async function LeagueMatches({ competitionId }: { competitionId: string }) {
  const { supabase, tenantId } = await createServerSupabase();

  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      id,
      round,
      score_home,
      score_away,
      status,
      home_team:teams!matches_team_home_fk ( name ),
      away_team:teams!matches_team_away_fk ( name )
    `,
    )
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId)
    .order('round', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return <div className="rounded border bg-white p-4">Erro ao carregar partidas</div>;

  const matches = (data ?? []) as unknown as Row[];

  return (
    <div className="rounded border bg-white p-4">
      <h2 className="text-lg font-semibold">Partidas</h2>

      {matches.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          Nenhuma partida criada ainda. (Próximo passo: botão “Gerar calendário”)
        </p>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          {matches.map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b py-1">
              <span className="text-muted-foreground w-10 text-xs">R{m.round ?? '-'}</span>
              <span className="flex-1">{m.home_team?.name ?? '—'}</span>
              <span className="mx-2 w-20 text-center">
                {m.score_home ?? '-'} x {m.score_away ?? '-'}
              </span>
              <span className="flex-1 text-right">{m.away_team?.name ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
