'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Championship } from '@/@types/championship';
import type { CompetitionType, CompetitionWithSettings } from '@/@types/competition';
import { Team } from '@/@types/team';
import { useRouter } from 'next/navigation';

/* -------------------------------- TYPES -------------------------------- */

interface CompetitionGroup {
  id: string;
  code: string; // A, B, C...
  name?: string | null;
}

interface SelectedTeam {
  team: Team;
  group_id: string | null; // null = aleatório
}

/* -------------------------------- CONST -------------------------------- */

const CUP_TYPES: { label: string; value: CompetitionType }[] = [
  { label: 'Mata-mata', value: 'mata_mata' },
  { label: 'Copa (Grupos + Mata)', value: 'copa_grupo_mata' },
  { label: 'Copa (Grupos)', value: 'copa_grupo' },
];

/* ------------------------------- COMPONENT ------------------------------ */

export default function CreateCupModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const router = useRouter();

  // STEP 1
  const [cupType, setCupType] = useState<CompetitionType | ''>('');
  const [championshipId, setChampionshipId] = useState('');
  const [competitionId, setCompetitionId] = useState('');

  const [championships, setChampionships] = useState<Championship[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionWithSettings[]>([]);

  // STEP 2
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<CompetitionGroup[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Record<string, SelectedTeam>>({});

  const isGroupCompetition = useMemo(() => {
    return cupType === 'copa_grupo' || cupType === 'copa_grupo_mata';
  }, [cupType]);

  const groupsForUI = isGroupCompetition ? groups : [];

  /* ------------------------------- LOADERS ------------------------------- */

  // Abriu modal -> carrega campeonatos
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
    if (!championshipId || !cupType) return;

    let cancelled = false;

    fetch(`/api/competitions/list?championship_id=${championshipId}&type=${cupType}`)
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
  }, [championshipId, cupType]);

  // Entrou no step 2 -> carrega times
  useEffect(() => {
    if (!open) return;
    if (step !== 2 || !competitionId) return;

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
  }, [open, step, competitionId]);

  // Step 2 + competição de grupos -> busca grupos
  useEffect(() => {
    if (!open) return;
    if (step !== 2 || !competitionId) return;

    // Se NÃO é competição de grupos, não faz fetch aqui.
    if (!isGroupCompetition) return;

    let cancelled = false;

    fetch(`/api/competition-groups/list?competition_id=${competitionId}`)
      .then((r) => r.json())
      .then((r) => {
        if (cancelled) return;
        setGroups(r.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setGroups([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, step, competitionId, isGroupCompetition]);

  /* ------------------------------- ACTIONS ------------------------------- */

  function toggleTeam(team: Team, checked: boolean) {
    setSelectedTeams((prev) => {
      const next = { ...prev };

      if (!checked) {
        delete next[team.id];
      } else {
        next[team.id] = { team, group_id: null };
      }

      return next;
    });
  }

  function setTeamGroup(teamId: string, groupId: string | null) {
    setSelectedTeams((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], group_id: groupId },
    }));
  }

  async function handleSubmit() {
    if (!competitionId || !championshipId) return;

    if (Object.keys(selectedTeams).length === 0) {
      alert('Selecione ao menos um time');
      return;
    }

    const payload = {
      competition_id: competitionId,
      championship_id: championshipId,
      teams: Object.values(selectedTeams).map((t) => ({
        team_id: t.team.id,
        group_id: isGroupCompetition ? t.group_id : null,
      })),
    };

    const res = await fetch('/api/competition-teams/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? 'Erro ao criar copa');
      return;
    }

    setOpen(false);
    setStep(1);
    setSelectedTeams({});
    setTeams([]);
    setGroups([]);
    setCupType('');
    setChampionshipId('');
    setCompetitionId('');
    router.refresh();
  }

  /* -------------------------------- UI ---------------------------------- */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Criar Copa</Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Criar Copa</DialogTitle>
        </DialogHeader>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Tipo da Copa</Label>
              <Select
                value={cupType}
                onValueChange={(v) => {
                  const nextType = v as CompetitionType;
                  setCupType(nextType);
                  // resets coerentes
                  setStep(1);
                  setChampionshipId('');
                  setCompetitionId('');
                  setCompetitions([]);
                  setSelectedTeams({});
                  setTeams([]);
                  setGroups([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CUP_TYPES.map((t) => (
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
                  setCompetitionId('');
                  setSelectedTeams({});
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
              <Label>Copa</Label>
              <Select value={competitionId} onValueChange={setCompetitionId}>
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

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <ScrollArea className="h-80 rounded border p-2">
              {teams.map((team) => {
                const checked = !!selectedTeams[team.id];

                return (
                  <div key={team.id} className="flex items-center justify-between border-b py-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleTeam(team, Boolean(v))}
                      />
                      <span>{team.name}</span>
                    </div>

                    {checked && isGroupCompetition && groupsForUI.length > 0 && (
                      <Select
                        value={selectedTeams[team.id].group_id ?? 'random'}
                        onValueChange={(v) => setTeamGroup(team.id, v === 'random' ? null : v)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="random">Aleatório</SelectItem>
                          {groupsForUI.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name ?? `Grupo ${g.code}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button className="flex-1" onClick={handleSubmit}>
                Criar Copa
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
