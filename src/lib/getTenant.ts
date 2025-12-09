/**
 * Apenas extrai o subdomain de uma Request/NextRequest.
 * Não faz chamadas ao banco — serve para usar tanto em middleware como em RSC/API.
 */
export function getSubdomainFromRequest(req: Request | { headers: Headers }) {
  const host = (req.headers.get('host') ?? '').split(':')[0];
  if (!host) return null;

  // host pode ser "localhost", "tenant1.localhost", "example.com"
  const sub = host.split('.')[0];
  return sub || null;
}
