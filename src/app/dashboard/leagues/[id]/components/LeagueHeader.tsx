import type { CompetitionWithSettings } from '@/@types/competition';

export default function LeagueHeader({
  league,
}: {
  league: CompetitionWithSettings & {
    status?: string;
    championships?: { name?: string } | null;
    champion_team?: { name?: string } | null;
  };
}) {
  const statusLabel = league.status === 'finished' ? 'Finalizada' : 'Ativa';

  return (
    <div className="rounded border bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>

          <p className="text-muted-foreground text-sm">
            Campeonato: {league.championships?.name ?? '—'}
          </p>

          <p className="text-sm">
            Tipo: <span className="font-medium">{league.type}</span>
          </p>

          <p className="text-sm">
            Campeão: <span className="font-medium">{league.champion_team?.name ?? '—'}</span>
          </p>
        </div>

        <div className="text-right text-sm">
          <div>
            Status: <span className="font-medium">{statusLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
