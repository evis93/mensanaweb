'use client';

/**
 * TenantContext — almacena el tenant resuelto server-side.
 * No fetchea nada. Solo recibe datos ya resueltos como props.
 */

import { createContext, useContext } from 'react';
import type { ResolvedTenant } from '@/src/services/TenantResolver';

const TenantContext = createContext<ResolvedTenant | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: ResolvedTenant | null;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
