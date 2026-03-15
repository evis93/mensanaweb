import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /manifest.webmanifest  (rewrite desde next.config.ts → /api/manifest)
 *
 * Genera el Web App Manifest dinámico por tenant.
 * Lee el subdominio o custom domain desde los headers del middleware
 * (x-tenant-slug / x-custom-domain) y adapta nombre, colores e iconos.
 *
 * Sin tenant activo devuelve el manifest de Mensana por defecto.
 */

interface Branding {
  nombre: string;
  color_primary: string;
  color_background: string;
  logo_url: string | null;
  slug: string | null;
}

async function fetchBranding(slug: string): Promise<Branding | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data } = await supabase
    .from('v_empresa_branding')
    .select('nombre, color_primary, color_background, logo_url, slug')
    .or(`slug.eq.${slug},nombre.ilike.${slug.replace(/-/g, ' ')}`)
    .maybeSingle();

  return data ?? null;
}

async function fetchBrandingByDomain(domain: string): Promise<Branding | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data } = await supabase
    .from('empresas')
    .select('nombre, color_primary, color_background, logo_url, slug')
    .eq('custom_domain', domain)
    .maybeSingle();

  return data ?? null;
}

export async function GET(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug');
  const customDomain = request.headers.get('x-custom-domain');
  const host = request.headers.get('host') ?? '';

  // También intentamos extraer el slug del host directamente (por si el
  // rewrite no propagó los custom headers en algún edge case)
  let slug = tenantSlug;
  if (!slug && host.endsWith('.mensana.com.ar')) {
    slug = host.split('.')[0];
  }

  let branding: Branding | null = null;

  if (slug) {
    branding = await fetchBranding(slug);
  } else if (customDomain) {
    branding = await fetchBrandingByDomain(customDomain);
  }

  const appName = branding?.nombre ?? 'Mensana';
  const shortName = appName.length > 12 ? appName.split(' ')[0] : appName;
  const themeColor = branding?.color_primary ?? '#3b82f6';
  const bgColor = branding?.color_background ?? '#f8fbff';
  const startUrl = '/';

  const manifest = {
    name: appName,
    short_name: shortName,
    description: `Turnos y reservas — ${appName}`,
    start_url: startUrl,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: themeColor,
    background_color: bgColor,
    lang: 'es',
    icons: [
      // Si la empresa tiene logo_url en Supabase Storage, se usa directamente.
      // Si no, se usan los íconos genéricos de Mensana.
      ...(branding?.logo_url
        ? [
            {
              src: branding.logo_url,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ]
        : [
            {
              src: '/images/logoMensana.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ]),
    ],
    screenshots: [],
    categories: ['health', 'lifestyle'],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      // El manifest puede cachearse brevemente; revalidar cada hora
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
