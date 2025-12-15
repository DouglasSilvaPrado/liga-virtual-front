import { createServerSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
  const { supabase, tenantId } = await createServerSupabase();

  const { data, error } = await supabase
    .from('championships')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
