'use client';

/**
 * usePostLoginRouter — resuelve el destino correcto después del login.
 *
 * Reglas (en orden de prioridad):
 *   1. Superadmin de Mensana           → /seleccionar-empresa
 *   2. Tiene TusTurnos (1 o 2)         → /[rol] de la empresa TusTurnos de mayor rol
 *   3. TusTurnos + Mensana             → TusTurnos tiene prioridad (cubre regla 2)
 *   4. Solo 1 Mensana                  → /[rol] de esa empresa
 *   5. Múltiples Mensana sin TusTurnos → /seleccionar-empresa
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useUserEmpresas, type UserEmpresa } from './useUserEmpresas';

const ROL_PRIORIDAD: Record<string, number> = {
  superadmin: 4,
  admin: 3,
  profesional: 2,
  cliente: 1,
};

function rutaPorRol(rol: string): string {
  if (rol === 'admin' || rol === 'superadmin') return '/admin';
  if (rol === 'profesional') return '/profesional/agenda';
  return '/cliente';
}

function mejorEmpresa(lista: UserEmpresa[]): UserEmpresa {
  return lista.reduce((mejor, e) =>
    (ROL_PRIORIDAD[e.rol] || 0) >= (ROL_PRIORIDAD[mejor.rol] || 0) ? e : mejor
  );
}

export function usePostLoginRouter() {
  const { profile, loading: authLoading, setActiveEmpresa } = useAuth();
  const { empresas, loading: empresasLoading } = useUserEmpresas();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !profile) return;
    if (empresasLoading || empresas.length === 0) return;

    // Regla 1: superadmin → selector siempre
    if (profile.rol === 'superadmin') {
      router.replace('/seleccionar-empresa');
      return;
    }

    const tusturnos = empresas.filter(e => e.appType === 'tusturnos');
    const mensana = empresas.filter(e => e.appType === 'mensana');

    let destino: UserEmpresa | null = null;

    if (tusturnos.length > 0) {
      // Reglas 2 y 3: TusTurnos tiene prioridad
      destino = mejorEmpresa(tusturnos);
    } else if (mensana.length === 1) {
      // Regla 4: única empresa Mensana
      destino = mensana[0];
    } else {
      // Regla 5: múltiples Mensana → selector
      router.replace('/seleccionar-empresa');
      return;
    }

    // Si la empresa resuelta es distinta a la del profile actual, actualizarla
    if (destino.empresaId !== profile.empresaId) {
      setActiveEmpresa({
        empresaId: destino.empresaId,
        empresaNombre: destino.empresaNombre,
        rol: destino.rol,
        colorPrimario: destino.colorPrimario ?? undefined,
        colorSecundario: destino.colorSecundario ?? undefined,
        colorBackground: destino.colorBackground ?? undefined,
        logoUrl: destino.logoUrl ?? undefined,
      });
    }

    router.replace(rutaPorRol(destino.rol));
  }, [authLoading, profile, empresasLoading, empresas]);

  return { resolving: authLoading || empresasLoading };
}
