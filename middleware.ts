import { NextRequest, NextResponse } from 'next/server';

// En producción: mensana.com.ar
// En local (con /etc/hosts): sobreescribir con MENSANA_DOMAIN=mensana.local en .env.local
const MENSANA_DOMAIN = process.env.MENSANA_DOMAIN ?? 'mensana.com.ar';

/**
 * Paths que nunca se reescriben para routing de tenant.
 * Los dashboards autenticados, rutas internas de Next.js y APIs
 * se sirven tal cual incluso en subdominios.
 * /auth NO está aquí — en subdominios se reescribe a /mensana/[slug]/auth/...
 */
const BYPASS_PREFIXES = [
  '/_next',
  '/api',
  '/admin',
  '/profesional',
  '/cliente',
  '/mensana',
  '/favicon.ico',
  '/robots.txt',
  '/images',
  '/icon.png',
  '/sw.js',
  '/manifest.webmanifest',
];

function shouldBypass(pathname: string): boolean {
  return BYPASS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const cleanHostname = hostname.split(':')[0]; // quitar puerto en dev

  if (shouldBypass(pathname)) return NextResponse.next();

  // ── 1. Subdominio: {slug}.mensana.com.ar ──────────────────────────────
  if (cleanHostname.endsWith(`.${MENSANA_DOMAIN}`)) {
    const slug = cleanHostname.replace(`.${MENSANA_DOMAIN}`, '');
    if (slug === 'www') return NextResponse.next();

    const tenantPath = pathname === '/' ? '/auth/login' : pathname;
    const url = request.nextUrl.clone();
    url.pathname = `/mensana/${slug}${tenantPath}`;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-slug', slug);
    requestHeaders.set('x-tenant-source', 'subdomain');

    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // ── 2. URL interna: mensana.com.ar/e/{slug} ───────────────────────────
  if (
    cleanHostname === MENSANA_DOMAIN ||
    cleanHostname === `www.${MENSANA_DOMAIN}`
  ) {
    const match = pathname.match(/^\/e\/([^/]+)(\/.*)?$/);
    if (match) {
      const slug = match[1];
      const rest = match[2] ?? '/auth/login';
      const url = request.nextUrl.clone();
      url.pathname = `/mensana/${slug}${rest}`;

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-tenant-slug', slug);
      requestHeaders.set('x-tenant-source', 'path');

      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }

  // ── 3. Dominio propio (plan PRO / PRO-WEB) ────────────────────────────
  // No es mensana.com.ar, no es localhost, no es preview de Vercel.
  // La validación del plan ocurre en tenant-server.ts (requiere Supabase).
  const isCustomDomain =
    !cleanHostname.includes(MENSANA_DOMAIN) &&
    !cleanHostname.includes('localhost') &&
    !cleanHostname.endsWith('.vercel.app');

  if (isCustomDomain) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-custom-domain', cleanHostname);
    requestHeaders.set('x-tenant-source', 'custom-domain');

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
