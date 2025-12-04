// src/lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

interface ServerSupabase {
  supabase: SupabaseClient;
  tenantId: string;
}

export async function createServerSupabase(): Promise<ServerSupabase> {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get('x-tenant-id')?.value ?? '';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
      global: {
        headers: {
          'x-tenant-id': tenantId,
        },
      },
    },
  );

  return { supabase, tenantId };
}
