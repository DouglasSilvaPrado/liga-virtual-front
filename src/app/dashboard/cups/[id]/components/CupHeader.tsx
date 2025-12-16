interface Props {
  cup: {
    name: string;
    type: string;
    championships?: { name: string };
  };
}

export default function CupHeader({ cup }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{cup.name}</h1>
      <p className="text-sm text-muted-foreground">
        Campeonato: {cup.championships?.name ?? '—'}
      </p>
      <p className="text-sm">
        Tipo:{' '}
        {cup.type === 'mata_mata'
          ? 'Mata-mata'
          : 'Grupos + Mata-mata'}
      </p>
    </div>
  );
}
