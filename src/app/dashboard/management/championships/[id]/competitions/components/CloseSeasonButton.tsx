'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { closeSeasonAction } from './seasonActions';

function suggestNextSeason(current: string | null | undefined) {
  const s = (current ?? '').trim();
  const n = Number(s);
  if (Number.isFinite(n) && String(Math.trunc(n)) === s) return String(n + 1);
  return '';
}

export default function CloseSeasonButton(props: {
  championshipId: string;
  currentSeason: string | null;
}) {
  const defaultNext = useMemo(() => suggestNextSeason(props.currentSeason), [props.currentSeason]);
  const [nextSeason, setNextSeason] = useState(defaultNext);

  const canSubmit = props.currentSeason && nextSeason.trim().length > 0;

  return (
    <form
      action={closeSeasonAction}
      className="flex flex-col gap-2 rounded-xl border p-4 md:flex-row md:items-end"
    >
      <input type="hidden" name="championship_id" value={props.championshipId} />
      <input
        type="hidden"
        name="return_to"
        value={`/dashboard/management/championships/${props.championshipId}/competitions`}
      />

      <div className="flex-1">
        <div className="text-sm font-medium">Temporada</div>
        <div className="text-muted-foreground text-xs">
          Atual: <b>{props.currentSeason ?? '—'}</b> · Ao virar, encerra empréstimos dessa
          temporada.
        </div>
      </div>

      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs">Próxima temporada</label>
        <Input
          name="next_season"
          value={nextSeason}
          onChange={(e) => setNextSeason(e.target.value)}
          placeholder="Ex: 2027"
          className="w-40"
        />
      </div>

      <Button type="submit" disabled={!canSubmit} variant="destructive">
        Virar temporada
      </Button>
    </form>
  );
}
