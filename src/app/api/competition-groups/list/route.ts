import { createServerSupabase } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const competition_id = searchParams.get('competition_id');

  if (!competition_id) {
    return NextResponse.json({ error: 'competition_id obrigatório' }, { status: 400 });
  }

  const { supabase, tenantId } = await createServerSupabase();

  const { data, error } = await supabase
    .from('competition_groups')
    .select('id, code, name')
    .eq('competition_id', competition_id)
    .eq('tenant_id', tenantId)
    .order('code');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
