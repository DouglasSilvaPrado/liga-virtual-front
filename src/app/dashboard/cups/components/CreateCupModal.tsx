"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Championship } from '@/@types/championship';
import { CompetitionType, CompetitionWithSettings } from '@/@types/competition';
import { Team } from '@/@types/team';

/**
 * STEPS:
 * 1) Tipo da copa + Championship + Competition (filtrada pelo tipo)
 * 2) Seleção de times + grupo (manual/aleatório)
 */

const CUP_TYPES: { label: string; value: CompetitionType }[] = [
  { label: "Mata-mata", value: "mata_mata" },
  { label: "Copa (Grupos + Mata)", value: "copa_grupo_mata" },
];

interface SelectedTeam {
  team: Team;
  group: string | "random";
}

export default function CreateCupModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // STEP 1
  const [cupType, setCupType] = useState<CompetitionType | "">("");
  const [championshipId, setChampionshipId] = useState<string>("");
  const [competitionId, setCompetitionId] = useState<string>("");

  const [championships, setChampionships] = useState<Championship[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionWithSettings[]>([]);

  // STEP 2
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Record<string, SelectedTeam>>({});

  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === competitionId),
    [competitions, competitionId]
  );

  const numGrupos = useMemo(() => {
    const specific = selectedCompetition?.settings?.specific;

    if (
      specific &&
      typeof specific === "object" &&
      "num_grupos" in specific &&
      typeof (specific).num_grupos === "number"
    ) {
      return (specific as { num_grupos: number }).num_grupos;
    }

    return 0;
  }, [selectedCompetition]);


  const groupOptions = useMemo(() => {
    if (!numGrupos) return [];
    return Array.from({ length: numGrupos }).map((_, i) =>
      String.fromCharCode(65 + i)
    );
  }, [numGrupos]);

  function validateGroups(): string | null {
    if (!numGrupos) return null;

    const teamsArray = Object.values(selectedTeams);
    const totalTeams = teamsArray.length;

    if (totalTeams % numGrupos !== 0) {
      return `O número de times (${totalTeams}) deve ser divisível por ${numGrupos} grupos.`;
    }

    const expectedPerGroup = totalTeams / numGrupos;

    const groupsCount: Record<string, number> = {};

    for (const t of teamsArray) {
      if (t.group === "random") continue; // deixa o backend sortear
      groupsCount[t.group] = (groupsCount[t.group] ?? 0) + 1;
    }

    for (const g of Object.keys(groupsCount)) {
      if (groupsCount[g] > expectedPerGroup) {
        return `O grupo ${g} não pode ter mais que ${expectedPerGroup} times.`;
      }
    }

    return null;
  }

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(selectedTeams).forEach((t) => {
      if (t.group !== "random") {
        counts[t.group] = (counts[t.group] ?? 0) + 1;
      }
    });
    return counts;
  }, [selectedTeams]);

  const maxPerGroup =
    numGrupos > 0
      ? Object.keys(selectedTeams).length / numGrupos
      : 0;



  /** LOADS */
  useEffect(() => {
    if (!open) return;

    fetch("/api/championships/list")
      .then((r) => r.json())
      .then((r) => setChampionships(r.data ?? []));
  }, [open]);

  useEffect(() => {
    if (!championshipId || !cupType) return;

    fetch(
      `/api/competitions/list?championship_id=${championshipId}&type=${cupType}`
    )
      .then((r) => r.json())
      .then((r) => setCompetitions(r.data ?? []));
  }, [championshipId, cupType]);

  useEffect(() => {
    if (step !== 2) return;

    fetch("/api/teams/list")
      .then((r) => r.json())
      .then((r) => setTeams(r.data ?? []));
  }, [step]);

  /** ACTIONS */
  function toggleTeam(team: Team, checked: boolean) {
    setSelectedTeams((prev) => {
      const next = { ...prev };

      if (!checked) {
        delete next[team.id];
      } else {
        next[team.id] = { team, group: "random" };
      }

      return next;
    });
  }

  function setTeamGroup(teamId: string, group: string) {
    setSelectedTeams((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], group },
    }));
  }

  async function handleSubmit() {
    const error = validateGroups();

    if (error) {
      alert(error);
      return;
    }

    const payload = Object.values(selectedTeams).map((t) => ({
      competition_id: competitionId,
      team_id: t.team.id,
      group: t.group === "random" ? null : t.group,
    }));

    await fetch("/api/competition-teams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setOpen(false);
    setStep(1);
  }


  /** UI */
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
              <Select value={cupType} onValueChange={setCupType}>
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
              <Select value={championshipId} onValueChange={setChampionshipId}>
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

            <Button
              className="w-full"
              disabled={!competitionId}
              onClick={() => setStep(2)}
            >
              Próximo
            </Button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && selectedCompetition && (
          <div className="space-y-4">
            <ScrollArea className="h-80 rounded border p-2">
              {teams.map((team) => {
                const checked = !!selectedTeams[team.id];

                return (
                  <div
                    key={team.id}
                    className="flex items-center justify-between gap-3 border-b py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          toggleTeam(team, Boolean(v))
                        }
                      />
                      <span>{team.name}</span>
                    </div>

                    {checked && numGrupos > 0 && (
                      <Select
                        value={selectedTeams[team.id].group}
                        onValueChange={(v) => setTeamGroup(team.id, v)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="random">Aleatório</SelectItem>
                          {groupOptions.map((g) => (
                            <SelectItem
                              key={g}
                              value={g}
                              disabled={(groupCounts[g] ?? 0) >= maxPerGroup}
                            >
                              Grupo {g}
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
              <Button
                className="flex-1"
                disabled={Object.keys(selectedTeams).length === 0}
                onClick={handleSubmit}
              >
                Criar Copa
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
