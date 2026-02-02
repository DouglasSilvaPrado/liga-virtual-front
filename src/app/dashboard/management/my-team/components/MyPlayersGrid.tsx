'use client';

import { useMemo, useState } from 'react';
import ListPlayerMarketModal from './ListPlayerMarketModal';
import PlayerCard from '@/app/dashboard/components/Card/PlayerCard';

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

export default function MyPlayersGrid({ items, championshipId }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MyTeamPlayerCardItem | null>(null);

  const sorted = useMemo(() => {
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
      {/* Futbin tiny: ~102px largura. Vamos usar 112px (fica melhor no grid) */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-10 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {sorted.map((p) => {
          return (
            <div key={p.player_id} className="w-[112px]">
              {/* CARD */}
               <PlayerCard
                player={{
                  name: p.name,
                  rating: p.rating,
                  position: p.position,
                  player_img: p.player_img,
                  nation_img: p.nation_img,
                  club_img: p.club_img,
                }} />

              {/* Botão fora do card (igual seu layout) */}
              <button
                type="button"
                onClick={() => openModal(p)}
                disabled={!championshipId}
                title={!championshipId ? 'Sem campeonato ativo' : 'Listar no mercado'}
                className={[
                  'mt-3 w-[112px]',
                  'rounded-full border border-black/10',
                  'bg-white/10 px-3 py-2',
                  'text-[11px] font-extrabold tracking-tight text-black',
                  'hover:bg-white/20 active:scale-[0.99]',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  'cursor-pointer'
                ].join(' ')}
              >
                {p.listing_price != null ? 'Editar preço' : 'Listar no mercado'}
              </button>
            </div>
          );
        })}

        {sorted.length === 0 ? (
          <div className="col-span-full rounded-xl border bg-white p-4 text-sm text-muted-foreground">
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
