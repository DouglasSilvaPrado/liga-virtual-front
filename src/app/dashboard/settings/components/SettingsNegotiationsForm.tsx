'use client';

import { useState, useTransition } from 'react';
import { saveNegotiationSettings } from '../actions';

type Props = {
  initialData: {
    id: string;
    negotiations_enabled: boolean;
    free_agent_negotiations_enabled: boolean;
    trades_enabled: boolean;
    loans_enabled: boolean;
  };
};

export default function SettingsNegotiationsForm({ initialData }: Props) {
  const [negotiationsEnabled, setNegotiationsEnabled] = useState(
    initialData.negotiations_enabled,
  );
  const [freeAgentNegotiationsEnabled, setFreeAgentNegotiationsEnabled] = useState(
    initialData.free_agent_negotiations_enabled,
  );
  const [tradesEnabled, setTradesEnabled] = useState(initialData.trades_enabled);
  const [loansEnabled, setLoansEnabled] = useState(initialData.loans_enabled);

  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const childOptionsDisabled = !negotiationsEnabled || isPending;

  function onSubmit() {
    setMessage(null);

    startTransition(async () => {
      const result = await saveNegotiationSettings({
        negotiations_enabled: negotiationsEnabled,
        free_agent_negotiations_enabled: negotiationsEnabled
          ? freeAgentNegotiationsEnabled
          : false,
        trades_enabled: negotiationsEnabled ? tradesEnabled : false,
        loans_enabled: negotiationsEnabled ? loansEnabled : false,
      });

      setMessage(result.message);
    });
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Negociações</h2>
      <p className="mt-1 text-sm text-gray-500">
        Ative ou desative as negociações gerais do sistema.
      </p>

      <div className="mt-6 space-y-4">
        <label className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <div className="font-medium text-gray-900">Negociações</div>
            <div className="text-sm text-gray-500">
              Permite negociações no sistema.
            </div>
          </div>

          <input
            type="checkbox"
            checked={negotiationsEnabled}
            onChange={(e) => setNegotiationsEnabled(e.target.checked)}
            disabled={isPending}
            className="h-5 w-5"
          />
        </label>

        <label
          className={`flex items-center justify-between rounded-xl border p-4 ${
            childOptionsDisabled ? 'opacity-60' : ''
          }`}
        >
          <div>
            <div className="font-medium text-gray-900">
              Negociações de jogador sem contrato
            </div>
            <div className="text-sm text-gray-500">
              Permite contratar jogadores livres/sem contrato.
            </div>
          </div>

          <input
            type="checkbox"
            checked={freeAgentNegotiationsEnabled}
            onChange={(e) => setFreeAgentNegotiationsEnabled(e.target.checked)}
            disabled={childOptionsDisabled}
            className="h-5 w-5"
          />
        </label>

        <label
          className={`flex items-center justify-between rounded-xl border p-4 ${
            childOptionsDisabled ? 'opacity-60' : ''
          }`}
        >
          <div>
            <div className="font-medium text-gray-900">Trocas</div>
            <div className="text-sm text-gray-500">
              Permite envio, aceite, recusa e contraproposta de trocas.
            </div>
          </div>

          <input
            type="checkbox"
            checked={tradesEnabled}
            onChange={(e) => setTradesEnabled(e.target.checked)}
            disabled={childOptionsDisabled}
            className="h-5 w-5"
          />
        </label>

        <label
          className={`flex items-center justify-between rounded-xl border p-4 ${
            childOptionsDisabled ? 'opacity-60' : ''
          }`}
        >
          <div>
            <div className="font-medium text-gray-900">Empréstimos</div>
            <div className="text-sm text-gray-500">
              Permite envio, aceite, recusa e contraproposta de empréstimos.
            </div>
          </div>

          <input
            type="checkbox"
            checked={loansEnabled}
            onChange={(e) => setLoansEnabled(e.target.checked)}
            disabled={childOptionsDisabled}
            className="h-5 w-5"
          />
        </label>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {message && <span className="text-sm text-gray-600">{message}</span>}

        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}