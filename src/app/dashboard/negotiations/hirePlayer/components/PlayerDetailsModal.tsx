'use client';

import { useEffect, useMemo, useState } from 'react';

export type PlayerDetails = {
  id: number;
  player_id: number | null;
  name: string | null;
  player_img: string | null;
  nation_img: string | null;
  league_img: string | null;
  club_img: string | null;
  rating: number | null;
  position: string | null;
  price: string | null;
  foot: string | null;
  skills: number | null;
  weak_foot: number | null;

  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  physical: number | null;

  pop: number | null;
  igs: number | null;
  height: string | null;
  accelerate: string | null;
  age: number | null;
  weight: string | null;

  acceleration: number | null;
  sprint_speed: number | null;
  att_position: number | null;
  finishing: number | null;
  shot_power: number | null;
  long_shots: number | null;
  volleys: number | null;
  penalties: number | null;

  vision: number | null;
  crossing: number | null;
  freekick_accuracy: number | null;
  short_passing: number | null;
  long_passing: number | null;
  curve: number | null;

  agility: number | null;
  balance: number | null;
  reactions: number | null;
  ball_control: number | null;
  composure: number | null;

  interceptions: number | null;
  heading_accuracy: number | null;
  marking: number | null;
  standing_tackle: number | null;
  sliding_tackle: number | null;

  jumping: number | null;
  stamina: number | null;
  strength: number | null;
  aggression: number | null;

  price_value: number | null;
};

type Props = {
  open: boolean;
  playerId: number | null;
  onClose: () => void;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function statTone(v: number | null | undefined) {
  if (v == null) return { pill: 'bg-white/10 border-white/15 text-white/80', bar: 'bg-white/20' };
  if (v >= 85) return { pill: 'bg-emerald-400/15 border-emerald-300/30 text-emerald-100', bar: 'bg-emerald-400/60' };
  if (v >= 75) return { pill: 'bg-amber-400/15 border-amber-300/30 text-amber-100', bar: 'bg-amber-400/60' };
  return { pill: 'bg-rose-400/15 border-rose-300/30 text-rose-100', bar: 'bg-rose-400/60' };
}

function futTier(rating: number | null | undefined) {
  const r = rating ?? 0;
  if (r >= 90) return { name: 'ÍCONE', ring: 'ring-yellow-400/40', glow: 'shadow-yellow-400/20' };
  if (r >= 85) return { name: 'ELITE', ring: 'ring-emerald-400/35', glow: 'shadow-emerald-400/20' };
  if (r >= 80) return { name: 'OURO', ring: 'ring-amber-400/35', glow: 'shadow-amber-400/20' };
  if (r >= 75) return { name: 'PRATA', ring: 'ring-slate-300/25', glow: 'shadow-slate-300/10' };
  return { name: 'BRONZE', ring: 'ring-orange-400/25', glow: 'shadow-orange-400/10' };
}

function traduzirPe(foot?: string | null) {
  if (!foot) return '—';
  const f = foot.toLowerCase();
  if (f.includes('left') || f.includes('esquer')) return 'Esquerdo';
  if (f.includes('right') || f.includes('dire')) return 'Direito';
  if (f.includes('strong')) return 'Forte';
  return foot;
}

function BarStat({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const v = value ?? null;
  const pct = v == null ? 0 : clamp(v, 0, 99);
  const tone = statTone(v);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold tracking-wide text-white/70">{label}</div>
        <div className={`rounded-md border px-2 py-0.5 text-xs font-bold ${tone.pill}`}>
          {v ?? '—'}
        </div>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full ${tone.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FutMainStat({
  abbr,
  label,
  value,
}: {
  abbr: string;
  label: string;
  value: number | null | undefined;
}) {
  const v = value ?? null;
  const tone = statTone(v);

  return (
    <div className={`rounded-xl border px-3 py-3 ${tone.pill}`}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-extrabold tracking-widest text-white/70">{abbr}</div>
        <div className="text-xl font-black">{v ?? '—'}</div>
      </div>
      <div className="mt-1 text-[11px] font-medium text-white/70">{label}</div>
    </div>
  );
}

export default function PlayerDetailsModal({ open, playerId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PlayerDetails | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || playerId == null) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setDetails(null);
      setErr(null);

      try {
        const res = await fetch(`/api/players/${playerId}`);
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error ?? `http_${res.status}`);
        }
        const data = (await res.json()) as PlayerDetails;
        if (!cancelled) setDetails(data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'erro_desconhecido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, playerId]);

  const tier = useMemo(() => futTier(details?.rating), [details?.rating]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Container */}
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-white/90">Detalhes do Jogador</div>
            {details?.rating != null ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/70">
                {tier.name}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/80 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Body com scroll */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-sm text-white/70">Carregando...</div>
          ) : err ? (
            <div className="p-6">
              <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                Erro ao carregar detalhes: {err}
              </div>
            </div>
          ) : details ? (
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
              {/* CARD FUT (esquerda) */}
              <div className="lg:col-span-1">
                <div
                  className={[
                    'relative overflow-hidden rounded-2xl border border-white/10',
                    'bg-gradient-to-b from-white/10 via-white/5 to-transparent',
                    'ring-1',
                    tier.ring,
                    tier.glow,
                  ].join(' ')}
                >
                  {/* brilho */}
                  <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                  <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

                  <div className="p-4">
                    {/* topo: OVR + POS */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="text-4xl font-black tracking-tight text-white">
                          {details.rating ?? '—'}
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-white/80">
                            {details.position ?? '—'}
                          </span>
                          <span className="text-xs text-white/60">ID {details.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {details.nation_img ? (
                          <img src={details.nation_img} alt="" className="h-6 w-8 object-contain" />
                        ) : null}
                        {details.club_img ? (
                          <img src={details.club_img} alt="" className="h-7 w-7 object-contain" />
                        ) : null}
                      </div>
                    </div>

                    {/* nome */}
                    <div className="mt-3">
                      <div className="truncate text-lg font-extrabold tracking-wide text-white">
                        {details.name ?? '—'}
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        {details.league_img ? (
                          <span className="inline-flex items-center gap-2">
                            <img src={details.league_img} alt="" className="h-5 w-8 object-contain" />
                            <span>Liga</span>
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>

                    {/* imagem do player */}
                    <div className="mt-4 flex justify-center">
                      {details.player_img ? (
                        <img
                          src={details.player_img}
                          alt=""
                          className="h-40 w-40 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)]"
                        />
                      ) : (
                        <div className="h-40 w-40 rounded-2xl bg-white/5" />
                      )}
                    </div>

                    {/* infos rápidas */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[10px] font-semibold tracking-widest text-white/60">
                          PÉ
                        </div>
                        <div className="mt-1 text-sm font-bold text-white/90">
                          {traduzirPe(details.foot)}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[10px] font-semibold tracking-widest text-white/60">
                          HABS / PÉ FRACO
                        </div>
                        <div className="mt-1 text-sm font-bold text-white/90">
                          {details.skills ?? '—'}★ / {details.weak_foot ?? '—'}★
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[10px] font-semibold tracking-widest text-white/60">
                          ALTURA
                        </div>
                        <div className="mt-1 text-sm font-bold text-white/90">
                          {details.height ?? '—'}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[10px] font-semibold tracking-widest text-white/60">
                          PESO
                        </div>
                        <div className="mt-1 text-sm font-bold text-white/90">
                          {details.weight ?? '—'}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[10px] font-semibold tracking-widest text-white/60">
                          IDADE
                        </div>
                        <div className="mt-1 text-sm font-bold text-white/90">
                          {details.age ?? '—'}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[10px] font-semibold tracking-widest text-white/60">
                          ACELERAÇÃO
                        </div>
                        <div className="mt-1 text-sm font-bold text-white/90">
                          {details.accelerate ?? '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DIREITA: STATS FIFA */}
              <div className="lg:col-span-2 space-y-4">
                {/* 6 stats principais FIFA */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-white/90">Atributos Principais</div>
                    <div className="text-xs text-white/60">Escala 0–99</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <FutMainStat abbr="PAC" label="Velocidade" value={details.pace} />
                    <FutMainStat abbr="SHO" label="Finalização" value={details.shooting} />
                    <FutMainStat abbr="PAS" label="Passe" value={details.passing} />
                    <FutMainStat abbr="DRI" label="Drible" value={details.dribbling} />
                    <FutMainStat abbr="DEF" label="Defesa" value={details.defending} />
                    <FutMainStat abbr="PHY" label="Físico" value={details.physical} />
                  </div>
                </div>

                {/* Subatributos em barras */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold text-white/90">Velocidade</div>
                    <div className="space-y-2">
                      <BarStat label="Aceleração" value={details.acceleration} />
                      <BarStat label="Velocidade Máxima" value={details.sprint_speed} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold text-white/90">Finalização</div>
                    <div className="space-y-2">
                      <BarStat label="Posicionamento" value={details.att_position} />
                      <BarStat label="Finalização" value={details.finishing} />
                      <BarStat label="Força do Chute" value={details.shot_power} />
                      <BarStat label="Chute de Longe" value={details.long_shots} />
                      <BarStat label="Voleios" value={details.volleys} />
                      <BarStat label="Pênaltis" value={details.penalties} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold text-white/90">Passe</div>
                    <div className="space-y-2">
                      <BarStat label="Visão" value={details.vision} />
                      <BarStat label="Cruzamento" value={details.crossing} />
                      <BarStat label="Precisão em Faltas" value={details.freekick_accuracy} />
                      <BarStat label="Passe Curto" value={details.short_passing} />
                      <BarStat label="Passe Longo" value={details.long_passing} />
                      <BarStat label="Curva" value={details.curve} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold text-white/90">Drible</div>
                    <div className="space-y-2">
                      <BarStat label="Agilidade" value={details.agility} />
                      <BarStat label="Equilíbrio" value={details.balance} />
                      <BarStat label="Reação" value={details.reactions} />
                      <BarStat label="Controle de Bola" value={details.ball_control} />
                      <BarStat label="Compostura" value={details.composure} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold text-white/90">Defesa</div>
                    <div className="space-y-2">
                      <BarStat label="Interceptações" value={details.interceptions} />
                      <BarStat label="Cabeceio" value={details.heading_accuracy} />
                      <BarStat label="Marcação" value={details.marking} />
                      <BarStat label="Desarme em Pé" value={details.standing_tackle} />
                      <BarStat label="Carrinho" value={details.sliding_tackle} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold text-white/90">Físico</div>
                    <div className="space-y-2">
                      <BarStat label="Impulsão" value={details.jumping} />
                      <BarStat label="Fôlego" value={details.stamina} />
                      <BarStat label="Força" value={details.strength} />
                      <BarStat label="Agressividade" value={details.aggression} />
                    </div>
                  </div>
                </div>

                {/* Rodapé com “meta” */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[10px] font-semibold tracking-widest text-white/60">POP</div>
                      <div className="mt-1 text-sm font-bold text-white/90">{details.pop ?? '—'}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[10px] font-semibold tracking-widest text-white/60">IGS</div>
                      <div className="mt-1 text-sm font-bold text-white/90">{details.igs ?? '—'}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[10px] font-semibold tracking-widest text-white/60">PREÇO</div>
                      <div className="mt-1 text-sm font-bold text-white/90">{details.price ?? '—'}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[10px] font-semibold tracking-widest text-white/60">VALOR</div>
                      <div className="mt-1 text-sm font-bold text-white/90">
                        {details.price_value ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-white/70">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
