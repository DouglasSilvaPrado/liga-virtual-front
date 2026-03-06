import { createServerSupabase } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CompetitionWithSettings } from '@/@types/competition';
import CreateCompetitionButton from './components/CreateCompetitionButton';
import EditCompetitionButton from './components/EditCompetitionButton';
import DeleteCompetitionButton from './components/DeleteCompetitionButton';
import CompetitionTrophiesButton from './components/CompetitionTrophiesButton';
import CloseSeasonButton from './components/CloseSeasonButton';

type TenantMemberRow = {
  id: string;
  role: 'owner' | 'admin' | 'member' | null;
};

export default async function ChampionshipCompetitionsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const championshipId = id;

  const { supabase, tenantId } = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Busca o membership do usuário no tenant atual
  const { data: tenantMember } = await supabase
    .from('tenant_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single<TenantMemberRow>();

  const role = tenantMember?.role;

  // Só admin e owner podem acessar a página
  if (role !== 'owner' && role !== 'admin') {
    // return notFound();
    return redirect('/dashboard');
  }

  // Buscar championship
  const { data: championship } = await supabase
    .from('championships')
    .select('*')
    .eq('id', championshipId)
    .eq('tenant_id', tenantId)
    .single();

  if (!championship) return notFound();

  // Buscar competitions
  const { data: competitions } = await supabase
    .from('competitions_with_settings')
    .select('*')
    .eq('championship_id', championshipId)
    .order('created_at', { ascending: false });

  const canManageChampionship = role === 'owner' || role === 'admin';

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Competições – {championship.name}</h1>

      {canManageChampionship && (
        <>
          <CloseSeasonButton championshipId={championshipId} currentSeason={championship.season} />

          <CreateCompetitionButton championshipId={championshipId} />
        </>
      )}

      <CreateCompetitionButton championshipId={championshipId} />

      {!competitions?.length ? (
        <p className="text-muted-foreground">Nenhuma competição cadastrada.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitions.map((comp: CompetitionWithSettings) => (
            <Card key={comp.id} className="rounded-xl shadow-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-row items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={comp.competition_url || undefined} />
                    <AvatarFallback>{comp.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="font-medium">{comp.name}</p>
                    <Badge variant="outline">{comp.type}</Badge>

                    <p className="text-muted-foreground mt-1 text-xs">
                      Criado em: {new Date(comp.created_at!).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {canManageChampionship && (
                  <div className="flex shrink-0 flex-row items-center space-x-2">
                    <EditCompetitionButton competition={comp} />
                    <DeleteCompetitionButton competitionId={comp.id} />
                    <CompetitionTrophiesButton
                      championshipId={championshipId}
                      competitionId={comp.id}
                    />
                  </div>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
