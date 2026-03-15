/**
 * TenantResolver — lógica de negocio para resolución de tenants.
 * Usa EmpresaRepository para acceder a datos.
 * Server-only (Node runtime).
 */

import * as EmpresaRepository from '@/src/repositories/EmpresaRepository';

export interface ResolvedTenant {
  id: string;
  nombre: string;
  slug: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  logo_url: string | null;
}

function mapTenant(raw: any, fallbackSlug: string): ResolvedTenant {
  return {
    id: raw.id,
    nombre: raw.nombre ?? fallbackSlug,
    slug: raw.slug ?? fallbackSlug,
    colors: {
      primary:    (raw.color_primary    ?? '#3498db').trim(),
      secondary:  (raw.color_secondary  ?? '#00d2ff').trim(),
      background: (raw.color_background ?? '#f8fbff').trim(),
    },
    logo_url: raw.logo_url ?? null,
  };
}

/**
 * Resuelve tenant por slug de URL.
 * Intenta por slug exacto primero, luego por nombre como fallback.
 */
export async function resolveBySlug(slug: string): Promise<ResolvedTenant | null> {
  // 1. Por slug exacto
  let raw = await EmpresaRepository.findBySlug(slug);

  // 2. Fallback: slug como nombre ("monalisa" → "Monalisa Estetica")
  if (!raw) {
    raw = await EmpresaRepository.findByNombre(slug.replace(/[-_]/g, ' '));
  }

  if (!raw) return null;
  return mapTenant(raw, slug);
}

/**
 * Resuelve tenant por dominio propio (custom domain).
 * Si la empresa existe y tiene ese dominio configurado, se permite acceso.
 */
export async function resolveByCustomDomain(domain: string): Promise<ResolvedTenant | null> {
  const raw = await EmpresaRepository.findByCustomDomain(domain);
  if (!raw) return null;
  return mapTenant(raw, raw.slug);
}
