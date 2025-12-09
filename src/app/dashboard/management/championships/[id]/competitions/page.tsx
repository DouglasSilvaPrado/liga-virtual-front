import { createServerSupabase } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CompetitionWithSettings } from '@/@types/competition';
import CreateCompetitionButton from './components/CreateCompetitionButton';
import EditCompetitionButton from './components/EditCompetitionButton';

export default async function ChampionshipCompetitionsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const championshipId = id;

  const { supabase, tenantId } = await createServerSupabase();

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

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Competições – {championship.name}</h1>

      <CreateCompetitionButton championshipId={championshipId} />

      {!competitions?.length ? (
        <p className="text-muted-foreground">Nenhuma competição cadastrada.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitions.map((comp: CompetitionWithSettings) => (
            <Card key={comp.id} className="rounded-xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                {/* Avatar da Competição */}
                <div className="flex flex-row items-center space-x-4">
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

                <EditCompetitionButton competition={comp} />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
