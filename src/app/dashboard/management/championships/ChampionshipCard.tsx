'use client';

import { Championship } from '@/@types/championship';
import Link from 'next/link';

interface Props {
  champ: Championship;
}

export default function ChampionshipCard({ champ }: Props) {
  return (
    <Link href={`/dashboard/management/championships/${champ.id}/competitions`}>
      <div className="cursor-pointer rounded-lg border p-4 shadow-sm transition hover:shadow-md">
        <h3 className="text-lg font-semibold">{champ.name}</h3>

        <p className="text-muted-foreground text-sm">Temporada: {champ.season}</p>

        <p className="text-muted-foreground mt-2 text-xs">
          Criado em: {new Date(champ.created_at).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </Link>
  );
}
