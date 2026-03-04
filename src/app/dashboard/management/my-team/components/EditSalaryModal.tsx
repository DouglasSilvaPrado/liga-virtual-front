'use client';

import { useState } from 'react';
import type { MyTeamPlayerCardItem } from './MyPlayersGrid';
import { updatePlayerSalaryAction } from '../serverActionsMarket';

type Props = {
  open: boolean;
  onClose: () => void;
  championshipId: string | null;
  player: MyTeamPlayerCardItem | null;
};

function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, '');
}

export default function EditSalaryModal({ open, onClose, championshipId, player }: Props) {
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
  const [salary, setSalary] = useState<string>(String(player.salary_per_round ?? 0));

  const salaryNum = Number(onlyDigits(salary || '0'));
  const canSubmit = Number.isFinite(salaryNum) && salaryNum >= 0;

  // passe = salary * 100; multa = passe * 3 = salary * 300
  const passValue = Math.max(0, Math.trunc(salaryNum)) * 100;
  const buyoutValue = Math.max(0, Math.trunc(salaryNum)) * 300;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Editar salário</h3>
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

        <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Ao salvar: <b>passe</b> = salário × 100 e <b>multa</b> = salário × 300.
        </div>

        <form
          action={updatePlayerSalaryAction}
          onSubmit={() => onClose()}
          className="grid gap-3"
        >
          <input type="hidden" name="championship_id" value={championshipId} />
          <input type="hidden" name="player_id" value={String(player.player_id)} />

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Novo salário por rodada (R$)</span>
            <input
              className="rounded border px-3 py-2"
              name="salary_per_round"
              inputMode="numeric"
              value={salary}
              onChange={(e) => setSalary(onlyDigits(e.target.value))}
              placeholder="Ex: 305000"
            />
            <span className="text-muted-foreground text-xs">
              {salaryNum >= 0 ? `R$ ${salaryNum.toLocaleString('pt-BR')}` : 'Informe um valor válido'}
            </span>
          </label>

          <div className="text-muted-foreground text-xs">
            Passe (estimado): <b>R$ {passValue.toLocaleString('pt-BR')}</b>
            <br />
            Multa (estimada): <b>R$ {buyoutValue.toLocaleString('pt-BR')}</b>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              title={!canSubmit ? 'Informe um valor válido' : 'Salvar'}
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}