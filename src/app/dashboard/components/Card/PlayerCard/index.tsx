'use client';

type Tier = 'gold' | 'silver' | 'bronze';

export type PlayerCardData = {
  name: string | null;
  rating: number | null;
  position: string | null;

  player_img: string | null;
  nation_img: string | null;
  club_img: string | null;
};

type Props = {
  player: PlayerCardData;

  /** Opcional: para usar em grid/tabela sem quebrar layout */
  className?: string;

  /** Opcional: tamanho padrão igual ao seu (112x160). Pode sobrescrever. */
  size?: {
    w: number; // ex: 112
    h: number; // ex: 160
  };

  /** Opcional: acessibilidade */
  title?: string;
  showPlayerName?: boolean;
  showOverall?: boolean;
  showMiniImage?: boolean;
};

function badgePos(pos: string | null) {
  const p = (pos ?? '').toUpperCase().trim();
  return p || '—';
}

function getTier(rating: number | null): Tier {
  const r = typeof rating === 'number' ? rating : 0;
  if (r >= 75) return 'gold';
  if (r >= 65) return 'silver';
  return 'bronze';
}

function tierAsset(tier: Tier) {
  if (tier === 'gold') return '/image/goldCard.png';
  if (tier === 'silver') return '/image/silverCard.png';
  return '/image/bronzeCard.png';
}

function tierColors(tier: Tier) {
  switch (tier) {
    case 'gold':
      return {
        shadow: 'shadow-[0_10px_18px_-14px_rgba(0,0,0,0.55)]',
      };
    case 'silver':
      return {
        shadow: 'shadow-[0_10px_18px_-14px_rgba(0,0,0,0.55)]',
      };
    case 'bronze':
    default:
      return {
        shadow: 'shadow-[0_10px_18px_-14px_rgba(0,0,0,0.55)]',
      };
  }
}

export default function PlayerCard({
  player,
  className,
  size = { w: 112, h: 160 },
  title,
  showPlayerName = true,
  showOverall = true,
  showMiniImage = false,
}: Props) {
  const tier = getTier(player.rating);
  const bg = tierAsset(tier);
  const c = tierColors(tier);

  const ratingText = player.rating ?? '—';
  const posText = badgePos(player.position);

  const name = (player.name ?? '—').trim();
  const shortName = name.length > 14 ? name.slice(0, 13) + '…' : name;

  return (
    <div
      className={['relative select-none', c.shadow, className ?? ''].join(' ')}
      style={{
        width: size.w,
        height: size.h,
        backgroundImage: `url(${bg})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
      title={title ?? name}
      aria-label={title ?? name}
    >
      {/* rating + pos (coluna esquerda) */}
      {showOverall && (
        <div className="absolute top-[25%] left-[17%] leading-none">
          <div className="text-sm font-bold text-gray-700">{ratingText}</div>
          <div className="text-[11px] font-black tracking-tight text-gray-700">{posText}</div>
        </div>
      )}

      {/* nation + club (topo direito) */}
      {!showMiniImage && (
        <div className="absolute top-[25%] right-[17%] flex flex-col items-end gap-[4px]">
          {player.nation_img ? (
            <img
              src={player.nation_img}
              alt=""
              className="h-[14px] w-[14px] object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}

          {player.club_img ? (
            <img
              src={player.club_img}
              alt=""
              className="h-[14px] w-[14px] object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}
        </div>
      )}

      {/* player image */}
      {!showMiniImage && (
        <div className="absolute top-[34px] left-1/2 -translate-x-1/2">
          {player.player_img ? (
            <img
              src={player.player_img}
              alt=""
              className="h-[78px] w-[78px] object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-[78px] w-[78px] rounded bg-black/10" />
          )}
        </div>
      )}

      {/* player mini image */}
      {showMiniImage && (
        <div className="absolute top-[24%] right-[-8%] -translate-x-1/2">
          {player.player_img ? (
            <img
              src={player.player_img}
              alt=""
              className="h-[32px] w-[32px] object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-[78px] w-[78px] rounded bg-black/10" />
          )}
        </div>
      )}

      {/* nome */}
      {showPlayerName && (
        <div className="absolute right-[10px] bottom-[40px] left-[10px] text-center">
          <div className="truncate text-[11px] font-black tracking-tight text-gray-700">
            {shortName}
          </div>
        </div>
      )}

      {/* nation + club (embaixo) */}
      {showMiniImage && (
        <div className="absolute right-[25%] bottom-[19%] flex flex-row items-end gap-[4px]">
          {player.nation_img ? (
            <img
              src={player.nation_img}
              alt=""
              className="h-[10px] w-[10px] object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}

          {player.club_img ? (
            <img
              src={player.club_img}
              alt=""
              className="h-[10px] w-[10px] object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
