'use client';

import { useEffect, useState } from 'react';

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

function statColorClass(v: number | null | undefined) {
  if (v == null) return 'bg-gray-100 text-gray-700 border-gray-200';
  if (v >= 80) return 'bg-green-100 text-green-700 border-green-200';
  if (v >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function StatPill({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex items-center justify-between rounded border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`rounded border px-2 py-0.5 font-semibold ${statColorClass(value)}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-1 inline-flex rounded border px-3 py-1 text-lg font-bold ${statColorClass(
          value,
        )}`}
      >
        {value ?? '—'}
      </div>
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
        const res = await fetch(`/api/players/${playerId}`, { method: 'GET' });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error ?? `http_${res.status}`);
        }
        const data = (await res.json()) as PlayerDetails;
        if (!cancelled) setDetails(data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'unknown_error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, playerId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* ✅ agora o modal não estoura a tela e vira scroll dentro */}
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-lg">
        {/* header fixo */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">Detalhes do jogador</div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* ✅ corpo com scroll quando necessário */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : err ? (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar detalhes: {err}
            </div>
          ) : details ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1 rounded border p-4">
                <div className="flex items-center gap-4">
                  {details.player_img ? <img src={details.player_img} alt="" className="h-20 w-20" /> : null}

                  <div className="min-w-0">
                    <div className="text-lg font-bold truncate">{details.name ?? '—'}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-black">{details.position ?? '—'}</span>
                      <span>•</span>
                      <span>Overall {details.rating ?? '—'}</span>
                      <span>•</span>
                      <span>ID {details.id}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {details.nation_img ? (
                        <img src={details.nation_img} alt="" className="h-5 w-7 object-contain" />
                      ) : null}
                      {details.league_img ? (
                        <img src={details.league_img} alt="" className="h-5 w-7 object-contain" />
                      ) : null}
                      {details.club_img ? (
                        <img src={details.club_img} alt="" className="h-6 w-6 object-contain" />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded border px-3 py-2">
                    <div className="text-xs text-muted-foreground">Pé</div>
                    <div className="font-medium">{details.foot ?? '—'}</div>
                  </div>
                  <div className="rounded border px-3 py-2">
                    <div className="text-xs text-muted-foreground">Skills / WF</div>
                    <div className="font-medium">
                      {details.skills ?? '—'}★ / {details.weak_foot ?? '—'}★
                    </div>
                  </div>
                  <div className="rounded border px-3 py-2">
                    <div className="text-xs text-muted-foreground">Altura</div>
                    <div className="font-medium">{details.height ?? '—'}</div>
                  </div>
                  <div className="rounded border px-3 py-2">
                    <div className="text-xs text-muted-foreground">Peso</div>
                    <div className="font-medium">{details.weight ?? '—'}</div>
                  </div>
                  <div className="rounded border px-3 py-2">
                    <div className="text-xs text-muted-foreground">Idade</div>
                    <div className="font-medium">{details.age ?? '—'}</div>
                  </div>
                  <div className="rounded border px-3 py-2">
                    <div className="text-xs text-muted-foreground">Aceleração</div>
                    <div className="font-medium">{details.accelerate ?? '—'}</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <BigStat label="PAC" value={details.pace} />
                  <BigStat label="SHO" value={details.shooting} />
                  <BigStat label="PAS" value={details.passing} />
                  <BigStat label="DRI" value={details.dribbling} />
                  <BigStat label="DEF" value={details.defending} />
                  <BigStat label="PHY" value={details.physical} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 rounded border p-4">
                    <div className="font-semibold text-sm">Pace</div>
                    <StatPill label="Acceleration" value={details.acceleration} />
                    <StatPill label="Sprint Speed" value={details.sprint_speed} />
                  </div>

                  <div className="space-y-2 rounded border p-4">
                    <div className="font-semibold text-sm">Shooting</div>
                    <StatPill label="Positioning" value={details.att_position} />
                    <StatPill label="Finishing" value={details.finishing} />
                    <StatPill label="Shot Power" value={details.shot_power} />
                    <StatPill label="Long Shots" value={details.long_shots} />
                    <StatPill label="Volleys" value={details.volleys} />
                    <StatPill label="Penalties" value={details.penalties} />
                  </div>

                  <div className="space-y-2 rounded border p-4">
                    <div className="font-semibold text-sm">Passing</div>
                    <StatPill label="Vision" value={details.vision} />
                    <StatPill label="Crossing" value={details.crossing} />
                    <StatPill label="FK Accuracy" value={details.freekick_accuracy} />
                    <StatPill label="Short Passing" value={details.short_passing} />
                    <StatPill label="Long Passing" value={details.long_passing} />
                    <StatPill label="Curve" value={details.curve} />
                  </div>

                  <div className="space-y-2 rounded border p-4">
                    <div className="font-semibold text-sm">Dribbling</div>
                    <StatPill label="Agility" value={details.agility} />
                    <StatPill label="Balance" value={details.balance} />
                    <StatPill label="Reactions" value={details.reactions} />
                    <StatPill label="Ball Control" value={details.ball_control} />
                    <StatPill label="Composure" value={details.composure} />
                  </div>

                  <div className="space-y-2 rounded border p-4">
                    <div className="font-semibold text-sm">Defending</div>
                    <StatPill label="Interceptions" value={details.interceptions} />
                    <StatPill label="Heading" value={details.heading_accuracy} />
                    <StatPill label="Marking" value={details.marking} />
                    <StatPill label="Standing Tackle" value={details.standing_tackle} />
                    <StatPill label="Sliding Tackle" value={details.sliding_tackle} />
                  </div>

                  <div className="space-y-2 rounded border p-4">
                    <div className="font-semibold text-sm">Physical</div>
                    <StatPill label="Jumping" value={details.jumping} />
                    <StatPill label="Stamina" value={details.stamina} />
                    <StatPill label="Strength" value={details.strength} />
                    <StatPill label="Aggression" value={details.aggression} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
