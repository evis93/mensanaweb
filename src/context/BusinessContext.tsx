'use client';

/**
 * BusinessContext — White-label dinámico (Next.js)
 *
 * Prioridad de resolución del businessId:
 *   DEV:  devOverride > NEXT_PUBLIC_DEV_BUSINESS_ID (env) > localStorage (QR/URL param)
 *   PROD: localStorage únicamente (URL param)
 *
 * API pública:
 *   const { businessId, businessBranding, businessLoading, setBusiness, clearBusiness } = useBusiness();
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

const STORAGE_KEY = 'mensana_business_id';
const IS_DEV = process.env.NODE_ENV === 'development';
const DEV_ENV_BUSINESS_ID = IS_DEV ? (process.env.NEXT_PUBLIC_DEV_BUSINESS_ID || null) : null;

export interface BusinessBranding {
  id: string;
  nombre: string;
  color_primary: string;
  color_secondary: string;
  color_background: string;
  logo_url: string | null;
  slug?: string | null;
}

interface BusinessContextValue {
  businessId: string | null;
  businessBranding: BusinessBranding | null;
  businessLoading: boolean;
  setBusiness: (id: string) => void;
  clearBusiness: () => void;
  devOverride?: string | null;
  setDevOverride?: (id: string | null) => void;
}

interface BusinessProviderProps {
  children: React.ReactNode;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export const BusinessProvider = ({ children }: BusinessProviderProps) => {
  const [storedId, setStoredId] = useState<string | null>(null);
  const [devOverride, setDevOverride] = useState<string | null>(null);
  const [businessBranding, setBusinessBranding] = useState<BusinessBranding | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);

  // Al montar: restaurar desde localStorage (para flujo QR/URL param)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBusinessLoading(true);
        setStoredId(stored);
      } else if (IS_DEV && DEV_ENV_BUSINESS_ID) {
        setBusinessLoading(true);
        setStoredId(DEV_ENV_BUSINESS_ID);
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveId = (IS_DEV && devOverride) ? devOverride : storedId;

  // Cuando cambia el id efectivo: cargar branding desde v_empresa_branding
  useEffect(() => {
    if (!effectiveId) {
      setBusinessBranding(null);
      setBusinessLoading(false);
      return;
    }

    let cancelled = false;
    setBusinessLoading(true);

    // Si parece UUID buscar por id o slug; si no, solo por slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveId);
    const query = supabase
      .from('v_empresa_branding')
      .select('id, nombre, color_primary, color_secondary, color_background, logo_url');
    const filteredQuery = isUuid
      ? query.or(`id.eq.${effectiveId},slug.eq.${effectiveId}`)
      : query.eq('slug', effectiveId);

    filteredQuery
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[BusinessContext] Error cargando branding:', error.message);
          // Intentar por nombre normalizado si falla la búsqueda por slug
          setBusinessBranding(null);
        } else {
          setBusinessBranding(data || null);
        }
        setBusinessLoading(false);
      });

    return () => { cancelled = true; };
  }, [effectiveId]);

  const setBusiness = useCallback((id: string) => {
    try { localStorage.setItem(STORAGE_KEY, String(id)); } catch { /* non-critical */ }
    setStoredId(String(id));
  }, []);

  const clearBusiness = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* non-critical */ }
    setStoredId(null);
  }, []);

  const value: BusinessContextValue = {
    businessId: effectiveId,
    businessBranding,
    businessLoading,
    setBusiness,
    clearBusiness,
    ...(IS_DEV && { devOverride, setDevOverride }),
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness debe usarse dentro de BusinessProvider');
  return context;
};

export default BusinessContext;
