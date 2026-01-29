'use client';

import { useMemo, useState } from 'react';
import type { ProposalListItem, MoneyDirection } from '../page';
import { acceptProposalAction, rejectProposalAction } from '../serverActions';
import CounterProposalModal from './CounterProposalModal';

type Props = {
  proposals: ProposalListItem[];
  myTeamId: string;
  walletBalance: number | null;
};

function money(n: number) {
  return n.toLocaleString('pt-BR');
}

function moneyText(p: ProposalListItem, myTeamId: string) {
  const amount = Math.max(0, p.money_amount ?? 0);
  const dir: MoneyDirection = p.money_direction ?? 'none';

  if (dir === 'none' || amount <= 0) return 'Sem dinheiro envolvido';

  // from_to => FROM paga TO
  // to_from => TO paga FROM
  const myIsFrom = p.from_team_id === myTeamId;
  const myIsTo = p.to_team_id === myTeamId;

  if (dir === 'from_to') {
    if (myIsFrom) return `Você paga R$ ${money(amount)}`;
    if (myIsTo) return `Você recebe +R$ ${money(amount)}`;
    return `FROM paga TO: R$ ${money(amount)}`;
  }

  if (dir === 'to_from') {
    if (myIsTo) return `Você paga R$ ${money(amount)}`;
    if (myIsFrom) return `Você recebe +R$ ${money(amount)}`;
    return `TO paga FROM: R$ ${money(amount)}`;
  }

  return 'Sem dinheiro envolvido';
}

function badge(status: ProposalListItem['status']) {
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

  const [openCounter, setOpenCounter] = useState(false);
  const [counterBase, setCounterBase] = useState<ProposalListItem | null>(null);

  const filtered = useMemo(() => {
    return proposals.filter((p) =>
      tab === 'received' ? p.to_team_id === myTeamId : p.from_team_id === myTeamId,
    );
  }, [proposals, tab, myTeamId]);

  function openCounterModal(p: ProposalListItem) {
    setCounterBase(p);
    setOpenCounter(true);
  }

  function closeCounterModal() {
    setOpenCounter(false);
    setCounterBase(null);
  }

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
              {['Status', 'De', 'Para', 'Troca', 'Dinheiro', 'Criada em', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => {
              const isReceived = p.to_team_id === myTeamId;
              const canAct = isReceived && p.status === 'pending';

              return (
                <tr key={p.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <span className={badge(p.status)}>{p.status}</span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.from_team?.shield_url ? (
                        <img src={p.from_team.shield_url} className="h-5 w-5 object-contain" alt="" />
                      ) : (
                        <div className="h-5 w-5 rounded bg-gray-200" />
                      )}
                      <span className="text-muted-foreground">{p.from_team?.name ?? '—'}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.to_team?.shield_url ? (
                        <img src={p.to_team.shield_url} className="h-5 w-5 object-contain" alt="" />
                      ) : (
                        <div className="h-5 w-5 rounded bg-gray-200" />
                      )}
                      <span className="text-muted-foreground">{p.to_team?.name ?? '—'}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        {p.offered_player?.player_img ? (
                          <img src={p.offered_player.player_img} className="h-6 w-6" alt="" />
                        ) : null}
                        <span>
                          <b>{p.offered_player?.name ?? '—'}</b>{' '}
                          <span className="text-muted-foreground">
                            ({p.offered_player?.position ?? '—'} • {p.offered_player?.rating ?? '—'})
                          </span>
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground">por</div>

                      <div className="flex items-center gap-2">
                        {p.requested_player?.player_img ? (
                          <img src={p.requested_player.player_img} className="h-6 w-6" alt="" />
                        ) : null}
                        <span>
                          <b>{p.requested_player?.name ?? '—'}</b>{' '}
                          <span className="text-muted-foreground">
                            ({p.requested_player?.position ?? '—'} • {p.requested_player?.rating ?? '—'})
                          </span>
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">{moneyText(p, myTeamId)}</td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.created_at).toLocaleString('pt-BR')}
                  </td>

                  <td className="px-4 py-3">
                    {canAct ? (
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
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  Nenhuma proposta encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <CounterProposalModal
        open={openCounter}
        onClose={closeCounterModal}
        baseProposal={counterBase}
        walletBalance={walletBalance}
      />
    </>
  );
}
