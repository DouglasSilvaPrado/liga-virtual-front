import { NextRequest, NextResponse } from 'next/server';
import { getSubdomainFromRequest } from './lib/getTenant';

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const sub = getSubdomainFromRequest(req) ?? null;

  let tenant = null;

  if (sub) {
    try {
      const resolveUrl = new URL(`/api/tenant/resolve?sub=${encodeURIComponent(sub)}`, req.url);

      const r = await fetch(resolveUrl.toString(), {
        headers: {
          cookie: req.headers.get('cookie') ?? '',
        },
      });

      if (r.ok) {
        const json = await r.json();
        tenant = json?.tenant ?? null;
      }
    } catch (err) {
      console.error('Proxy: erro ao chamar /api/tenant/resolve:', err);
      tenant = null;
    }
  }

  const hasToken =
    req.cookies.has('sb-access-token') ||
    req.cookies.getAll().some((c) => c.name.includes('-auth-token'));

  if (url.pathname.startsWith('/dashboard')) {
    if (!hasToken) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (!tenant) {
      return new NextResponse('Tenant inválido', { status: 400 });
    }
  }

  const res = NextResponse.next();

  if (tenant?.id) {
    res.cookies.set('x-tenant-id', tenant.id, {
      path: '/',
    });
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
};
