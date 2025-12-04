import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const sub = req.nextUrl.searchParams.get('sub');

    if (!sub) {
      return NextResponse.json({ tenant: null }, { status: 400 });
    }

    const { supabase } = await createServerSupabase();

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', sub)
      .maybeSingle();

    if (error) {
      console.error('resolve tenant error:', error);
      return NextResponse.json({ tenant: null }, { status: 500 });
    }

    return NextResponse.json({ tenant: data });
  } catch (err) {
    console.error('resolve tenant exception:', err);
    return NextResponse.json({ tenant: null }, { status: 500 });
  }
}
