import { createServerSupabase } from '@/lib/supabaseServer';
import HirePlayerFilters from './components/HirePlayerFilters';
import PlayersTable from './components/PlayersTable';

export type HireSearchParams = {
  q?: string;
  pos?: string;
  min?: string;
  max?: string;
  page?: string;
  size?: string;
  sort?: 'rating' | 'name';
  dir?: 'asc' | 'desc';
};

export interface PlayerRow {
  id: number;
  name: string | null;
  rating: number | null;
  position: string | null;
  price: string | null;
  nation_img: string | null;
  club_img: string | null;
}

function safeInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function buildQueryString(
  sp: HireSearchParams,
  override: Partial<HireSearchParams> = {},
) {
  const params = new URLSearchParams();

  const merged: HireSearchParams = { ...sp, ...override };

  (Object.keys(merged) as (keyof HireSearchParams)[]).forEach((key) => {
    const value = merged[key];
    if (value == null || value === '') return;
    params.set(String(key), String(value));
  });

  return params.toString();
}


export default async function HirePlayerPage({
  searchParams,
}: {
  searchParams: Promise<HireSearchParams>;
}) {
  const sp = await searchParams;

  const q = (sp.q ?? '').trim();
  const pos = (sp.pos ?? '').trim();
  const min = safeInt(sp.min, 0);
  const max = safeInt(sp.max, 99);

  const page = Math.max(1, safeInt(sp.page, 1));
  const size = Math.min(50, Math.max(10, safeInt(sp.size, 20)));

  const sort = sp.sort ?? 'rating';
  const dir = sp.dir ?? 'desc';

  const from = (page - 1) * size;
  const to = from + size - 1;

  const { supabase, tenantId } = await createServerSupabase();

  let query = supabase
    .from('players')
    .select('id,name,rating,position,price,nation_img,club_img', { count: 'exact' });

  // filtros
  if (q) query = query.ilike('name', `%${q}%`);
  if (pos) query = query.eq('position', pos);
  if (Number.isFinite(min)) query = query.gte('rating', min);
  if (Number.isFinite(max)) query = query.lte('rating', max);

  // ordenação
  if (sort === 'name') {
    query = query.order('name', { ascending: dir === 'asc', nullsFirst: true });
  } else {
    query = query.order('rating', { ascending: dir === 'asc', nullsFirst: false });
  }

  // paginação
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return <div className="p-6">Erro ao carregar jogadores</div>;
  }

  const players = (data ?? []) as PlayerRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contratar Jogadores</h1>
        <div className="text-sm text-muted-foreground">
          Tenant: <span className="font-mono">{tenantId}</span>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <HirePlayerFilters />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {total} jogador(es) • página {page} de {totalPages}
        </div>

        <div className="flex gap-2">
         <a
          className={`rounded border px-3 py-1 ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
          href={`?${buildQueryString(sp, { page: String(page - 1) })}`}
        >
          Anterior
        </a>

        <a
          className={`rounded border px-3 py-1 ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
          href={`?${buildQueryString(sp, { page: String(page + 1) })}`}
        >
          Próxima
        </a>

        </div>
      </div>

      <PlayersTable players={players} />
    </div>
  );
}
