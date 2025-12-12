import { createServerSupabase } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const tenantId = searchParams.get('tenant_id');
  const page = Number(searchParams.get('page') ?? 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const { supabase } = await createServerSupabase();

  const { data, error } = await supabase
    .from('shields')
    .select('*')
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
