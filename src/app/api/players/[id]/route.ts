import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id: idStr } = await context.params;

  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const { supabase } = await createServerSupabase();

  const { data, error } = await supabase.from('players').select('*').eq('id', id).single();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
