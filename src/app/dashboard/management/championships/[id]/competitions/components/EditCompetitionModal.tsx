'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  CompetitionWithSettings,
  MatchSettings,
  CompetitionSettingsData,
} from '@/@types/competition';

import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // IMPORTANTE
import { AvatarPreview } from '@/components/image/avatarPreview';

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
  const router = useRouter();

  const [divisionCompetitions, setDivisionCompetitions] = useState<{ id: number; name: string }[]>(
    [],
  );

  const { register, handleSubmit, reset, watch, setValue, control } = useForm<CompetitionForm>({
    defaultValues: {
      name: competition.name,
      rules: competition.rules,
      competition_url: competition.competition_url,
      type: competition.type,
      settings: competition.settings,
    },
  });

  const settings = watch('settings');
  const qtdAcessos = watch('settings.specific.qtd_acessos');
  const qtdRebaixados = watch('settings.specific.qtd_rebaixados');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('competitions').select('id, name').eq('type', 'divisao');

      setDivisionCompetitions(data || []);
    };

    load();
  }, []);

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
    const res = await fetch(`/api/competitions/update-with-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: competition.id,
        competition_settings_id: competition.competition_settings_id,
        name: values.name,
        rules: values.rules,
        competition_url: values.competition_url,
        type: values.type,
        settings: values.settings,
      }),
    });

    if (!res.ok) {
      console.error('Erro ao atualizar:', await res.text());
      return;
    }
    router.refresh();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Competição</DialogTitle>
        </DialogHeader>

        <AvatarPreview avatarPreview={watch('competition_url') ?? ''} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ------------------------- CAMPOS BÁSICOS ------------------------- */}
          <div>
            <Label>Nome</Label>
            <Input {...register('name')} />
          </div>

          <div>
            <Label>URL da Imagem</Label>
            <Input {...register('competition_url')} />
          </div>

          <div>
            <Label>Regras</Label>
            <Textarea {...register('rules')} rows={3} />
          </div>

          {/* --------------------- MATCH SETTINGS ---------------------------- */}
          <div>
            <Label className="font-semibold">Configurações da Partida</Label>

            <div className="mt-2 grid grid-cols-2 gap-3">
              {(Object.keys(settings?.match_settings ?? {}) as (keyof MatchSettings)[]).map(
                (key) => (
                  <div key={key}>
                    <Label>{key.replace(/_/g, ' ')}</Label>

                    {typeof settings.match_settings[key] === 'boolean' ? (
                      <input
                        type="checkbox"
                        className="ml-2 scale-110"
                        checked={settings.match_settings[key] as boolean}
                        onChange={(e) =>
                          setValue(`settings.match_settings.${key}`, e.target.checked)
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
                ),
              )}
            </div>
          </div>

          {/* ----------------------- SPECIFIC SETTINGS ----------------------- */}
          <div>
            <Label className="font-semibold">Configurações Específicas</Label>

            <div className="mt-2 grid grid-cols-2 gap-3">
              {Object.keys(settings?.specific ?? {}).map((key) => {
                const specific = settings!.specific as Record<string, boolean | number>;

                return (
                  <div key={key}>
                    <Label>{key.replace(/_/g, ' ')}</Label>

                    {typeof specific[key] === 'boolean' ? (
                      <input
                        type="checkbox"
                        className="ml-2 scale-110"
                        checked={specific[key] as boolean}
                        onChange={(e) => setValue(`settings.specific.${key}`, e.target.checked)}
                      />
                    ) : (
                      <Input
                        type="number"
                        value={specific[key] as number}
                        onChange={(e) =>
                          setValue(`settings.specific.${key}`, Number(e.target.value))
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* --------------------- SELECTS DE DIVISÃO ------------------------ */}

          {Number(qtdRebaixados) > 0 && (
            <div>
              <Label className="font-semibold">Divisão de Rebaixamento</Label>

              <Controller
                control={control}
                name="settings.divisionSettings.divisao_rebaixamento_competition_id"
                render={({ field }) => (
                  <select
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)} // UUID = string
                    className="mt-1 w-full rounded border p-2"
                  >
                    <option value="">Selecione...</option>
                    {divisionCompetitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          )}

          {Number(qtdAcessos) > 0 && (
            <div>
              <Label className="font-semibold">Divisão de Acesso</Label>
              <Controller
                control={control}
                name="settings.divisionSettings.divisao_acesso_competition_id"
                render={({ field }) => (
                  <select
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="mt-1 w-full rounded border p-2"
                  >
                    <option value="">Selecione...</option>
                    {divisionCompetitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          )}

          {/* BOTÃO */}
          <Button type="submit" className="w-full">
            Salvar alterações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
