'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabaseClient';
import { AvatarPreview } from '@/components/image/avatarPreview';

/**
 * Zod schema for the complete settings object. It will validate on client before submit.
 * Note: you can extend/adjust defaults here.
 */
const matchSettingsSchema = z.object({
  premio_vitoria: z.coerce.number().int().nonnegative().optional().default(0),
  premio_empate: z.coerce.number().int().nonnegative().optional().default(0),
  premio_derrota: z.coerce.number().int().nonnegative().optional().default(0),
  premio_gol: z.coerce.number().int().nonnegative().optional().default(0),
  cartao_amarelo: z.coerce.number().int().nonnegative().optional().default(0),
  cartao_vermelho: z.coerce.number().int().nonnegative().optional().default(0),
  multa_wo: z.coerce.number().int().nonnegative().optional().default(0),
  mostrar_gols_artilharia: z.boolean().optional().default(true),
  melhor_jogador_partida: z.boolean().optional().default(true),
  pontos_vitoria: z.coerce.number().int().nonnegative().optional().default(3),
  pontos_empate: z.coerce.number().int().nonnegative().optional().default(1),
  pontos_derrota: z.coerce.number().int().nonnegative().optional().default(0),
});

const baseSettingsSchema = z.object({
  // common to all formats
  match_settings: matchSettingsSchema,
});

const divisionSettings = z.object({
  ida_volta: z.boolean().default(true),
  qtd_acessos: z.coerce.number().int().min(0).nullable(),
  qtd_rebaixados: z.coerce.number().int().min(0).nullable(),
  divisao_rebaixamento_competition_id: z.string().nullable(),
  divisao_acesso_competition_id: z.string().nullable(),
});

const divMataSettings = z.object({
  qtd_classifica_para_mata: z.coerce.number().int().min(0).optional().nullable(),
  chave_automatica: z.enum(['melhor_x_pior', 'aleatorio']).optional().default('melhor_x_pior'),
  criterio_mata_mata: z.enum(['saldo_gols', 'gol_fora']).optional().default('saldo_gols'),
  ida_volta: z.boolean().optional().default(true),
  mata_em_ida_e_volta: z.boolean().optional().default(true),
  final_ida_volta: z.boolean().optional().default(true),
  disputa_terceiro_quarto: z.boolean().optional().default(false),
});

const copaGrupoSettings = z.object({
  num_grupos: z.coerce.number().int().min(1).optional().nullable(),
  ida_volta: z.boolean().optional().default(true),
});

const copaGrupoMataSettings = z.object({
  num_grupos: z.coerce.number().int().min(1).optional().nullable(),
  qtd_classifica_por_grupo: z.coerce.number().int().min(0).optional().nullable(),
  chave_automatica: z.enum(['melhor_x_pior', 'aleatorio']).optional().default('melhor_x_pior'),
  criterio_mata_mata: z.enum(['saldo_gols', 'gol_fora']).optional().default('saldo_gols'),
  ida_volta: z.boolean().optional().default(true),
  mata_em_ida_e_volta: z.boolean().optional().default(true),
  final_ida_volta: z.boolean().optional().default(true),
  disputa_terceiro_quarto: z.boolean().optional().default(false),
});

const mataMataSettings = z.object({
  criterio_mata_mata: z.enum(['saldo_gols', 'gol_fora']).optional().default('saldo_gols'),
  mata_em_ida_e_volta: z.boolean().optional().default(true),
  final_ida_volta: z.boolean().optional().default(true),
  disputa_terceiro_quarto: z.boolean().optional().default(false),
});

const formSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.enum(['divisao', 'divisao_mata', 'copa_grupo', 'copa_grupo_mata', 'mata_mata']),
  rules: z.string().optional().nullable(),
  competition_url: z.string().optional().nullable(),
  // settings is any object but we'll build from the above schemas
  divisionSettings,
});

type FormValues = z.infer<typeof formSchema>;

type TypeSettings =
  | z.infer<typeof divisionSettings>
  | z.infer<typeof divMataSettings>
  | z.infer<typeof copaGrupoSettings>
  | z.infer<typeof copaGrupoMataSettings>
  | z.infer<typeof mataMataSettings>
  | Record<string, unknown>;

export default function CreateCompetitionModal({
  open,
  onOpenChange,
  championshipId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  championshipId: string;
}) {
  const [loading, setLoading] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      type: 'divisao',
      rules: '',
      competition_url: '',
      divisionSettings: {
        ida_volta: true,
        qtd_rebaixados: 0,
        qtd_acessos: 0,
        divisao_rebaixamento_competition_id: null,
        divisao_acesso_competition_id: null,
      },
    },
  });

  const selectedType = watch('type');
  const qtdRebaixados = Number(watch('divisionSettings.qtd_rebaixados') ?? 0);
  const qtdAcessos = Number(watch('divisionSettings.qtd_acessos') ?? 0);

  // Default match settings local form controls (we'll read them with watch)
  // We use controller-less inputs for numbers and switches below.

  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    // Build settings object from form fields in DOM (read via document or query)
    // Simpler approach: read values directly from inputs by id (we set ids)
    // Build match_settings:
    const match_settings = {
      premio_vitoria: Number(
        (document.getElementById('premio_vitoria') as HTMLInputElement)?.value || 0,
      ),
      premio_empate: Number(
        (document.getElementById('premio_empate') as HTMLInputElement)?.value || 0,
      ),
      premio_derrota: Number(
        (document.getElementById('premio_derrota') as HTMLInputElement)?.value || 0,
      ),
      premio_gol: Number((document.getElementById('premio_gol') as HTMLInputElement)?.value || 0),
      cartao_amarelo: Number(
        (document.getElementById('cartao_amarelo') as HTMLInputElement)?.value || 0,
      ),
      cartao_vermelho: Number(
        (document.getElementById('cartao_vermelho') as HTMLInputElement)?.value || 0,
      ),
      multa_wo: Number((document.getElementById('multa_wo') as HTMLInputElement)?.value || 0),
      mostrar_gols_artilharia:
        (document.getElementById('mostrar_gols_artilharia') as HTMLInputElement)?.checked ?? true,
      melhor_jogador_partida:
        (document.getElementById('melhor_jogador_partida') as HTMLInputElement)?.checked ?? true,
      pontos_vitoria: Number(
        (document.getElementById('pontos_vitoria') as HTMLInputElement)?.value || 3,
      ),
      pontos_empate: Number(
        (document.getElementById('pontos_empate') as HTMLInputElement)?.value || 1,
      ),
      pontos_derrota: Number(
        (document.getElementById('pontos_derrota') as HTMLInputElement)?.value || 0,
      ),
    };

    // Build type-specific settings:
    let typeSettings: TypeSettings = {};

    if (data.type === 'divisao') {
      typeSettings = {
        ida_volta:
          (document.getElementById('divisao_ida_volta') as HTMLInputElement)?.checked ?? true,
        qtd_acessos:
          parseInt(
            (document.getElementById('divisao_qtd_acessos') as HTMLInputElement)?.value || '0',
          ) || null,
        qtd_rebaixados:
          parseInt(
            (document.getElementById('divisao_qtd_rebaixados') as HTMLInputElement)?.value || '0',
          ) || null,
      };
    } else if (data.type === 'divisao_mata') {
      typeSettings = {
        qtd_classifica_para_mata:
          parseInt(
            (document.getElementById('dm_qtd_classifica') as HTMLInputElement)?.value || '0',
          ) || null,
        chave_automatica:
          (document.getElementById('dm_chave_automatica') as HTMLSelectElement)?.value ||
          'melhor_x_pior',
        criterio_mata_mata:
          (document.getElementById('dm_criterio') as HTMLSelectElement)?.value || 'saldo_gols',
        ida_volta: (document.getElementById('dm_ida_volta') as HTMLInputElement)?.checked ?? true,
        mata_em_ida_e_volta:
          (document.getElementById('dm_mata_ida_volta') as HTMLInputElement)?.checked ?? true,
        final_ida_volta:
          (document.getElementById('dm_final_ida_volta') as HTMLInputElement)?.checked ?? true,
        disputa_terceiro_quarto:
          (document.getElementById('dm_terceiro_quarto') as HTMLInputElement)?.checked ?? false,
      };
    } else if (data.type === 'copa_grupo') {
      typeSettings = {
        num_grupos:
          parseInt((document.getElementById('cg_num_grupos') as HTMLInputElement)?.value || '0') ||
          null,
        ida_volta: (document.getElementById('cg_ida_volta') as HTMLInputElement)?.checked ?? true,
      };
    } else if (data.type === 'copa_grupo_mata') {
      typeSettings = {
        num_grupos:
          parseInt((document.getElementById('cgm_num_grupos') as HTMLInputElement)?.value || '0') ||
          null,
        qtd_classifica_por_grupo:
          parseInt(
            (document.getElementById('cgm_qtd_classifica') as HTMLInputElement)?.value || '0',
          ) || null,
        chave_automatica:
          (document.getElementById('cgm_chave_automatica') as HTMLSelectElement)?.value ||
          'melhor_x_pior',
        criterio_mata_mata:
          (document.getElementById('cgm_criterio') as HTMLSelectElement)?.value || 'saldo_gols',
        ida_volta: (document.getElementById('cgm_ida_volta') as HTMLInputElement)?.checked ?? true,
        mata_em_ida_e_volta:
          (document.getElementById('cgm_mata_ida_volta') as HTMLInputElement)?.checked ?? true,
        final_ida_volta:
          (document.getElementById('cgm_final_ida_volta') as HTMLInputElement)?.checked ?? true,
        disputa_terceiro_quarto:
          (document.getElementById('cgm_terceiro_quarto') as HTMLInputElement)?.checked ?? false,
      };
    } else if (data.type === 'mata_mata') {
      typeSettings = {
        criterio_mata_mata:
          (document.getElementById('mm_criterio') as HTMLSelectElement)?.value || 'saldo_gols',
        mata_em_ida_e_volta:
          (document.getElementById('mm_mata_ida_volta') as HTMLInputElement)?.checked ?? true,
        final_ida_volta:
          (document.getElementById('mm_final_ida_volta') as HTMLInputElement)?.checked ?? true,
        disputa_terceiro_quarto:
          (document.getElementById('mm_terceiro_quarto') as HTMLInputElement)?.checked ?? false,
      };
    }

    const settings = {
      format: data.type,
      match_settings,
      specific: typeSettings,
    };

    try {
      const res = await fetch('/api/competitions/create-with-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          championship_id: championshipId,
          name: data.name,
          type: data.type,
          rules: data.rules,
          competition_url: data.competition_url || null,
          settings,
        }),
      });

      if (!res.ok) {
        console.error(await res.json());
        alert('Erro ao criar competição');
      } else {
        onOpenChange(false);
        reset();
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao criar competição');
    } finally {
      setLoading(false);
    }
  };

  // small helper to show type-specific UI
  const isType = (t: string) => selectedType === t;

  const [divisionCompetitions, setDivisionCompetitions] = useState<{ id: string; name: string }[]>(
    [],
  );

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('type', 'divisao')
        .eq('championship_id', championshipId);

      setDivisionCompetitions(data || []);
    };

    load();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Criar nova competição</DialogTitle>
          </DialogHeader>

          <AvatarPreview avatarPreview={watch('competition_url') ?? ''} />

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <div>
              <Label>Nome da competição</Label>
              <Input {...register('name')} placeholder="Ex: Série A" />
              {errors.name && <p className="text-sm text-red-500">{String(errors.name.message)}</p>}
            </div>

            <div>
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="divisao">Divisão</SelectItem>
                      <SelectItem value="divisao_mata">Divisão + Mata-mata</SelectItem>
                      <SelectItem value="copa_grupo">Copa com Grupos</SelectItem>
                      <SelectItem value="copa_grupo_mata">Copa com Grupos e Mata-mata</SelectItem>
                      <SelectItem value="mata_mata">Mata-mata</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>Regras (opcional)</Label>
              <Textarea {...register('rules')} placeholder="Descrição das regras..." />
            </div>

            <div>
              <Label>URL da competição (opcional)</Label>
              <Input {...register('competition_url')} placeholder="https://..." />
            </div>

            {/* CONFIGURAÇÕES DA PARTIDA */}
            <div className="mt-6 space-y-4 rounded-lg border p-4">
              <h3 className="text-lg font-semibold">Configurações da Partida (comuns)</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prêmio Vitória</Label>
                  <Input id="premio_vitoria" type="number" defaultValue={0} />
                </div>
                <div>
                  <Label>Prêmio Empate</Label>
                  <Input id="premio_empate" type="number" defaultValue={0} />
                </div>
                <div>
                  <Label>Prêmio Derrota</Label>
                  <Input id="premio_derrota" type="number" defaultValue={0} />
                </div>
                <div>
                  <Label>Prêmio Gol</Label>
                  <Input id="premio_gol" type="number" defaultValue={0} />
                </div>
                <div>
                  <Label>Cartão Amarelo</Label>
                  <Input id="cartao_amarelo" type="number" defaultValue={0} />
                </div>
                <div>
                  <Label>Cartão Vermelho</Label>
                  <Input id="cartao_vermelho" type="number" defaultValue={0} />
                </div>
                <div>
                  <Label>Multa WO</Label>
                  <Input id="multa_wo" type="number" defaultValue={0} />
                </div>

                <div className="flex items-center space-x-3">
                  <Label>Mostrar gols na artilharia</Label>
                  <input id="mostrar_gols_artilharia" type="checkbox" defaultChecked />
                </div>

                <div className="flex items-center space-x-3">
                  <Label>Melhor jogador da partida</Label>
                  <input id="melhor_jogador_partida" type="checkbox" defaultChecked />
                </div>

                <div>
                  <Label>Pontos - Vitória</Label>
                  <Input id="pontos_vitoria" type="number" defaultValue={3} />
                </div>
                <div>
                  <Label>Pontos - Empate</Label>
                  <Input id="pontos_empate" type="number" defaultValue={1} />
                </div>
                <div>
                  <Label>Pontos - Derrota</Label>
                  <Input id="pontos_derrota" type="number" defaultValue={0} />
                </div>
              </div>
            </div>

            {/* ======================== */}
            {/* SEÇÕES DO TIPO SELECIONADO */}
            {/* ======================== */}

            {isType('divisao') && (
              <div className="mt-6 space-y-4 rounded-lg border p-4">
                <h3 className="text-lg font-semibold">Configurações — Divisão</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-3">
                    <Label>Ida e volta?</Label>
                    <input id="divisao_ida_volta" type="checkbox" defaultChecked />
                  </div>

                  <div>
                    <Label>Qtd. acessos</Label>
                    <Input {...register('divisionSettings.qtd_acessos')} type="number" />
                  </div>

                  <div>
                    <Label>Qtd. rebaixados</Label>
                    <Input {...register('divisionSettings.qtd_rebaixados')} type="number" />
                  </div>

                  {Number(qtdRebaixados) > 0 && (
                    <div>
                      <Label>Divisão de rebaixamento</Label>
                      <Controller
                        control={control}
                        name="divisionSettings.divisao_rebaixamento_competition_id"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a divisão" />
                            </SelectTrigger>
                            <SelectContent>
                              {divisionCompetitions.length === 0 && (
                                <SelectItem disabled value="none">
                                  Nenhuma divisão encontrada
                                </SelectItem>
                              )}

                              {divisionCompetitions.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}

                  {Number(qtdAcessos) > 0 && (
                    <div>
                      <Label>Divisão de Acesso</Label>
                      <Controller
                        control={control}
                        name="divisionSettings.divisao_acesso_competition_id"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a divisão" />
                            </SelectTrigger>
                            <SelectContent>
                              {divisionCompetitions.length === 0 && (
                                <SelectItem disabled value="none">
                                  Nenhuma divisão encontrada
                                </SelectItem>
                              )}

                              {divisionCompetitions.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {isType('divisao_mata') && (
              <div className="mt-6 space-y-4 rounded-lg border p-4">
                <h3 className="text-lg font-semibold">Configurações — Divisão + Mata-mata</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Qtde. que classifica</Label>
                    <Input id="dm_qtd_classifica" type="number" />
                  </div>

                  <div>
                    <Label>Chave automática</Label>
                    <select id="dm_chave_automatica" className="w-full rounded border p-2">
                      <option value="melhor_x_pior">Melhor x Pior</option>
                      <option value="aleatorio">Aleatório</option>
                    </select>
                  </div>

                  <div>
                    <Label>Critério</Label>
                    <select id="dm_criterio" className="w-full rounded border p-2">
                      <option value="saldo_gols">Saldo de gols</option>
                      <option value="gol_fora">Gol fora</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>Ida e volta?</Label>
                    <input id="dm_ida_volta" type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>Mata ida e volta?</Label>
                    <input id="dm_mata_ida_volta" type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>Final ida e volta?</Label>
                    <input id="dm_final_ida_volta" type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>3º/4º?</Label>
                    <input id="dm_terceiro_quarto" type="checkbox" />
                  </div>
                </div>
              </div>
            )}

            {isType('copa_grupo') && (
              <div className="mt-6 space-y-4 rounded-lg border p-4">
                <h3 className="text-lg font-semibold">Configurações — Copa Grupo</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>N° de grupos</Label>
                    <Input id="cg_num_grupos" type="number" />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>Ida e volta?</Label>
                    <input id="cg_ida_volta" type="checkbox" defaultChecked />
                  </div>
                </div>
              </div>
            )}

            {isType('copa_grupo_mata') && (
              <div className="mt-6 space-y-4 rounded-lg border p-4">
                <h3 className="text-lg font-semibold">Configurações — Copa Grupo + Mata-mata</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>N° de grupos</Label>
                    <Input id="cgm_num_grupos" type="number" />
                  </div>

                  <div>
                    <Label>Qtde. por grupo</Label>
                    <Input id="cgm_qtd_classifica" type="number" />
                  </div>

                  <div>
                    <Label>Chave automática</Label>
                    <select id="cgm_chave_automatica" className="w-full rounded border p-2">
                      <option value="melhor_x_pior">Melhor x Pior</option>
                      <option value="aleatorio">Aleatório</option>
                    </select>
                  </div>

                  <div>
                    <Label>Critério</Label>
                    <select id="cgm_criterio" className="w-full rounded border p-2">
                      <option value="saldo_gols">Saldo de gols</option>
                      <option value="gol_fora">Gol fora</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>Ida e volta?</Label>
                    <input id="cgm_ida_volta" type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>Mata ida e volta?</Label>
                    <input id="cgm_mata_ida_volta" type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>Final ida e volta?</Label>
                    <input id="cgm_final_ida_volta" type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>3º/4º?</Label>
                    <input id="cgm_terceiro_quarto" type="checkbox" />
                  </div>
                </div>
              </div>
            )}

            {isType('mata_mata') && (
              <div className="mt-6 space-y-4 rounded-lg border p-4">
                <h3 className="text-lg font-semibold">Configurações — Mata-mata</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Critério</Label>
                    <select id="mm_criterio" className="w-full rounded border p-2">
                      <option value="saldo_gols">Saldo de gols</option>
                      <option value="gol_fora">Gol fora</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>Mata ida e volta?</Label>
                    <input id="mm_mata_ida_volta" type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>Final ida e volta?</Label>
                    <input id="mm_final_ida_volta" type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Label>3º/4º?</Label>
                    <input id="mm_terceiro_quarto" type="checkbox" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar competição'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
