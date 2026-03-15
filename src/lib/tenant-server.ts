/**
 * tenant-server.ts
 * Resolución server-side de tenants con validación de plan.
 * Solo se usa en Server Components y Route Handlers (Node runtime).
 * NO en middleware (Edge runtime — no hace queries).
 */

import { createClient } from '@supabase/supabase-js';

// ── Tipos ────────────────────────────────────────────────────────────────

export type TenantPlan = 'PRUEBA' | 'PRO' | 'PRO-WEB' | 'PARTNER';
export type TenantSource = 'subdomain' | 'path' | 'custom-domain';
export type UrlStatus = 'pending' | 'active' | 'failed';

export interface TenantBranding {
  id: string;
  nombre: string;
  slug: string;
  plan: TenantPlan;
  color_primary: string;
  color_secondary: string;
  color_background: string;
  logo_url: string | null;
  url: string | null;            // dominio propio (nullable, solo PRO/PRO-WEB)
  url_verified: boolean | null;
  url_status: UrlStatus | null;
}

export interface TenantResolution {
  tenant: TenantBranding | null;
  source: TenantSource | null;
  /** Presente cuando el dominio propio existe pero el plan no lo permite. */
  redirect: string | null;
}

/** Planes que habilitan el uso de dominio propio */
const CUSTOM_DOMAIN_PLANS: TenantPlan[] = ['PRO', 'PRO-WEB'];

// Campos de branding disponibles en la vista pública v_empresa_branding
const BRANDING_FIELDS =
  'id, nombre, slug, color_primary, color_secondary, color_background, logo_url';

// Campos de plan/dominio (solo en tabla empresas)
// url_verified y url_status son opcionales — solo PRO/PRO-WEB los usa
const PLAN_FIELDS = 'plan, url';

// ── Cliente Supabase (sin sesión — server-side only) ─────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Resoluciones individuales ─────────────────────────────────────────────

/**
 * Busca empresa por slug directamente en la tabla empresas (select *).
 * Fallback por nombre si slug no matchea.
 * select('*') evita fallos por columnas inexistentes.
 */
export async function resolveTenantBySlug(
  slug: string,
): Promise<TenantBranding | null> {
  const sb = getSupabase();

  // 1. Por slug exacto
  const { data: bySlug, error: e1 } = await sb
    .from('empresas')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (e1) console.error('[tenant] bySlug error:', e1.message);

  // 2. Fallback por nombre
  let raw: any = bySlug;
  if (!raw) {
    const nombre = slug.replace(/[-_]/g, ' ');
    const { data: byNombre, error: e2 } = await sb
      .from('empresas')
      .select('*')
      .ilike('nombre', `%${nombre}%`)
      .maybeSingle();
    if (e2) console.error('[tenant] byNombre error:', e2.message);
    raw = byNombre;
  }

  if (!raw) {
    console.error('[tenant] empresa no encontrada para slug:', slug);
    return null;
  }

  return {
    id: raw.id,
    nombre: raw.nombre ?? slug,
    slug: raw.slug ?? slug,
    plan: (raw.plan as TenantPlan) ?? 'PRUEBA',
    color_primary: raw.color_primary ?? '#3498db',
    color_secondary: raw.color_secondary ?? '#00d2ff',
    color_background: raw.color_background ?? '#f8fbff',
    logo_url: raw.logo_url ?? null,
    url: raw.url ?? null,
    url_verified: raw.url_verified ?? null,
    url_status: (raw.url_status as UrlStatus) ?? null,
  };
}

/**
 * Busca empresa por dominio propio (columna `url`).
 * Devuelve 'plan-not-allowed' si la empresa existe pero su plan no permite
 * dominio propio — para poder redirigir al dominio de Mensana.
 */
export async function resolveTenantByUrl(
  domain: string,
): Promise<TenantBranding | 'plan-not-allowed' | null> {
  const { data } = await getSupabase()
    .from('empresas')
    .select(`${BRANDING_FIELDS}, ${PLAN_FIELDS}`)
    .eq('url', domain)
    .maybeSingle();

  if (!data) return null;
  if (!CUSTOM_DOMAIN_PLANS.includes(data.plan as TenantPlan)) {
    return 'plan-not-allowed';
  }
  return data as TenantBranding;
}

// ── Resolución desde headers del middleware ──────────────────────────────

/**
 * Función principal: lee los headers inyectados por el middleware y
 * devuelve el tenant resuelto con su fuente.
 *
 * Para custom domains también valida el plan. Si el plan no lo permite,
 * `redirect` contiene la URL canónica de Mensana a donde redirigir.
 *
 * Uso en Server Component:
 *   import { headers } from 'next/headers';
 *   const hdrs = await headers();
 *   const { tenant, redirect } = await resolveTenantFromHeaders(hdrs);
 *   if (redirect) redirect(redirectUrl);
 */
export async function resolveTenantFromHeaders(
  headersList: Headers,
): Promise<TenantResolution> {
  const slug = headersList.get('x-tenant-slug');
  const customDomain = headersList.get('x-custom-domain');
  const source = headersList.get('x-tenant-source') as TenantSource | null;

  // Subdominio o /e/{slug}: resolver directo por slug
  if ((source === 'subdomain' || source === 'path') && slug) {
    const tenant = await resolveTenantBySlug(slug);
    return { tenant, source, redirect: null };
  }

  // Dominio propio: resolver por url + validar plan
  if (source === 'custom-domain' && customDomain) {
    const result = await resolveTenantByUrl(customDomain);

    if (result === 'plan-not-allowed') {
      // Buscar el slug para armar la URL canónica de Mensana
      const { data } = await getSupabase()
        .from('empresas')
        .select('slug')
        .eq('url', customDomain)
        .maybeSingle();
      const fallbackSlug = data?.slug ?? '';
      return {
        tenant: null,
        source,
        redirect: `https://${process.env.MENSANA_DOMAIN ?? 'mensana.com.ar'}/e/${fallbackSlug}`,
      };
    }

    return { tenant: result, source, redirect: null };
  }

  return { tenant: null, source: null, redirect: null };
}

// ── Helpers de plan ───────────────────────────────────────────────────────

export function canUseCustomDomain(plan: TenantPlan): boolean {
  return CUSTOM_DOMAIN_PLANS.includes(plan);
}
