'use client';

import { useState } from 'react';
import type { LoanListItem } from '../page';
import { counterLoanProposalAction } from '../serverActionsLoans';

type Props = {
  open: boolean;
  onClose: () => void;
  baseProposal: LoanListItem | null;
  walletBalance: number | null;
};

export default function CounterLoanProposalModal({
  open,
  onClose,
  baseProposal,
  walletBalance,
}: Props) {
  if (!open || !baseProposal) return null;

  // ✅ remount quando troca a proposta -> reseta state
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
  baseProposal: LoanListItem;
  walletBalance: number | null;
}) {
  const [money, setMoney] = useState<string>(String(baseProposal.money_amount ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Contra-proposta (Empréstimo)</h3>
          <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mb-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <b>Validade:</b> esta proposta é <b>por temporada</b>.
        </div>

        <div className="mb-3 text-sm text-muted-foreground">
          Seu saldo: {walletBalance == null ? '—' : `R$ ${walletBalance.toLocaleString('pt-BR')}`}
        </div>

        <div className="mb-4 rounded border p-3 text-sm">
          Jogador: <b>{baseProposal.player?.name ?? '—'}</b>
          <span className="text-muted-foreground"> • Temporada</span>
        </div>

        <form
          action={counterLoanProposalAction}
          onSubmit={() => {
            onClose();
          }}
          className="grid gap-3"
        >
          <input type="hidden" name="proposal_id" value={baseProposal.id} />

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Novo valor (R$)</span>
            <input
              className="rounded border px-3 py-2"
              name="money_amount"
              inputMode="numeric"
              value={money}
              onChange={(e) => setMoney(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Ex: 250000"
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
