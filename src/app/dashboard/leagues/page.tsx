import { createServerSupabase } from '@/lib/supabaseServer';
import CreateLeagueModal from './components/CreateLeagueModal';

export interface League {
  id: string;
  name: string;
  type: 'divisao' | 'divisao_mata';
  created_at: string;
  championships: { name: string } | null;
}

export default async function LeaguePage() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data, error } = await supabase
    .from('competitions_with_settings')
    .select(
      `
      id,
      name,
      type,
      created_at,
      championships ( name )
    `,
    )
    .eq('tenant_id', tenantId)
    .in('type', ['divisao', 'divisao_mata'])
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="p-6">Erro ao carregar ligas</div>;
  }

  const leagues = (data ?? []) as unknown as League[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ligas</h1>
        <CreateLeagueModal />
      </div>

      {leagues.length === 0 && (
        <div className="rounded border bg-muted p-4 text-sm text-muted-foreground">
          Nenhuma liga cadastrada ainda (tipo divisao/divisao_mata).
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {leagues.map((l) => (
          <div key={l.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">{l.name}</h2>

            <p className="text-sm text-muted-foreground">
              Campeonato: {l.championships?.name ?? '—'}
            </p>

            <p className="mt-1 text-sm">Tipo: {l.type}</p>

            <p className="mt-1 text-xs text-muted-foreground">
              Criado em: {new Date(l.created_at).toLocaleDateString('pt-BR')}
            </p>

            <div className="mt-4 flex gap-2">
              <a
                href={`/dashboard/leagues/${l.id}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Ver detalhes
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
