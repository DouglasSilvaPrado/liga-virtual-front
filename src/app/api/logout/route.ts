import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get('cookie') ?? '';
          return cookieHeader
            .split(';')
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => {
              const [name, ...rest] = c.split('=');
              return { name, value: rest.join('=') };
            });
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.signOut();

  return res;
}
