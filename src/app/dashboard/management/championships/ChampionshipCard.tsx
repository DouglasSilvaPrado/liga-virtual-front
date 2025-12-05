"use client";

import { Championship } from '@/@types/championship';
import Link from "next/link";

interface Props {
  champ: Championship;
}

export default function ChampionshipCard({ champ }: Props) {
  return (
    <Link href={`/dashboard/management/championships/${champ.id}/competitions`}>
      <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer">
        <h3 className="font-semibold text-lg">{champ.name}</h3>

        <p className="text-sm text-muted-foreground">
          Temporada: {champ.season}
        </p>

        <p className="text-xs text-muted-foreground mt-2">
          Criado em: {new Date(champ.created_at).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </Link>
  );
}