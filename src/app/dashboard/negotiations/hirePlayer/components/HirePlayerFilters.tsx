import type { HireSearchParams } from '../page';

export default function HirePlayerFilters({ value }: { value: HireSearchParams }) {
  return (
    <form className="grid grid-cols-1 gap-4 md:grid-cols-6" method="get">
      <div className="md:col-span-2">
        <label className="text-sm font-medium">Buscar</label>
        <input
          name="q"
          defaultValue={value.q ?? ''}
          placeholder="Nome do jogador..."
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Posição</label>
        <select
          name="pos"
          defaultValue={value.pos ?? ''}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          {['GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Overall (mín)</label>
        <input
          name="min"
          type="number"
          defaultValue={value.min ?? '0'}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Overall (máx)</label>
        <input
          name="max"
          type="number"
          defaultValue={value.max ?? '99'}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Ordenar</label>
        <select
          name="sort"
          defaultValue={value.sort ?? 'rating'}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        >
          <option value="rating">Overall</option>
          <option value="name">Nome</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Direção</label>
        <select
          name="dir"
          defaultValue={value.dir ?? 'desc'}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>

      <div className="md:col-span-6 flex gap-2">
        <button className="rounded bg-black px-4 py-2 text-sm text-white">Filtrar</button>
        <a className="rounded border px-4 py-2 text-sm" href="?">
          Limpar
        </a>
      </div>
    </form>
  );
}
