'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';

import type { Championship } from '@/@types/championship';
import type { CompetitionType, CompetitionWithSettings } from '@/@types/competition';
import type { Team } from '@/@types/team';

type LeagueType = 'divisao' | 'divisao_mata';

const LEAGUE_TYPES: { label: string; value: LeagueType }[] = [
  { label: 'Divisão (liga)', value: 'divisao' },
  { label: 'Divisão + Mata-mata (liga + playoff)', value: 'divisao_mata' },
];

export default function CreateLeagueModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const router = useRouter();

  // step 1
  const [leagueType, setLeagueType] = useState<LeagueType | ''>('');
  const [championshipId, setChampionshipId] = useState('');
  const [competitionId, setCompetitionId] = useState('');

  const [championships, setChampionships] = useState<Championship[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionWithSettings[]>([]);

  // step 2
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Record<string, true>>({});

  // ─────────────────────────── loaders ───────────────────────────

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    fetch('/api/championships/list')
      .then((r) => r.json())
      .then((r) => {
        if (cancelled) return;
        setChampionships(r.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setChampionships([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!championshipId || !leagueType) return;

    let cancelled = false;

    fetch(`/api/competitions/list?championship_id=${championshipId}&type=${leagueType}`)
      .then((r) => r.json())
      .then((r) => {
        if (cancelled) return;
        setCompetitions(r.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setCompetitions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, championshipId, leagueType]);

  useEffect(() => {
    if (!open) return;
    if (step !== 2) return;

    let cancelled = false;

    fetch('/api/teams/list')
      .then((r) => r.json())
      .then((r) => {
        if (cancelled) return;
        setTeams(r.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setTeams([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, step]);

  // ─────────────────────────── actions ───────────────────────────

  function resetAll() {
    setStep(1);
    setLeagueType('');
    setChampionshipId('');
    setCompetitionId('');
    setCompetitions([]);
    setTeams([]);
    setSelectedTeamIds({});
  }

  function toggleTeam(teamId: string, checked: boolean) {
    setSelectedTeamIds((prev) => {
      const next = { ...prev };
      if (!checked) delete next[teamId];
      else next[teamId] = true;
      return next;
    });
  }

  async function handleSubmit() {
    if (!competitionId || !championshipId) return;

    const teamIds = Object.keys(selectedTeamIds);
    if (teamIds.length === 0) {
      alert('Selecione ao menos um time');
      return;
    }

    const payload = {
      competition_id: competitionId,
      championship_id: championshipId,
      teams: teamIds.map((id) => ({
        team_id: id,
        group_id: null, // liga não usa grupos
      })),
    };

    const res = await fetch('/api/competition-teams/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      alert(err?.error ?? 'Erro ao cadastrar times na liga');
      return;
    }

    setOpen(false);
    resetAll();
    router.refresh();
  }

  // ─────────────────────────── UI ───────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetAll();
      }}
    >
      <DialogTrigger asChild>
        <Button>Cadastrar times na liga</Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cadastrar times na Liga</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Tipo da Liga</Label>
              <Select
                value={leagueType}
                onValueChange={(v) => {
                  const t = v as LeagueType;
                  setLeagueType(t);

                  // reset dependências aqui (evita setState dentro de effect)
                  setCompetitionId('');
                  setCompetitions([]);
                  setSelectedTeamIds({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {LEAGUE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Campeonato</Label>
              <Select
                value={championshipId}
                onValueChange={(v) => {
                  setChampionshipId(v);

                  // reset dependências aqui
                  setCompetitionId('');
                  setCompetitions([]);
                  setSelectedTeamIds({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {championships.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Liga</Label>
              <Select
                value={competitionId}
                onValueChange={(v) => {
                  setCompetitionId(v);
                  setSelectedTeamIds({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {competitions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" disabled={!competitionId} onClick={() => setStep(2)}>
              Próximo
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <ScrollArea className="h-80 rounded border p-2">
              {teams.map((team) => {
                const checked = !!selectedTeamIds[team.id];

                return (
                  <div
                    key={team.id}
                    className="flex items-center justify-between border-b py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleTeam(team.id, Boolean(v))}
                      />
                      <span>{team.name}</span>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button className="flex-1" onClick={handleSubmit}>
                Salvar times na liga
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
