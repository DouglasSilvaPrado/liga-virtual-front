'use client';

import { useMemo, useState } from 'react';
import ListPlayerMarketModal from './ListPlayerMarketModal';
import PlayerCard from '@/app/dashboard/components/Card/PlayerCard';
import EditSalaryModal from './EditSalaryModal';

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

  salary_per_round: number | null;
  end_round: number | null;
  buyout_amount: number | null;
};

type Props = {
  items: MyTeamPlayerCardItem[];
  championshipId: string | null;
};

function fmtBRL(n: number) {
  return `R$ ${n.toLocaleString('pt-BR')}`;
}

export default function MyPlayersGrid({ items, championshipId }: Props) {
  // ✅ Mercado
  const [openMarket, setOpenMarket] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MyTeamPlayerCardItem | null>(null);

  // ✅ Salário
  const [openSalary, setOpenSalary] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<MyTeamPlayerCardItem | null>(null);

  function openSalaryModal(p: MyTeamPlayerCardItem) {
    setSelectedSalary(p);
    setOpenSalary(true);
  }

  function closeSalaryModal() {
    setOpenSalary(false);
    setSelectedSalary(null);
  }

  function openMarketModal(p: MyTeamPlayerCardItem) {
    setSelectedMarket(p);
    setOpenMarket(true);
  }

  function closeMarketModal() {
    setOpenMarket(false);
    setSelectedMarket(null);
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ar = a.rating ?? -1;
      const br = b.rating ?? -1;
      if (br !== ar) return br - ar;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''));
    });
  }, [items]);

  return (
    <>
      <div className="grid grid-cols-3 gap-x-6 gap-y-10 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {sorted.map((p) => (
          <div key={p.player_id} className="w-[112px]">
            <PlayerCard
              player={{
                name: p.name,
                rating: p.rating,
                position: p.position,
                player_img: p.player_img,
                nation_img: p.nation_img,
                club_img: p.club_img,
              }}
            />

            {/* ✅ Linha de contrato (compacta) */}
            <div className="mt-2 text-[10px] leading-4 text-muted-foreground">
              <div>Fim: {p.end_round ? `R${p.end_round}` : '—'}</div>
              <div>Sal: {p.salary_per_round != null ? fmtBRL(p.salary_per_round) : '—'}</div>
              <div>Multa: {p.buyout_amount != null ? fmtBRL(p.buyout_amount) : '—'}</div>
            </div>

            {/* ✅ Editar salário */}
            <button
              type="button"
              onClick={() => openSalaryModal(p)}
              disabled={!championshipId}
              title={!championshipId ? 'Sem campeonato ativo' : 'Editar salário'}
              className={[
                'mt-2 w-[112px]',
                'cursor-pointer rounded-full border border-black/10',
                'bg-white/10 px-3 py-2',
                'text-[11px] font-extrabold tracking-tight text-black',
                'hover:bg-white/20 active:scale-[0.99]',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ].join(' ')}
            >
              Editar salário
            </button>

            {/* ✅ Mercado (opcional) */}
            <button
              type="button"
              onClick={() => openMarketModal(p)}
              disabled={!championshipId}
              title={!championshipId ? 'Sem campeonato ativo' : 'Listar no mercado'}
              className={[
                'mt-2 w-[112px]',
                'cursor-pointer rounded-full border border-black/10',
                'bg-white/10 px-3 py-2',
                'text-[11px] font-extrabold tracking-tight text-black',
                'hover:bg-white/20 active:scale-[0.99]',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ].join(' ')}
            >
              {p.listing_price != null ? 'Editar preço' : 'Listar no mercado'}
            </button>
          </div>
        ))}

        {sorted.length === 0 ? (
          <div className="col-span-full rounded-xl border bg-white p-4 text-sm text-muted-foreground">
            Nenhum jogador no seu time ainda.
          </div>
        ) : null}
      </div>

      <ListPlayerMarketModal
        open={openMarket}
        onClose={closeMarketModal}
        championshipId={championshipId}
        player={selectedMarket}
      />

      <EditSalaryModal
        open={openSalary}
        onClose={closeSalaryModal}
        championshipId={championshipId}
        player={selectedSalary}
      />
    </>
  );
}