'use client';

import { useState } from 'react';
import type { MyTeamPlayerCardItem } from './MyPlayersGrid';
import { listPlayerOnMarketAction, unlistPlayerFromMarketAction } from '../serverActionsMarket';

type Props = {
  open: boolean;
  onClose: () => void;
  championshipId: string | null;
  player: MyTeamPlayerCardItem | null;
};

function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, '');
}

export default function ListPlayerMarketModal({ open, onClose, championshipId, player }: Props) {
  if (!open || !player || !championshipId) return null;

  return (
    <Inner
      key={player.player_id}
      onClose={onClose}
      championshipId={championshipId}
      player={player}
    />
  );
}

function Inner({
  onClose,
  championshipId,
  player,
}: {
  onClose: () => void;
  championshipId: string;
  player: MyTeamPlayerCardItem;
}) {
  const [price, setPrice] = useState<string>(String(player.listing_price ?? ''));

  const priceNum = Number(onlyDigits(price || '0'));
  const canSubmit = Number.isFinite(priceNum) && priceNum > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Listar jogador no mercado</h3>
          <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded border p-3">
          {player.player_img ? (
            <img src={player.player_img} alt="" className="h-10 w-10" />
          ) : (
            <div className="h-10 w-10 rounded bg-gray-200" />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium">{player.name ?? '—'}</div>
            <div className="text-muted-foreground text-xs">
              {player.position ?? '—'} • Overall {player.rating ?? '—'} • ID {player.player_id}
            </div>
          </div>
        </div>

        {/* ✅ 1 form só */}
        <form action={listPlayerOnMarketAction} onSubmit={() => onClose()} className="grid gap-3">
          <input type="hidden" name="championship_id" value={championshipId} />
          <input type="hidden" name="player_id" value={String(player.player_id)} />

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Preço de venda (R$)</span>
            <input
              className="rounded border px-3 py-2"
              name="price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(onlyDigits(e.target.value))}
              placeholder="Ex: 250000"
            />
            <span className="text-muted-foreground text-xs">
              {priceNum > 0 ? `R$ ${priceNum.toLocaleString('pt-BR')}` : 'Informe um valor > 0'}
            </span>
          </label>

          <div className="mt-2 flex items-center justify-between gap-2">
            {/* ✅ Remover do mercado via formAction (sem form aninhado) */}
            {player.listing_price != null ? (
              <button
                type="submit"
                formAction={unlistPlayerFromMarketAction}
                onClick={() => onClose()}
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Remover do mercado
              </button>
            ) : (
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={onClose}
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              title={!canSubmit ? 'Informe um valor válido' : 'Salvar listagem'}
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
