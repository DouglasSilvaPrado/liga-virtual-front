export type PlayerRow = {
  id: number; // players.id (bigint identity)
  name: string | null;
  rating: number | null;
  position: string | null;
  price: string | null; // hoje é text no seu schema
  nation_img: string | null;
  club_img: string | null;

  // “time do jogador” (origem) vem do market (ver schema abaixo),
  // mas enquanto isso você pode exibir "—" se não tiver.
  current_team_name?: string | null;
};

export type MarketFilters = {
  search: string;
  position: string; // ex: "ST", "CM" etc
  nationality: string; // aqui pode ser “nation_img” ou um código se você tiver
  minOverall?: number;
  maxOverall?: number;
  priceMin?: number;
  priceMax?: number;
  sortBy: 'rating' | 'price' | 'name';
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
};
