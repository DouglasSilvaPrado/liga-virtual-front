'use client';

import { useMemo, useState } from 'react';
import { createTradeProposalAction } from '../tradeActions';

export type MyTeamPlayerRow = {
  player_id: number;
  name: string | null;
  rating: number | null;
  position: string | null;
  player_img: string | null;
};

export type TradeTarget = {
  player_id: number;
  name: string | null;
  rating: number | null;
  position: string | null;
  player_img: string | null;
  current_team_name: string | null;
  current_team_shield: string | null;
  current_team_id: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;

  returnTo: string;
  walletBalance: number | null;

  target: TradeTarget | null;
  myPlayers: MyTeamPlayerRow[];

  // pra evitar abrir troca quando falta contexto
  myTeamId: string | null;
  activeChampionshipId: string | null;
};

function safeInt(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function money(n: number) {
  return n.toLocaleString('pt-BR');
}

export default function TradePlayerModal({
  open,
  onClose,
  returnTo,
  walletBalance,
  target,
  myPlayers,
  myTeamId,
  activeChampionshipId,
}: Props) {
  const [offeredId, setOfferedId] = useState<number | null>(null);
  const [mode, setMode] = useState<'none' | 'pay' | 'ask'>('none');
  const [amountText, setAmountText] = useState('0');

  const amount = useMemo(() => safeInt(amountText), [amountText]);
  const hasWallet = walletBalance != null;
  const canPay = hasWallet && (walletBalance ?? 0) >= amount;

  const isReady =
    !!target?.player_id &&
    !!target?.current_team_id &&
    !!myTeamId &&
    !!activeChampionshipId &&
    offeredId != null &&
    (mode === 'none' ? true : amount > 0) &&
    (mode === 'pay' ? canPay : true);

  if (!open || !target) return null;

  const disabledReason = !myTeamId || !activeChampionshipId
    ? 'Sem time/campeonato ativo.'
    : offeredId == null
    ? 'Selecione um jogador seu para oferecer.'
    : mode !== 'none' && amount <= 0
    ? 'Informe um valor maior que zero.'
    : mode === 'pay' && !canPay
    ? 'Saldo insuficiente para pagar o valor adicional.'
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">Propor Troca</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-4 space-y-4">
          {/* Alvo */}
          <div className="rounded-lg border p-4">
            <div className="text-sm font-semibold mb-2">Jogador alvo</div>
            <div className="flex items-center gap-3">
              {target.player_img ? <img src={target.player_img} alt="" className="h-12 w-12" /> : null}
              <div className="min-w-0">
                <div className="font-medium truncate">{target.name ?? '—'}</div>
                <div className="text-xs text-muted-foreground">
                  {target.position ?? '—'} • Overall {target.rating ?? '—'} • ID {target.player_id}
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {target.current_team_shield ? (
                    <img src={target.current_team_shield} alt="" className="h-4 w-4 object-contain" />
                  ) : null}
                  <span>Time atual: {target.current_team_name ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seus jogadores */}
          <div className="rounded-lg border p-4">
            <div className="text-sm font-semibold mb-2">Seu jogador (oferta)</div>

            {myPlayers.length === 0 ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                Você não tem jogadores no seu time para oferecer.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {myPlayers.map((p) => (
                  <button
                    key={p.player_id}
                    type="button"
                    onClick={() => setOfferedId(p.player_id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-gray-50 ${
                      offeredId === p.player_id ? 'border-black' : ''
                    }`}
                  >
                    {p.player_img ? <img src={p.player_img} alt="" className="h-10 w-10" /> : null}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.position ?? '—'} • Overall {p.rating ?? '—'} • ID {p.player_id}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de proposta */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="text-sm font-semibold">Tipo de proposta</div>

            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'none'}
                  onChange={() => setMode('none')}
                />
                Somente troca
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'pay'}
                  onChange={() => setMode('pay')}
                />
                Troca + eu pago um valor adicional
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'ask'}
                  onChange={() => setMode('ask')}
                />
                Troca + eu peço um valor adicional
              </label>
            </div>

            {mode !== 'none' ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Valor adicional (R$)</div>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={amountText}
                    onChange={(e) => setAmountText(e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className="rounded border bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Seu saldo</span>
                    <span className="font-medium">{hasWallet ? `R$ ${money(walletBalance ?? 0)}` : '—'}</span>
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    {mode === 'pay'
                      ? 'Se a proposta for aceita, esse valor será debitado de você.'
                      : 'Se a proposta for aceita, esse valor será debitado do outro time.'}
                  </div>
                </div>
              </div>
            ) : null}

            {disabledReason ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {disabledReason}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>

          <form
            action={createTradeProposalAction}
            onSubmit={() => {
              onClose();
            }}
          >
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="requested_player_id" value={String(target.player_id)} />
            <input type="hidden" name="offered_player_id" value={String(offeredId ?? '')} />
            <input type="hidden" name="money_direction" value={mode} />
            <input type="hidden" name="money_amount" value={String(mode === 'none' ? 0 : amount)} />

            <button
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isReady}
            >
              Enviar proposta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
