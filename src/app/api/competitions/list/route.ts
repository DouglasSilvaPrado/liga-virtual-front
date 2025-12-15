import { createServerSupabase } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const championshipId = searchParams.get('championship_id');
  const type = searchParams.get('type');

  if (!championshipId || !type) {
    return NextResponse.json({ error: 'championship_id e type são obrigatórios' }, { status: 400 });
  }

  const { supabase, tenantId } = await createServerSupabase();

  const { data, error } = await supabase
    .from('competitions_with_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('championship_id', championshipId)
    .eq('type', type)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
