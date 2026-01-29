'use client';

import { useMemo, useState } from 'react';
import type { MyTeamPlayerRow, PlayerRow } from '../page';
import { hirePlayerAction } from '../actions';
import PlayerDetailsModal from './PlayerDetailsModal';
import TradePlayerModal from './TradePlayerModal';

type Props = {
  players: PlayerRow[];
  returnTo: string;
  walletBalance: number | null;

  myPlayers: MyTeamPlayerRow[];
  myTeamId: string | null;
  activeChampionshipId: string | null;
};

function parsePriceToNumber(priceText: string | null | undefined): number {
  if (!priceText) return 0;

  const raw = priceText.toString().trim().toUpperCase();

  // mantém só dígitos + separadores + sufixo K/M
  const m = raw.replace(/\s/g, '').match(/^R?\$?([\d.,]+)([KM])?$/i);
  if (!m) return 0;

  let numPart = m[1]; // ex: "30.75" ou "1.51" ou "667"
  const suffix = (m[2] ?? '').toUpperCase(); // "K" | "M" | ""

  // Se tiver '.' e ',', assumimos formato pt-BR: 1.234,56
  // Se tiver só ',', tratamos como decimal: 30,75
  // Se tiver só '.', tratamos como decimal: 30.75
  if (numPart.includes('.') && numPart.includes(',')) {
    numPart = numPart.replace(/\./g, '').replace(',', '.');
  } else if (numPart.includes(',')) {
    numPart = numPart.replace(',', '.');
  }

  const n = Number(numPart);
  if (!Number.isFinite(n)) return 0;

  const mult = suffix === 'M' ? 1_000_000 : suffix === 'K' ? 1_000 : 1;
  return Math.round(n * mult);
}

function money(n: number) {
  return n.toLocaleString('pt-BR');
}

export default function PlayersTable({
  players,
  returnTo,
  walletBalance,
  myPlayers,
  myTeamId,
  activeChampionshipId,
}: Props) {
  // modal contratação
  const [openHire, setOpenHire] = useState(false);
  const [selectedHire, setSelectedHire] = useState<PlayerRow | null>(null);

  // modal detalhes
  const [openDetails, setOpenDetails] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);

  // modal troca
  const [openTrade, setOpenTrade] = useState(false);
  const [tradeTarget, setTradeTarget] = useState<PlayerRow | null>(null);

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

  function openTradeModal(p: PlayerRow) {
    setTradeTarget(p);
    setOpenTrade(true);
  }

  function closeTradeModal() {
    setOpenTrade(false);
    setTradeTarget(null);
  }

  const hasWallet = walletBalance != null;
  const canBuy = hasWallet && before >= selectedPrice;

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              {['Jogador', 'Overall', 'Nacionalidade', 'Posição', 'Time', 'Valor', 'Ações'].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {players.map((p) => {
              const isFreeAgent = !p.current_team_id; // sem time => pode contratar
              const isMine = myTeamId != null && p.current_team_id === myTeamId;
              const canTrade = !!p.current_team_id && !isMine; // tem time e não é o meu time

              return (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b last:border-b-0 hover:bg-gray-50"
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

                        <div className="text-muted-foreground text-xs">ID: {p.id}</div>
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

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.current_team_shield ? (
                        <img
                          src={p.current_team_shield}
                          alt={p.current_team_name ?? 'Escudo do time'}
                          className="h-5 w-5 object-contain"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded bg-gray-200" />
                      )}

                      <span className="text-muted-foreground">
                        {p.current_team_name ?? 'Sem contrato'}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">{p.price ?? '—'}</td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openHireModal(p);
                        }}
                        className="cursor-pointer rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!isFreeAgent}
                        title={
                          !isFreeAgent
                            ? 'Só é possível contratar jogador sem contrato'
                            : 'Contratar'
                        }
                      >
                        Contratar
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTradeModal(p);
                        }}
                        className="cursor-pointer rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canTrade}
                        title={
                          !canTrade
                            ? isMine
                              ? 'Jogador já é do seu time'
                              : 'Jogador sem time'
                            : 'Propor troca'
                        }
                      >
                        Trocar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {players.length === 0 ? (
              <tr>
                <td className="text-muted-foreground px-4 py-6" colSpan={7}>
                  Nenhum jogador encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALHES */}
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
                  <div className="text-muted-foreground text-xs">
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

              {!hasWallet ? (
                <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  Você ainda não possui carteira neste campeonato. Crie/ative uma carteira para
                  contratar jogadores.
                </div>
              ) : before < selectedPrice ? (
                <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  Saldo insuficiente para contratar esse jogador.
                </div>
              ) : null}
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
                  closeHireModal();
                }}
              >
                <input type="hidden" name="player_id" value={String(selectedHire.id)} />
                <input type="hidden" name="return_to" value={returnTo} />

                <button
                  className="cursor-pointer rounded bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canBuy}
                >
                  Confirmar contratação
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TROCA */}
      <TradePlayerModal
        open={openTrade}
        onClose={closeTradeModal}
        returnTo={returnTo}
        walletBalance={walletBalance}
        myPlayers={myPlayers}
        myTeamId={myTeamId}
        activeChampionshipId={activeChampionshipId}
        target={
          tradeTarget
            ? {
                player_id: tradeTarget.id,
                name: tradeTarget.name,
                rating: tradeTarget.rating,
                position: tradeTarget.position,
                player_img: tradeTarget.player_img,
                current_team_name: tradeTarget.current_team_name,
                current_team_shield: tradeTarget.current_team_shield,
                current_team_id: tradeTarget.current_team_id,
              }
            : null
        }
      />
    </>
  );
}
