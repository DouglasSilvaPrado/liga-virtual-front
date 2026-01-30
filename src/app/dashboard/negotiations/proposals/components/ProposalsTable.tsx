'use client';

import { useMemo, useState } from 'react';
import type { AnyProposalListItem, LoanListItem } from '../page';
import { acceptProposalAction, rejectProposalAction } from '../serverActions';
import {
  acceptLoanProposalAction,
  rejectLoanProposalAction,
} from '../serverActionsLoans';
import CounterProposalModal from './CounterProposalModal';
import CounterLoanProposalModal from './CounterLoanProposalModal';

type Props = {
  proposals: AnyProposalListItem[];
  myTeamId: string;
  walletBalance: number | null;
};

function money(n: number) {
  return n.toLocaleString('pt-BR');
}

function moneyTextTrade(p: Extract<AnyProposalListItem, { kind: 'trade' }>, myTeamId: string) {
  const amount = Math.max(0, p.money_amount ?? 0);
  const dir = p.money_direction ?? 'none';

  if (dir === 'none' || amount <= 0) return 'Sem dinheiro envolvido';

  const myIsFrom = p.from_team_id === myTeamId;
  const myIsTo = p.to_team_id === myTeamId;

  // pay => FROM paga TO
  if (dir === 'pay') {
    if (myIsFrom) return `Você paga R$ ${money(amount)}`;
    if (myIsTo) return `Você recebe +R$ ${money(amount)}`;
    return `FROM paga TO: R$ ${money(amount)}`;
  }

  // ask => TO paga FROM
  if (dir === 'ask') {
    if (myIsTo) return `Você paga R$ ${money(amount)}`;
    if (myIsFrom) return `Você recebe +R$ ${money(amount)}`;
    return `TO paga FROM: R$ ${money(amount)}`;
  }

  return 'Sem dinheiro envolvido';
}

function moneyTextLoan(p: Extract<AnyProposalListItem, { kind: 'loan' }>, myTeamId: string) {
  const amount = Math.max(0, p.money_amount ?? 0);
  if (amount <= 0) return 'Sem dinheiro envolvido';

  const isReceived = p.to_team_id === myTeamId; // dono recebeu
  if (isReceived) return `Você recebe +R$ ${money(amount)}`;
  return `Você paga R$ ${money(amount)}`;
}

function badge(status: AnyProposalListItem['status']) {
  const base = 'inline-flex rounded border px-2 py-0.5 text-xs font-medium';
  switch (status) {
    case 'pending':
      return `${base} border-yellow-300 bg-yellow-50 text-yellow-800`;
    case 'accepted':
      return `${base} border-green-300 bg-green-50 text-green-700`;
    case 'rejected':
      return `${base} border-red-300 bg-red-50 text-red-700`;
    case 'countered':
      return `${base} border-blue-300 bg-blue-50 text-blue-700`;
    case 'cancelled':
      return `${base} border-gray-300 bg-gray-50 text-gray-700`;
    default:
      return `${base} border-gray-300 bg-gray-50 text-gray-700`;
  }
}

export default function ProposalsTable({ proposals, myTeamId, walletBalance }: Props) {
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  // ✅ Modal counter do TRADE (mantém)
  const [openCounter, setOpenCounter] = useState(false);
  const [counterBase, setCounterBase] = useState<Extract<AnyProposalListItem, { kind: 'trade' }> | null>(
    null,
  );

  function openCounterModal(p: Extract<AnyProposalListItem, { kind: 'trade' }>) {
    setCounterBase(p);
    setOpenCounter(true);
  }

  function closeCounterModal() {
    setOpenCounter(false);
    setCounterBase(null);
  }

  // ✅ Modal counter do LOAN (novo)
  const [openLoanCounter, setOpenLoanCounter] = useState(false);
  const [loanCounterBase, setLoanCounterBase] = useState<LoanListItem | null>(null);

  function openLoanCounterModal(p: LoanListItem) {
    setLoanCounterBase(p);
    setOpenLoanCounter(true);
  }

  function closeLoanCounterModal() {
    setOpenLoanCounter(false);
    setLoanCounterBase(null);
  }

  const filtered = useMemo(() => {
    return proposals.filter((p) =>
      tab === 'received' ? p.to_team_id === myTeamId : p.from_team_id === myTeamId,
    );
  }, [proposals, tab, myTeamId]);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          className={`rounded border px-3 py-1 text-sm ${tab === 'received' ? 'bg-gray-100' : ''}`}
          onClick={() => setTab('received')}
        >
          Recebidas
        </button>
        <button
          className={`rounded border px-3 py-1 text-sm ${tab === 'sent' ? 'bg-gray-100' : ''}`}
          onClick={() => setTab('sent')}
        >
          Enviadas
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              {['Tipo', 'Status', 'De', 'Para', 'Detalhe', 'Dinheiro', 'Criada em', 'Ações'].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => {
              const isReceived = p.to_team_id === myTeamId;
              const canAct = isReceived && p.status === 'pending';

              return (
                <tr key={`${p.kind}-${p.id}`} className="border-b last:border-b-0">
                  {/* Tipo */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {p.kind === 'trade' ? 'Troca' : 'Empréstimo'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={badge(p.status)}>{p.status}</span>
                  </td>

                  {/* De */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.pay?.shield_url ? (
                        <img src={p.pay.shield_url} className="h-5 w-5 object-contain" alt="" />
                      ) : (
                        <div className="h-5 w-5 rounded bg-gray-200" />
                      )}
                      <span className="text-muted-foreground">{p.pay?.name ?? '—'}</span>
                    </div>
                  </td>

                  {/* Para */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.ask?.shield_url ? (
                        <img src={p.ask.shield_url} className="h-5 w-5 object-contain" alt="" />
                      ) : (
                        <div className="h-5 w-5 rounded bg-gray-200" />
                      )}
                      <span className="text-muted-foreground">{p.ask?.name ?? '—'}</span>
                    </div>
                  </td>

                  {/* Detalhe */}
                  <td className="px-4 py-3">
                    {p.kind === 'trade' ? (
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2">
                          {p.offered_player?.player_img ? (
                            <img src={p.offered_player.player_img} className="h-6 w-6" alt="" />
                          ) : null}
                          <span>
                            <b>{p.offered_player?.name ?? '—'}</b>{' '}
                            <span className="text-muted-foreground">
                              ({p.offered_player?.position ?? '—'} • {p.offered_player?.rating ?? '—'}
                              )
                            </span>
                          </span>
                        </div>

                        <div className="text-muted-foreground text-xs">por</div>

                        <div className="flex items-center gap-2">
                          {p.requested_player?.player_img ? (
                            <img src={p.requested_player.player_img} className="h-6 w-6" alt="" />
                          ) : null}
                          <span>
                            <b>{p.requested_player?.name ?? '—'}</b>{' '}
                            <span className="text-muted-foreground">
                              ({p.requested_player?.position ?? '—'} •{' '}
                              {p.requested_player?.rating ?? '—'})
                            </span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {p.player?.player_img ? (
                          <img src={p.player.player_img} className="h-6 w-6" alt="" />
                        ) : null}
                        <span>
                          <b>{p.player?.name ?? '—'}</b>{' '}
                          <span className="text-muted-foreground">
                            ({p.player?.position ?? '—'} • {p.player?.rating ?? '—'}
                            {p.duration_rounds ? ` • ${p.duration_rounds} rod.` : ''})
                          </span>
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Dinheiro */}
                  <td className="text-muted-foreground px-4 py-3">
                    {p.kind === 'trade' ? moneyTextTrade(p, myTeamId) : moneyTextLoan(p, myTeamId)}
                  </td>

                  {/* Criada em */}
                  <td className="text-muted-foreground px-4 py-3">
                    {new Date(p.created_at).toLocaleString('pt-BR')}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    {canAct ? (
                      p.kind === 'trade' ? (
                        <div className="flex items-center gap-2">
                          <form action={acceptProposalAction}>
                            <input type="hidden" name="proposal_id" value={p.id} />
                            <button className="rounded bg-black px-3 py-1 text-xs text-white">
                              Aceitar
                            </button>
                          </form>

                          <form action={rejectProposalAction}>
                            <input type="hidden" name="proposal_id" value={p.id} />
                            <button className="rounded border px-3 py-1 text-xs hover:bg-gray-50">
                              Recusar
                            </button>
                          </form>

                          <button
                            type="button"
                            onClick={() => openCounterModal(p)}
                            className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
                          >
                            Contra-proposta
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <form action={acceptLoanProposalAction}>
                            <input type="hidden" name="proposal_id" value={p.id} />
                            <button className="rounded bg-black px-3 py-1 text-xs text-white">
                              Aceitar
                            </button>
                          </form>

                          <form action={rejectLoanProposalAction}>
                            <input type="hidden" name="proposal_id" value={p.id} />
                            <button className="rounded border px-3 py-1 text-xs hover:bg-gray-50">
                              Recusar
                            </button>
                          </form>

                          <button
                            type="button"
                            onClick={() => openLoanCounterModal(p)}
                            className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
                          >
                            Contra-proposta
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                <td className="text-muted-foreground px-4 py-6" colSpan={8}>
                  Nenhuma proposta encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Modal Trade */}
      <CounterProposalModal
        open={openCounter}
        onClose={closeCounterModal}
        baseProposal={counterBase}
        walletBalance={walletBalance}
      />

      {/* Modal Loan */}
      <CounterLoanProposalModal
        open={openLoanCounter}
        onClose={closeLoanCounterModal}
        baseProposal={loanCounterBase}
        walletBalance={walletBalance}
      />
    </>
  );
}
