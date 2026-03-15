/**
 * EmpresaRepository — acceso a datos de empresas.
 * Usa la vista v_empresa_branding para lecturas públicas (RLS permisivo).
 * Nunca accede a la tabla empresas directamente para branding público.
 */

import { createClient } from '@supabase/supabase-js';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

// Campos de v_empresa_branding (requiere que la vista incluya slug — ver SQL en README)
const CAMPOS = 'id, nombre, slug, color_primary, color_secondary, color_background, logo_url';
// Sin slug (fallback si la vista no expone esa columna aún)
const CAMPOS_SIN_SLUG = 'id, nombre, color_primary, color_secondary, color_background, logo_url';

export async function findBySlug(slug: string) {
  const { data, error } = await db()
    .from('v_empresa_branding')
    .select(CAMPOS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    // v_empresa_branding no tiene slug todavía → fallback por nombre
    if (error.message.includes('slug')) {
      console.warn('[EmpresaRepository.findBySlug] slug no está en la vista, usando fallback nombre');
      return findByNombre(slug);
    }
    console.error('[EmpresaRepository.findBySlug]', error.message);
  }
  return data ?? null;
}

export async function findByNombre(nombre: string) {
  // Intenta con slug en SELECT; si falla, reintenta sin slug
  const { data, error } = await db()
    .from('v_empresa_branding')
    .select(CAMPOS)
    .ilike('nombre', `%${nombre}%`)
    .maybeSingle();

  if (error && error.message.includes('slug')) {
    const { data: d2, error: e2 } = await db()
      .from('v_empresa_branding')
      .select(CAMPOS_SIN_SLUG)
      .ilike('nombre', `%${nombre}%`)
      .maybeSingle();
    if (e2) console.error('[EmpresaRepository.findByNombre]', e2.message);
    return d2 ?? null;
  }

  if (error) console.error('[EmpresaRepository.findByNombre]', error.message);
  return data ?? null;
}

export async function findByCustomDomain(domain: string) {
  // custom_domain/url no está en la vista pública — necesita la tabla
  const { data, error } = await db()
    .from('empresas')
    .select('id, nombre, slug, plan, color_primary, color_secondary, color_background, logo_url')
    .eq('custom_domain', domain)
    .maybeSingle();

  if (error) console.error('[EmpresaRepository.findByCustomDomain]', error.message);
  return data ?? null;
}
