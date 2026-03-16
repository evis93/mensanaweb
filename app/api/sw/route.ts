import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /sw.js  (rewrite desde next.config.ts → /api/sw)
 *
 * Sirve el Service Worker con branding dinámico por tenant.
 * El cache name incluye el slug del tenant para que cada empresa tenga
 * su propio cache aislado y las actualizaciones se propaguen correctamente.
 *
 * Headers importantes:
 *  - Content-Type: application/javascript
 *  - Service-Worker-Allowed: /  → scope completo desde la raíz
 *  - Cache-Control: no-cache    → el navegador siempre busca actualizaciones
 */

export async function GET(request: NextRequest) {
  const tenantSlug =
    request.headers.get('x-tenant-slug') ??
    request.headers.get('x-custom-domain') ??
    'mensana';

  // En Vercel usa el SHA del commit para invalidar el cache automáticamente en cada deploy.
  // Localmente cae a 'v1'.
  const CACHE_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'v1';
  const CACHE_NAME = `mensana-${tenantSlug}-${CACHE_VERSION}`;

  const swScript = /* javascript */ `
'use strict';

const CACHE_NAME = ${JSON.stringify(CACHE_NAME)};
const TENANT_SLUG = ${JSON.stringify(tenantSlug)};

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
];

// ── Install: precachear shell de la app ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

// ── Activate: limpiar caches viejos del mismo tenant ────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('mensana-' + TENANT_SLUG + '-') &&
              key !== CACHE_NAME,
          )
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests de otros orígenes
  if (url.origin !== self.location.origin) return;

  // API calls → network first, sin cachear
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'sin conexión' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    return;
  }

  // Navegación → network first con fallback a cache y luego a /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match('/offline')),
        ),
    );
    return;
  }

  // Assets estáticos → cache first, luego network
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }),
    ),
  );
});
`;

  return new NextResponse(swScript, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // El navegador debe verificar actualizaciones del SW en cada visita
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      // Scope completo: el SW puede interceptar requests desde /
      'Service-Worker-Allowed': '/',
    },
  });
}
