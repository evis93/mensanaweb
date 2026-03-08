'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useBusiness } from './BusinessContext';
import { darken, lighten, contrastText } from '../utils/colorUtils';

interface Colors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryFaded: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  error: string;
  warning: string;
  border: string;
  borderLight: string;
  headerText: string;
}

interface ThemeContextType {
  themeId: string;
  colors: Colors;
  logoUrl: string | null;
  empresaNombre: string | null;
  loading: boolean;
}

const DEFAULT_LOGO = '/images/logoMensana.png';

// Logos locales por empresa — evita depender del archivo en Supabase Storage
const LOCAL_LOGOS: Record<string, string> = {
  monalisa: '/images/Logo-corporeo-monalisa.png',
  'arte urbano': '/images/logo_palabra_arte_urbano.png',
  arturbano: '/images/logo_palabra_arte_urbano.png',
};

function resolveLogoUrl(empresaNombre: string | null | undefined, dbLogoUrl: string | null | undefined): string | null {
  if (empresaNombre) {
    const lower = empresaNombre.toLowerCase();
    for (const [key, path] of Object.entries(LOCAL_LOGOS)) {
      if (lower.includes(key)) return path;
    }
  }
  return dbLogoUrl || null;
}

const DEFAULT_COLORS: Colors = {
  primary: '#3498db',
  primaryDark: '#2980b9',
  primaryLight: '#5ca0d3',
  primaryFaded: '#f0f9ff',
  secondary: '#00d2ff',
  accent: '#00d2ff',
  background: '#f8fbff',
  surface: '#ffffff',
  text: '#1a2b3c',
  textSecondary: '#666666',
  textMuted: '#999999',
  success: '#7DB88F',
  error: '#D4726A',
  warning: '#D4A574',
  border: '#E8E4E0',
  borderLight: '#F2EFEB',
  headerText: '#1a1a1a',
};

const buildColors = (primary: string, secondary: string, background: string): Colors => ({
  ...DEFAULT_COLORS,
  primary,
  primaryDark: darken(primary, 0.15),
  primaryLight: lighten(primary, 0.25),
  primaryFaded: lighten(primary, 0.85),
  secondary,
  accent: secondary,
  background,
  headerText: contrastText(secondary),
});

const ThemeContext = createContext<ThemeContextType>({
  themeId: 'default',
  colors: DEFAULT_COLORS,
  logoUrl: null,
  empresaNombre: null,
  loading: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading: authLoading } = useAuth();
  const { businessBranding, businessLoading } = useBusiness();

  // Prioridad:
  //   1. profile autenticado (post-login) — mayor prioridad
  //   2. businessBranding (pre-login, cargado por QR/URL slug)
  //   3. Defaults de Mensana
  const value = useMemo<ThemeContextType>(() => {
    if (authLoading || businessLoading) {
      return { themeId: 'loading', colors: DEFAULT_COLORS, logoUrl: null, empresaNombre: null, loading: true };
    }

    if (profile?.empresaId) {
      const primary = (profile.colorPrimario || DEFAULT_COLORS.primary).trim();
      const secondary = (profile.colorSecundario || DEFAULT_COLORS.secondary).trim();
      const background = (profile.colorBackground || DEFAULT_COLORS.background).trim();
      return {
        themeId: `empresa-${profile.empresaId}`,
        colors: buildColors(primary, secondary, background),
        logoUrl: resolveLogoUrl(profile.empresaNombre, profile.logoUrl),
        empresaNombre: profile.empresaNombre || null,
        loading: false,
      };
    }

    if (businessBranding) {
      const primary = (businessBranding.color_primary || DEFAULT_COLORS.primary).trim();
      const secondary = (businessBranding.color_secondary || DEFAULT_COLORS.secondary).trim();
      const background = (businessBranding.color_background || DEFAULT_COLORS.background).trim();
      return {
        themeId: `business-${businessBranding.id}`,
        colors: buildColors(primary, secondary, background),
        logoUrl: resolveLogoUrl(businessBranding.nombre, businessBranding.logo_url),
        empresaNombre: businessBranding.nombre || null,
        loading: false,
      };
    }

    return { themeId: 'default', colors: DEFAULT_COLORS, logoUrl: DEFAULT_LOGO, empresaNombre: null, loading: false };
  }, [profile, authLoading, businessBranding, businessLoading]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return context;
};

export default ThemeContext;
