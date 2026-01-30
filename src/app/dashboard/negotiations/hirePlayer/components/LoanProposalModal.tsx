'use client';

import { useState } from 'react';
import { sendLoanProposalAction } from '../../proposals/serverActionsLoans';

type PlayerMini = {
  id: number;
  name: string | null;
  rating: number | null;
  position: string | null;
  player_img: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  player: PlayerMini | null;
  returnTo: string;
};

function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, '');
}

export default function LoanProposalModal({ open, onClose, player, returnTo }: Props) {
  if (!open || !player) return null;

  // ✅ remount quando muda player -> reseta state sem useEffect
  return <Inner key={player.id} onClose={onClose} player={player} returnTo={returnTo} />;
}

function Inner({
  onClose,
  player,
  returnTo,
}: {
  onClose: () => void;
  player: PlayerMini;
  returnTo: string;
}) {
  const [money, setMoney] = useState('0');

  const moneyNum = Number(onlyDigits(money || '0'));
  const canSubmit = Number.isFinite(moneyNum) && moneyNum > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Proposta de empréstimo</h3>
          <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mb-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <b>Validade:</b> esta proposta é <b>por temporada</b> (não por rodadas).
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
              {player.position ?? '—'} • Overall {player.rating ?? '—'} • ID {player.id}
            </div>
          </div>
        </div>

        <form
          action={sendLoanProposalAction}
          onSubmit={() => {
            // fecha na hora (o server action vai redirecionar/revalidar)
            onClose();
          }}
          className="grid gap-3"
        >
          <input type="hidden" name="player_id" value={String(player.id)} />
          <input type="hidden" name="return_to" value={returnTo} />

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Valor da proposta (R$)</span>
            <input
              className="rounded border px-3 py-2"
              name="money_amount"
              inputMode="numeric"
              value={money}
              onChange={(e) => setMoney(onlyDigits(e.target.value))}
              placeholder="Ex: 250000"
            />
            <span className="text-muted-foreground text-xs">
              {moneyNum > 0 ? `R$ ${moneyNum.toLocaleString('pt-BR')}` : 'Informe um valor > 0'}
            </span>
          </label>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              title={!canSubmit ? 'Informe um valor válido' : 'Enviar proposta'}
            >
              Enviar proposta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
