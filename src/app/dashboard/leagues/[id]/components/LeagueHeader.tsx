import type { CompetitionWithSettings } from '@/@types/competition';

export default function LeagueHeader({
  league,
}: {
  league: CompetitionWithSettings & { status?: string; championships?: { name?: string } | null };
}) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="text-sm text-muted-foreground">
            Campeonato: {league.championships?.name ?? '—'}
          </p>
          <p className="text-sm">
            Tipo: <span className="font-medium">{league.type}</span>
          </p>
        </div>

        <div className="text-right text-sm">
          <div>
            Status:{' '}
            <span className="font-medium">
              {league.status === 'finished' ? 'Finalizada' : 'Ativa'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
