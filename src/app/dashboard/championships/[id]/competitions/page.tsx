import { createServerSupabase } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";

export default async function ChampionshipCompetitionsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const championshipId = id;

  const { supabase, tenantId } = await createServerSupabase();

  // Buscar championship
  const { data: championship } = await supabase
    .from("championships")
    .select("*")
    .eq("id", championshipId)
    .eq("tenant_id", tenantId)
    .single();

  if (!championship) return notFound();

  // Buscar competitions
  const { data: competitions } = await supabase
    .from("competitions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("championship_id", championshipId)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Competições – {championship.name}</h1>

      {!competitions?.length ? (
        <p className="text-muted-foreground">Nenhuma competição cadastrada.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitions.map((comp) => (
            <div
              key={comp.id}
              className="border rounded-lg p-4 shadow-sm hover:shadow-md"
            >
              <h3 className="font-semibold text-lg">{comp.name}</h3>
              <p className="text-sm text-muted-foreground">Tipo: {comp.type}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Criado em: {new Date(comp.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

