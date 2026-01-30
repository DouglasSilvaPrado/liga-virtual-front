'use client';

import { useState } from 'react';
import type { AnyProposalListItem } from '../page';
import { counterProposalAction } from '../serverActions';

type TradeItem = Extract<AnyProposalListItem, { kind: 'trade' }>;

type Props = {
  open: boolean;
  onClose: () => void;
  baseProposal: TradeItem | null;
  walletBalance: number | null;
};

export default function CounterProposalModal({
  open,
  onClose,
  baseProposal,
  walletBalance,
}: Props) {
  if (!open || !baseProposal) return null;

  // ✅ remount quando muda proposta -> reseta state
  return (
    <Inner
      key={baseProposal.id}
      onClose={onClose}
      baseProposal={baseProposal}
      walletBalance={walletBalance}
    />
  );
}

function Inner({
  onClose,
  baseProposal,
  walletBalance,
}: {
  onClose: () => void;
  baseProposal: TradeItem;
  walletBalance: number | null;
}) {
  const [offeredPlayerId, setOfferedPlayerId] = useState<string>(
    String(baseProposal.requested_player_id ?? ''),
  );
  const [moneyDirection, setMoneyDirection] = useState<'none' | 'pay' | 'ask'>(
    baseProposal.money_direction ?? 'none',
  );
  const [moneyAmount, setMoneyAmount] = useState<string>(String(baseProposal.money_amount ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Contra-proposta (Troca)</h3>
          <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="text-muted-foreground mb-3 text-sm">
          Seu saldo: {walletBalance == null ? '—' : `R$ ${walletBalance.toLocaleString('pt-BR')}`}
        </div>

        <div className="mb-4 rounded border p-3 text-sm">
          Base: <b>{baseProposal.offered_player?.name ?? '—'}</b> por{' '}
          <b>{baseProposal.requested_player?.name ?? '—'}</b>
        </div>

        <form action={counterProposalAction} className="grid gap-3">
          <input type="hidden" name="base_proposal_id" value={baseProposal.id} />

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">ID do jogador oferecido (seu)</span>
            <input
              className="rounded border px-3 py-2"
              name="offered_player_id"
              inputMode="numeric"
              value={offeredPlayerId}
              onChange={(e) => setOfferedPlayerId(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Ex: 123"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Dinheiro</span>
            <select
              className="rounded border px-3 py-2"
              name="money_direction"
              value={moneyDirection}
              onChange={(e) => setMoneyDirection(e.target.value as 'none' | 'pay' | 'ask')}
            >
              <option value="none">Sem dinheiro</option>
              <option value="pay">Você paga</option>
              <option value="ask">Você recebe</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Valor (R$)</span>
            <input
              className="rounded border px-3 py-2"
              name="money_amount"
              inputMode="numeric"
              value={moneyAmount}
              onChange={(e) => setMoneyAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Ex: 100000"
            />
          </label>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button className="rounded bg-black px-3 py-2 text-sm text-white">
              Enviar contra-proposta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
