"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  CompetitionWithSettings,
  MatchSettings,
  CompetitionSettingsData,
} from "@/@types/competition";

import { useForm } from "react-hook-form";

// ----- FORM TYPE -----
type CompetitionForm = {
  name: string;
  rules: string | null;
  competition_url: string | null;
  type: string;
  settings: CompetitionSettingsData;
};

export default function EditCompetitionModal({
  open,
  onOpenChange,
  competition,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  competition: CompetitionWithSettings;
}) {
  console.log("🚀 ~ EditCompetitionModal ~ competition:", competition)
  const { register, handleSubmit, reset, watch, setValue } =
    useForm<CompetitionForm>({
      defaultValues: {
        name: competition.name,
        rules: competition.rules,
        competition_url: competition.competition_url,
        type: competition.type,
        settings: competition.settings,
      },
    });

  // Watch settings safely
  const settings = watch("settings");
  console.log("🚀 ~ EditCompetitionModal ~ settings:", settings)

  useEffect(() => {
    if (open) {
      reset({
        name: competition.name,
        rules: competition.rules,
        competition_url: competition.competition_url,
        type: competition.type,
        settings: competition.settings,
      });
    }
  }, [open, competition, reset]);

  const onSubmit = async (values: CompetitionForm) => {
    await fetch(`/api/competitions/update-with-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: competition.id,
        competition_settings_id: competition.competition_settings_id,
        ...values,
      }),
    });

    onOpenChange(false);
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Competição</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Basic fields */}
          <div>
            <Label>Nome</Label>
            <Input {...register("name")} />
          </div>

          <div>
            <Label>URL da Imagem</Label>
            <Input {...register("competition_url")} />
          </div>

          <div>
            <Label>Regras</Label>
            <Textarea {...register("rules")} rows={3} />
          </div>

          {/* MATCH SETTINGS TIPADO */}
          <div>
            <Label className="font-semibold">Configurações da Partida</Label>

            <div className="grid grid-cols-2 gap-3 mt-2">
              {(
                Object.keys(
                  settings?.match_settings ?? {}
                ) as (keyof MatchSettings)[]
              ).map((key) => (
                <div key={key}>
                  <Label>{key.replace(/_/g, " ")}</Label>

                  {typeof settings.match_settings[key] === "boolean" ? (
                    <input
                      type="checkbox"
                      className="scale-110 ml-2"
                      checked={settings.match_settings[key] as boolean}
                      onChange={(e) =>
                        setValue(
                          `settings.match_settings.${key}`,
                          e.target.checked
                        )
                      }
                    />
                  ) : (
                    <Input
                      type="number"
                      {...register(`settings.match_settings.${key}`, {
                        valueAsNumber: true,
                      })}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">
            Salvar alterações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
