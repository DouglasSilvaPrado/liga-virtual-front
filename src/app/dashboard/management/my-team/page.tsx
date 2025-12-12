// src/app/dashboard/management/my-team/page.tsx
import { createServerSupabase } from "@/lib/supabaseServer";
import CreateTeamModal from './components/CreateTeamModal';
import { Team } from '@/@types/team';

export default async function MyTeamPage() {
  const { supabase, tenantId } = await createServerSupabase();

  // Usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-red-500">Você não está autenticado.</p>
      </div>
    );
  }

  // Buscar tenant_member
  const { data: tenantMember, error: memberError } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();

  if (memberError) {
    console.error("Erro buscando tenant_member:", memberError);
  }

  // Buscar time do usuário
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("tenant_member_id", tenantMember?.id)
    .maybeSingle<Team>();


    // TODO: Adicionar um seletor para o user selecionar championship se tiver mais de 1
    const { data: championship } = await supabase
    .from("championships")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();



  const hasTeam = !!team;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meu time</h1>
      </div>

      {!hasTeam && (
        <div className="mt-6">
          <CreateTeamModal
            tenantId={tenantId}
            tenantMemberId={tenantMember?.id}
            championshipId ={championship?.id}
          />
        </div>
      )}

      {hasTeam && (
        <div className="mt-6 p-4 border rounded-xl bg-muted/40 space-y-2">
          <h2 className="text-xl font-semibold">Seu time</h2>
          <p><strong>Nome:</strong> {team.name}</p>
          <p><strong>Escudo:</strong> {team.shield_id}</p>
          <p><strong>Campeonato:</strong> {team.championship_id}</p>

          {/* depois podemos adicionar botão Editar */}
        </div>
      )}
    </div>
  );
}
