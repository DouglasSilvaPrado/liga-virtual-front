"use client";

import { Championship } from '@/@types/championship';
import ChampionshipCard from "./ChampionshipCard";

interface Props {
  championships: Championship[];
}

export default function ChampionshipList({ championships }: Props) {
  if (!championships.length) {
    return (
      <p className="text-muted-foreground">
        Nenhum campeonato encontrado.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {championships.map((champ) => (
        <ChampionshipCard key={champ.id} champ={champ} />
      ))}
    </div>
  );
}
