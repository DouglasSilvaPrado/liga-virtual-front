import { createServerSupabase } from '@/lib/supabaseServer';

type Row = {
  team: { id: string; name: string } | null;
};

export default async function LeagueTeams({ competitionId }: { competitionId: string }) {
  const { supabase, tenantId } = await createServerSupabase();

  const { data, error } = await supabase
    .from('competition_teams')
    .select(
      `
      team:teams!competition_teams_team_id_fkey (
        id,
        name
      )
    `,
    )
    .eq('competition_id', competitionId)
    .eq('tenant_id', tenantId);

  if (error) return <div className="rounded border bg-white p-4">Erro ao carregar times</div>;

  const teams = (data ?? []) as unknown as Row[];

  return (
    <div className="rounded border bg-white p-4">
      <h2 className="text-lg font-semibold">Times</h2>

      {teams.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhum time cadastrado.</p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {teams.map((t, idx) => (
            <li key={`${t.team?.id ?? idx}`} className="flex justify-between border-b py-1">
              <span>{t.team?.name ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
