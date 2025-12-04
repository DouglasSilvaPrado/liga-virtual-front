import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { tenantId } = await request.json();

  const response = NextResponse.json({ ok: true });
  response.cookies.set('x-tenant-id', tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
