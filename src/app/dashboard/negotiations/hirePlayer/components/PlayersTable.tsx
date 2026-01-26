'use client';

import { useMemo, useState } from 'react';
import type { PlayerRow } from '../page';
import { hirePlayerAction } from '../actions';
import PlayerDetailsModal from './PlayerDetailsModal';

type Props = {
  players: PlayerRow[];
  returnTo: string;
  walletBalance: number | null;
};

function parsePriceToNumber(priceText: string | null | undefined): number {
  if (!priceText) return 0;

  const raw = priceText.toString().trim().toUpperCase();
  const cleaned = raw
    .replaceAll('R$', '')
    .replaceAll(' ', '')
    .replaceAll('.', '')
    .replaceAll(',', '.');

  const mult = cleaned.endsWith('M') ? 1_000_000 : cleaned.endsWith('K') ? 1_000 : 1;
  const numeric = cleaned.replace(/[MK]$/g, '');

  const n = Number(numeric);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * mult);
}

function money(n: number) {
  return n.toLocaleString('pt-BR');
}

export default function PlayersTable({ players, returnTo, walletBalance }: Props) {
  // modal contratação
  const [openHire, setOpenHire] = useState(false);
  const [selectedHire, setSelectedHire] = useState<PlayerRow | null>(null);

  // modal detalhes
  const [openDetails, setOpenDetails] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);

  const selectedPrice = useMemo(() => {
    if (!selectedHire) return 0;
    return parsePriceToNumber(selectedHire.price);
  }, [selectedHire]);

  const before = walletBalance ?? 0;
  const after = Math.max(0, before - selectedPrice);
  const diff = after - before;

  function openHireModal(p: PlayerRow) {
    setSelectedHire(p);
    setOpenHire(true);
  }

  function closeHireModal() {
    setOpenHire(false);
    setSelectedHire(null);
  }

  function openDetailsModal(playerId: number) {
    setDetailsId(playerId);
    setOpenDetails(true);
  }

  function closeDetailsModal() {
    setOpenDetails(false);
    setDetailsId(null);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              {['Jogador', 'Overall', 'Nacionalidade', 'Posição', 'Time', 'Valor', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {players.map((p) => (
              <tr
                key={p.id}
                className="border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                onClick={() => openDetailsModal(p.id)}
                title="Ver detalhes"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.player_img ? <img src={p.player_img} alt="" className="h-7 w-7" /> : null}

                    <div>
                      <button
                        type="button"
                        className="cursor-pointer text-left font-medium hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailsModal(p.id);
                        }}
                      >
                        {p.name ?? '—'}
                      </button>

                      <div className="text-xs text-muted-foreground">ID: {p.id}</div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">{p.rating ?? '—'}</td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.nation_img ? (
                      <img src={p.nation_img} alt="" className="h-4 w-6 object-contain" />
                    ) : null}
                    <span className="text-muted-foreground">{p.nation_img ? '' : '—'}</span>
                  </div>
                </td>

                <td className="px-4 py-3">{p.position ?? '—'}</td>

                <td className="px-4 py-3 text-muted-foreground">
                  {p.current_team_name ?? 'Sem contrato'}
                </td>

                <td className="px-4 py-3">{p.price ?? '—'}</td>

                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openHireModal(p);
                    }}
                    className="cursor-pointer rounded border px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    Contratar
                  </button>
                </td>
              </tr>
            ))}

            {players.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  Nenhum jogador encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALHES (separado) */}
      <PlayerDetailsModal open={openDetails} playerId={detailsId} onClose={closeDetailsModal} />

      {/* MODAL CONTRATAÇÃO */}
      {openHire && selectedHire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <div className="font-semibold">Confirmar contratação</div>
              <button
                type="button"
                onClick={closeHireModal}
                className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                {selectedHire.player_img ? (
                  <img src={selectedHire.player_img} alt="" className="h-10 w-10" />
                ) : null}
                <div>
                  <div className="font-medium">{selectedHire.name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedHire.position ?? '—'} • Overall {selectedHire.rating ?? '—'} • ID{' '}
                    {selectedHire.id}
                  </div>
                </div>
              </div>

              <div className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo atual</span>
                  <span className="font-medium">
                    {walletBalance == null ? '—' : `R$ ${money(before)}`}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Valor do jogador</span>
                  <span className="font-medium">R$ {money(selectedPrice)}</span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo após compra</span>
                  <span className="font-semibold">R$ {money(after)}</span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Diferença</span>
                  <span className={`font-medium ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {diff < 0 ? '-' : '+'}R$ {money(Math.abs(diff))}
                  </span>
                </div>
              </div>

              {walletBalance != null && before < selectedPrice && (
                <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  Saldo insuficiente para contratar esse jogador.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t p-4">
              <button
                type="button"
                onClick={closeHireModal}
                className="cursor-pointer rounded border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>

              <form
                action={hirePlayerAction}
                onSubmit={() => {
                  // fecha o modal assim que enviar (o redirect virá na sequência)
                  closeHireModal();
                }}
              >
                <input type="hidden" name="player_id" value={String(selectedHire.id)} />
                <input type="hidden" name="return_to" value={returnTo} />

                <button
                  className="cursor-pointer rounded bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={walletBalance != null && before < selectedPrice}
                >
                  Confirmar contratação
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
