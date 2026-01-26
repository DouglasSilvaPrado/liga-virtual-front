import type { PlayerRow } from '../page';

export default function PlayersTable({
  players,
  hireAction,
  returnTo,
}: {
  players: PlayerRow[];
  hireAction: (formData: FormData) => Promise<void>;
  returnTo: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            {['Jogador', 'Overall', 'Nacionalidade', 'Posição', 'Time', 'Valor', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {players.map((p) => (
            <tr key={p.id} className="border-b last:border-b-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {p.player_img ? <img src={p.player_img} alt="" className="h-6 w-6" /> : null}
                  <div>
                    <div className="font-medium">{p.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">ID: {p.id}</div>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3">{p.rating ?? '—'}</td>

              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {p.nation_img ? <img src={p.nation_img} alt="" className="h-4 w-6 object-contain" /> : null}
                  <span className="text-muted-foreground">{p.nation_img ? '' : '—'}</span>
                </div>
              </td>

              <td className="px-4 py-3">{p.position ?? '—'}</td>

              <td className="px-4 py-3 text-muted-foreground">
                {p.club_img ? <img src={p.club_img} alt="" className="h-6 w-6" /> : '—'}
              </td>

              <td className="px-4 py-3">{p.price ?? '—'}</td>

              <td className="px-4 py-3 text-right">
                <form action={hireAction}>
                  <input type="hidden" name="player_id" value={String(p.id)} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button className="rounded border px-3 py-1 text-sm">Contratar</button>
                </form>
              </td>
            </tr>
          ))}

          {players.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                Nenhum jogador encontrado.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
