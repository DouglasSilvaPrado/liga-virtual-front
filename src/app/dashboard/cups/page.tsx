import { createServerSupabase } from '@/lib/supabaseServer';
import CreateCupModal from './components/CreateCupModal';

export default async function CupPage() {
  const { supabase, tenantId } = await createServerSupabase();

  /* -------------------------------------------------- */
  /* 1️⃣ Busca competições que já possuem standings     */
  /* -------------------------------------------------- */
  const { data: standings } = await supabase
    .from('standings')
    .select('competition_id')
    .eq('tenant_id', tenantId);

  const competitionIds =
    standings?.map((s) => s.competition_id) ?? [];

  /* Se ainda não existe nenhuma copa iniciada */
  if (competitionIds.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Copas</h1>
        <p className="mt-4 text-muted-foreground">
          Nenhuma copa iniciou a fase de grupos ainda.
        </p>
      </div>
    );
  }

  /* -------------------------------------------------- */
  /* 2️⃣ Busca apenas as copas válidas                  */
  /* -------------------------------------------------- */
  const { data: cups } = await supabase
    .from('competitions_with_settings')
    .select(`
      id,
      name,
      type,
      created_at,
      championships (
        name
      )
    `)
    .eq('tenant_id', tenantId)
    .in('id', competitionIds)
    .in('type', ['mata_mata', 'copa_grupo_mata'])
    .order('created_at', { ascending: false });

  /* -------------------------------------------------- */
  /* 3️⃣ Render                                         */
  /* -------------------------------------------------- */
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Copas</h1>
        <CreateCupModal />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cups?.map((cup) => (
          <div
            key={cup.id}
            className="rounded-lg border bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{cup.name}</h2>

            <p className="text-sm text-muted-foreground">
              Campeonato: {cup.championships?.name ?? '—'}
            </p>

            <p className="mt-1 text-sm">
              Tipo:{' '}
              {cup.type === 'mata_mata'
                ? 'Mata-mata'
                : 'Grupos + Mata-mata'}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Criado em:{' '}
              {new Date(cup.created_at).toLocaleDateString('pt-BR')}
            </p>

            <div className="mt-4 flex gap-2">
              <a
                href={`/dashboard/cups/${cup.id}`}
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
