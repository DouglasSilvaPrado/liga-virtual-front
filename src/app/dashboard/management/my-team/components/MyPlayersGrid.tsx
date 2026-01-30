'use client';

import { useMemo, useState } from 'react';
import ListPlayerMarketModal from './ListPlayerMarketModal';

export type MyTeamPlayerCardItem = {
  player_id: number;
  id: number;
  name: string | null;
  rating: number | null;
  position: string | null;
  player_img: string | null;
  nation_img: string | null;
  club_img: string | null;
  listing_price: number | null;
};

type Props = {
  items: MyTeamPlayerCardItem[];
  championshipId: string | null;
};

function fmtMoneyBR(n: number) {
  return n.toLocaleString('pt-BR');
}

function badgePos(pos: string | null) {
  const p = (pos ?? '').toUpperCase().trim();
  if (!p) return '—';
  return p;
}

export default function MyPlayersGrid({ items, championshipId }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MyTeamPlayerCardItem | null>(null);

  const sorted = useMemo(() => {
    // ordena por rating desc, depois nome
    return [...items].sort((a, b) => {
      const ar = a.rating ?? -1;
      const br = b.rating ?? -1;
      if (br !== ar) return br - ar;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''));
    });
  }, [items]);

  function openModal(p: MyTeamPlayerCardItem) {
    setSelected(p);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setSelected(null);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {sorted.map((p) => (
          <div
            key={p.player_id}
            className="group relative overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            title={p.name ?? ''}
          >
            {/* topo "futbin-like" */}
            <div className="relative h-28 bg-gradient-to-b from-zinc-900 to-zinc-700">
              {/* rating + pos */}
              <div className="absolute top-2 left-2 rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white">
                {p.rating ?? '—'}
              </div>
              <div className="absolute top-9 left-2 rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white">
                {badgePos(p.position)}
              </div>

              {/* player img */}
              <div className="absolute inset-x-0 bottom-0 flex justify-center">
                {p.player_img ? (
                  <img
                    src={p.player_img}
                    alt=""
                    className="h-24 w-24 object-contain drop-shadow"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-20 w-20 rounded bg-white/10" />
                )}
              </div>

              {/* nation / club */}
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                {p.nation_img ? (
                  <img src={p.nation_img} alt="" className="h-4 w-6 object-contain" />
                ) : null}
                {p.club_img ? (
                  <img src={p.club_img} alt="" className="h-5 w-5 object-contain" />
                ) : null}
              </div>
            </div>

            {/* body */}
            <div className="space-y-2 p-3">
              <div className="min-h-[40px] text-sm leading-5 font-semibold">{p.name ?? '—'}</div>

              <div className="flex items-center justify-between text-xs">
                {p.listing_price != null ? (
                  <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                    À venda: R$ {fmtMoneyBR(p.listing_price)}
                  </span>
                ) : (
                  <span className="rounded bg-zinc-50 px-2 py-1 font-medium text-zinc-700">
                    Não listado
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => openModal(p)}
                className="w-full rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                disabled={!championshipId}
                title={!championshipId ? 'Sem campeonato ativo' : 'Listar no mercado'}
              >
                {p.listing_price != null ? 'Editar preço' : 'Listar no mercado'}
              </button>
            </div>
          </div>
        ))}

        {sorted.length === 0 ? (
          <div className="text-muted-foreground col-span-full rounded border bg-white p-4 text-sm">
            Nenhum jogador no seu time ainda.
          </div>
        ) : null}
      </div>

      <ListPlayerMarketModal
        open={open}
        onClose={closeModal}
        championshipId={championshipId}
        player={selected}
      />
    </>
  );
}
