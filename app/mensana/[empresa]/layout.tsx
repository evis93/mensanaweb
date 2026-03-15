/**
 * Layout server-side de /mensana/[empresa]/*
 *
 * 1. Resuelve el tenant via TenantResolver (Service Layer)
 * 2. Provee TenantContext a todos los children
 * 3. ThemeProvider dentro de TenantProvider → lee los colores correctos
 */

import { resolveBySlug } from '@/src/services/TenantResolver';
import { TenantProvider } from '@/src/context/TenantContext';
import { ThemeProvider } from '@/src/context/ThemeContext';

interface Props {
  children: React.ReactNode;
  params: Promise<{ empresa: string }>;
}

export default async function EmpresaLayout({ children, params }: Props) {
  const { empresa } = await params;
  const tenant = await resolveBySlug(empresa);

  return (
    <TenantProvider tenant={tenant}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </TenantProvider>
  );
}
