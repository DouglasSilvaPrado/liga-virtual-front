// components/CupActions.tsx
"use client";

import { Button } from "@/components/ui/button";

export default function CupActions({
  competitionId,
}: {
  competitionId: string;
}) {
  return (
    <div className="flex gap-2">
      <Button variant="secondary">
        Ver Times
      </Button>

      <Button variant="secondary">
        Ver Grupos
      </Button>

      <Button variant="secondary">
        Jogos
      </Button>

      <Button className="bg-green-600 text-white hover:bg-green-700">
        Gerar Mata-mata
      </Button>
    </div>
  );
}
