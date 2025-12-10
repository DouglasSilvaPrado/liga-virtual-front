import { createServerSupabase } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import TrophiesManager from './components/TrophiesManager';


export default async function CompetitionTrophiesPage(props: { params: Promise<{ id: string; competitionId: string }> }) {
  const { id, competitionId } = await props.params;

  const { supabase, tenantId } = await createServerSupabase();

  const { data: competition } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", competitionId) 
    .eq("tenant_id", tenantId)
    .single();



  if (!competition) return notFound();


  return <TrophiesManager competitionId={id} />;
}