// components/CupHeader.tsx
export default function CupHeader({ cup }: any) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{cup.name}</h1>

      <p className="text-sm text-muted-foreground">
        Campeonato: {cup.championships?.name}
      </p>
    </div>
  );
}