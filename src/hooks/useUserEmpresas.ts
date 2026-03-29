'use client';

/**
 * useUserEmpresas — fetcha todas las empresas vinculadas al usuario actual
 * con su rol y tipo de app (mensana | tusturnos).
 *
 * Para superadmin: devuelve TODAS las empresas activas del sistema.
 * Para los demás: solo las empresas vinculadas vía usuario_empresa.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

export interface UserEmpresa {
  empresaId: string;
  empresaNombre: string;
  logoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  colorBackground: string | null;
  rol: string;
  appType: 'mensana' | 'tusturnos';
}

export function useUserEmpresas() {
  const { profile } = useAuth();
  const [empresas, setEmpresas] = useState<UserEmpresa[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.usuarioId) return;

    let cancelled = false;
    setLoading(true);

    const fetch = async () => {
      let rows: Array<{
        empresa_id: string;
        nombre: string;
        logo_url: string | null;
        color_primary: string | null;
        color_secondary: string | null;
        color_background: string | null;
        rol: string;
      }> = [];

      if (profile.rol === 'superadmin') {
        // Superadmin ve todas las empresas activas
        const { data: todasEmpresas } = await supabase
          .from('empresas')
          .select('id, nombre, logo_url, color_primary, color_secondary, color_background')
          .eq('activo', true)
          .order('nombre');

        // Obtener sus roles explícitos en cada empresa (si los tiene)
        const { data: ueData } = await supabase
          .from('usuario_empresa')
          .select('empresa_id, roles(codigo)')
          .eq('usuario_id', profile.usuarioId);

        const ueMap = new Map(
          (ueData || []).map((ue: any) => [ue.empresa_id, ue.roles?.codigo as string])
        );

        rows = (todasEmpresas || []).map((e: any) => ({
          empresa_id: e.id,
          nombre: e.nombre,
          logo_url: e.logo_url,
          color_primary: e.color_primary,
          color_secondary: e.color_secondary,
          color_background: e.color_background,
          rol: ueMap.get(e.id) || 'superadmin',
        }));
      } else {
        // Usuarios normales: solo sus empresas vinculadas
        const { data: ueData } = await supabase
          .from('usuario_empresa')
          .select(`
            empresa_id,
            roles(codigo),
            empresas(id, nombre, logo_url, color_primary, color_secondary, color_background)
          `)
          .eq('usuario_id', profile.usuarioId);

        rows = (ueData || [])
          .filter((ue: any) => ue.empresas)
          .map((ue: any) => ({
            empresa_id: ue.empresa_id,
            nombre: ue.empresas.nombre,
            logo_url: ue.empresas.logo_url,
            color_primary: ue.empresas.color_primary,
            color_secondary: ue.empresas.color_secondary,
            color_background: ue.empresas.color_background,
            rol: ue.roles?.codigo || profile.rol,
          }));
      }

      if (cancelled || rows.length === 0) {
        setLoading(false);
        return;
      }

      // Obtener tipo de app desde empresa_config
      const ids = rows.map(r => r.empresa_id);
      const { data: configData } = await supabase
        .from('empresa_config')
        .select('empresa_id, config_json')
        .in('empresa_id', ids);

      const configMap = new Map(
        (configData || []).map((c: any) => [
          c.empresa_id,
          (c.config_json?.app as 'mensana' | 'tusturnos') || 'mensana',
        ])
      );

      if (cancelled) return;

      setEmpresas(
        rows.map(r => ({
          empresaId: r.empresa_id,
          empresaNombre: r.nombre,
          logoUrl: r.logo_url,
          colorPrimario: r.color_primary,
          colorSecundario: r.color_secondary,
          colorBackground: r.color_background,
          rol: r.rol,
          appType: configMap.get(r.empresa_id) || 'mensana',
        }))
      );
      setLoading(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, [profile?.usuarioId, profile?.rol]);

  return { empresas, loading };
}
