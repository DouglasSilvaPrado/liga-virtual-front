'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProposalListItem, MoneyDirection } from '../page';
import { counterProposalAction } from '../serverActions';

type Props = {
  open: boolean;
  onClose: () => void;
  baseProposal: ProposalListItem | null;
  walletBalance: number | null;
};

type MyPlayer = {
  player_id: number;
  name: string | null;
  rating: number | null;
  position: string | null;
  player_img: string | null;
};

function money(n: number) {
  return n.toLocaleString('pt-BR');
}

export default function CounterProposalModal({ open, onClose, baseProposal, walletBalance }: Props) {
  const [loading, setLoading] = useState(false);
  const [myPlayers, setMyPlayers] = useState<MyPlayer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<number | null>(null);

  // money
  const [moneyDirection, setMoneyDirection] = useState<MoneyDirection>('none');
  const [moneyAmount, setMoneyAmount] = useState<string>('0');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadMyPlayers() {
      setLoading(true);
      try {
        const res = await fetch('/api/me/team-players', { method: 'GET' });
        if (!res.ok) throw new Error('Erro ao carregar seus jogadores');
        const data = (await res.json()) as { players: MyPlayer[] };
        if (!cancelled) {
          const list = data.players ?? [];
          setMyPlayers(list);
          setSelectedOffer(list[0]?.player_id ?? null);
        }
      } catch {
        if (!cancelled) {
          setMyPlayers([]);
          setSelectedOffer(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMyPlayers();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const moneyAmountNum = useMemo(() => {
    // aceita digitar "50000" etc
    const n = Number(String(moneyAmount).replace(/[^\d]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [moneyAmount]);

  const canSubmit =
    !!baseProposal &&
    selectedOffer != null &&
    Number.isFinite(selectedOffer) &&
    (moneyDirection === 'none' || moneyAmountNum > 0);

  if (!open || !baseProposal) return null;

  const needsBalance =
    moneyDirection !== 'none' && moneyDirection === 'pay' && moneyAmountNum > 0;

  const insufficient =
    needsBalance && walletBalance != null && moneyAmountNum > walletBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">Contra-proposta</div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded border p-3 text-sm">
            <div className="font-semibold">Proposta original</div>
            <div className="mt-2 text-muted-foreground">
              Eles oferecem: <b>{baseProposal.offered_player?.name ?? '—'}</b> • Querem:{' '}
              <b>{baseProposal.requested_player?.name ?? '—'}</b>
            </div>
          </div>

          <div className="rounded border p-3">
            <div className="text-sm font-semibold">Escolha um jogador do seu time para oferecer</div>

            {loading ? (
              <div className="mt-2 text-sm text-muted-foreground">Carregando…</div>
            ) : myPlayers.length === 0 ? (
              <div className="mt-2 text-sm text-red-700">
                Você não tem jogadores no seu time para fazer contra-proposta.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {myPlayers.map((p) => (
                  <button
                    key={p.player_id}
                    type="button"
                    onClick={() => setSelectedOffer(p.player_id)}
                    className={`flex items-center gap-3 rounded border p-2 text-left hover:bg-gray-50 ${
                      selectedOffer === p.player_id ? 'bg-gray-100' : ''
                    }`}
                  >
                    {p.player_img ? <img src={p.player_img} className="h-10 w-10" alt="" /> : null}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.position ?? '—'} • {p.rating ?? '—'} • ID {p.player_id}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded border p-3">
            <div className="text-sm font-semibold">Dinheiro adicional</div>

            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
              <select
                className="rounded border px-3 py-2 text-sm"
                value={moneyDirection}
                onChange={(e) => setMoneyDirection(e.target.value as MoneyDirection)}
              >
                <option value="none">Sem dinheiro</option>
                <option value="pay">Eu pago para o outro time</option>
                <option value="ask">Eu peço dinheiro do outro time</option>
              </select>

              <input
                className="rounded border px-3 py-2 text-sm"
                value={moneyAmount}
                onChange={(e) => setMoneyAmount(e.target.value)}
                placeholder="Valor (ex: 50000)"
                disabled={moneyDirection === 'none'}
              />

              <div className="text-xs text-muted-foreground">
                Seu saldo: {walletBalance == null ? '—' : `R$ ${money(walletBalance)}`}
              </div>
            </div>

            {insufficient ? (
              <div className="mt-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">
                Saldo insuficiente para oferecer esse valor.
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>

          <form action={counterProposalAction} onSubmit={onClose}>
            <input type="hidden" name="base_proposal_id" value={baseProposal.id} />
            <input type="hidden" name="offered_player_id" value={String(selectedOffer ?? '')} />
            <input type="hidden" name="money_direction" value={moneyDirection} />
            <input
              type="hidden"
              name="money_amount"
              value={String(moneyDirection === 'none' ? 0 : moneyAmountNum)}
            />

            <button
              className="cursor-pointer rounded bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit || insufficient}
            >
              Enviar contra-proposta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
