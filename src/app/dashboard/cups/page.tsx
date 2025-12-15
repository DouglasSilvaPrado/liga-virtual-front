import { createServerSupabase } from '@/lib/supabaseServer';
import CreateCupModal from './components/CreateCupModal';

export default async function CupPage() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("tenant_id", tenantId)

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Copas</h1>
      </div>

       <div className="mt-6">
        <CreateCupModal />
      </div>

      
    </div>
  );
}
