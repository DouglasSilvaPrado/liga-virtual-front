import { NextRequest, NextResponse } from "next/server";
import { getSubdomainFromRequest } from "./lib/getTenant";

/**
 * Middleware:
 * - resolve tenant via calling a SSR API route (internal fetch)
 * - seta cookie x-tenant-id quando encontrar tenant
 * - redireciona para /login se for rota /dashboard e não houver token (sb-access-token)
 */

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const sub = getSubdomainFromRequest(req) ?? null;

  // Resolve tenant via nossa rota SSR interna (chamada server-to-server)
  let tenant = null;
  if (sub) {
    try {
      const resolveUrl = new URL(
        `/api/tenant/resolve?sub=${encodeURIComponent(sub)}`,
        req.url,
      );
      const r = await fetch(resolveUrl.toString(), {
        // importante: inclui cookies do navegador (já que é chamada interna)
        headers: {
          cookie: req.headers.get("cookie") ?? "",
        },
      });

      if (r.ok) {
        const json = await r.json();
        tenant = json?.tenant ?? null;
      } else {
        // não achar o tenant não é fatal aqui — manter tenant = null
        tenant = null;
      }
    } catch (err) {
      console.error("Middleware: erro ao chamar /api/tenant/resolve:", err);
      tenant = null;
    }
  }

  const hasToken =
    req.cookies.has("sb-access-token") ||
    req.cookies.getAll().some((c) => c.name.includes("-auth-token"));

  // proteger rota /dashboard
  if (url.pathname.startsWith("/dashboard")) {
    // se nao tem token, redireciona para /login
    if (!hasToken) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // se tem token mas não tem tenant (ex: host inválido), bloquear
    if (!tenant) {
      // Retornar 400 com mensagem simples (pode personalizar)
      return new NextResponse("Tenant inválido", { status: 400 });
    }
  }

  const res = NextResponse.next();

  // Se encontramos tenant, setamos cookie para uso em SSR (dashboard)
  if (tenant?.id) {
    // cookie simples — não é httpOnly (pode ajustar conforme necessidade)
    // definir path=/ para ficar disponível em toda app
    res.cookies.set("x-tenant-id", tenant.id, { path: "/" });
  } else {
    // opcional: limpar cookie se não houver tenant
    // res.cookies.delete("x-tenant-id", { path: "/" });
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard"],
};
