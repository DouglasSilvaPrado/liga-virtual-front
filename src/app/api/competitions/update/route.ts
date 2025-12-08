import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing competition ID in request body.' },
        { status: 400 },
      );
    }

    const { supabase, tenantId } = await createServerSupabase();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is undefined (multi-tenant failed).' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('competitions')
      .update({
        name: body.name,
        rules: body.rules,
        competition_url: body.competition_url,
      })
      .eq('id', body.id)
      .eq('tenant_id', tenantId)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No rows updated — check id and tenant_id.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, competition: data[0] });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Unexpected error: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
