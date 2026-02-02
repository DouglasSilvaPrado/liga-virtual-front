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
  return p || '—';
}

type Tier = 'gold' | 'silver' | 'bronze';

function getTier(rating: number | null): Tier {
  const r = typeof rating === 'number' ? rating : 0;
  if (r >= 75) return 'gold';
  if (r >= 65) return 'silver';
  return 'bronze';
}

function tierAsset(tier: Tier) {
  if (tier === 'gold') return '/image/goldCard.png';
  if (tier === 'silver') return '/image/silverCard.png';
  return '/image/bronzeCard.png';
}

function tierColors(tier: Tier) {
  // pill (badge) + sombra levinha, estilo futbin
  switch (tier) {
    case 'gold':
      return {
        badgeBg: 'bg-[#6a4a2a]/70',
        badgeText: 'text-[#fff3df]',
        shadow: 'shadow-[0_10px_18px_-14px_rgba(0,0,0,0.55)]',
      };
    case 'silver':
      return {
        badgeBg: 'bg-[#3a3a3a]/65',
        badgeText: 'text-white',
        shadow: 'shadow-[0_10px_18px_-14px_rgba(0,0,0,0.55)]',
      };
    case 'bronze':
    default:
      return {
        badgeBg: 'bg-[#5a2b12]/65',
        badgeText: 'text-[#fff1e8]',
        shadow: 'shadow-[0_10px_18px_-14px_rgba(0,0,0,0.55)]',
      };
  }
}

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
          const tier = getTier(p.rating);
          const bg = tierAsset(tier);
          const c = tierColors(tier);

          const ratingText = p.rating ?? '—';
          const posText = badgePos(p.position);

          // Futbin tiny usa nome curto/compacto
          const name = (p.name ?? '—').trim();
          const shortName = name.length > 14 ? name.slice(0, 13) + '…' : name;

          return (
            <div key={p.player_id} className="w-[112px]">
              {/* CARD */}
              <div
                className={[
                  'relative h-[160px] w-[112px]',
                  'select-none',
                  c.shadow,
                ].join(' ')}
                style={{
                  backgroundImage: `url(${bg})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                }}
                title={name}
              >
                {/* rating + pos (coluna esquerda) */}
                <div className="absolute left-[17%] top-[25%] leading-none">
                  <div className="text-sm font-bold text-gray-700">
                    {ratingText}
                  </div>
                  <div className="text-[11px] font-black tracking-tight text-gray-700">
                    {posText}
                  </div>
                </div>

                {/* nation + club (topo direito bem pequeno) */}
                <div className="absolute right-[17%] top-[25%] flex flex-col items-end gap-[4px]">
                  {p.nation_img ? (
                    <img
                      src={p.nation_img}
                      alt=""
                      className="h-[14px] w-[14px] object-contain"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  {p.club_img ? (
                    <img
                      src={p.club_img}
                      alt=""
                      className="h-[14px] w-[14px] object-contain"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                </div>

                {/* player image (centro, maior e mais baixo) */}
                <div className="absolute left-1/2 top-[34px] -translate-x-1/2">
                  {p.player_img ? (
                    <img
                      src={p.player_img}
                      alt=""
                      className="h-[78px] w-[78px] object-contain"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-[78px] w-[78px] rounded bg-black/10" />
                  )}
                </div>

                {/* nome (dentro do card) */}
                <div className="absolute bottom-[40px] left-[10px] right-[10px] text-center">
                  <div className="truncate text-[11px] font-black tracking-tight text-gray-700">
                    {shortName}
                  </div>
                </div>
              </div>

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
