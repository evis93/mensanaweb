'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import type { Profile } from '../utils/permissions';

interface AuthContextType {
  session: any;
  user: any;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: any; data?: any }>;
  register: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: any; data?: any }>;
  logout: () => Promise<void>;
  changePassword: (email: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: any; data?: any }>;
  rol: string | null;
  empresaId: string | null;
  isAdmin: boolean;
  isProfesional: boolean;
  isCliente: boolean;
  isMensana: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  changePassword: async () => ({ success: false }),
  rol: null,
  empresaId: null,
  isAdmin: false,
  isProfesional: false,
  isCliente: false,
  isMensana: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const fetchingProfile = useRef(false);

  const ROL_PRIORIDAD: Record<string, number> = { superadmin: 4, admin: 3, profesional: 2, cliente: 1 };

  const fetchProfile = async (authUserId: string, options: { retry?: boolean } = {}) => {
    if (fetchingProfile.current) return;
    fetchingProfile.current = true;
    const { retry = true } = options;

    try {
      const queryTimeout = (promise: Promise<any>) =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 15000)),
        ]);

      const { data: filas, error } = await queryTimeout(
        supabase.from('v_sesion_contexto').select('*')
      );

      if (error || !filas || filas.length === 0) {
        console.error('[AuthContext] Error fetching v_sesion_contexto:', error);
        setLoading(false);
        return;
      }

      const data = filas.reduce((mejor: any, fila: any) => {
        const prioridadActual = ROL_PRIORIDAD[fila.rol_codigo] || 0;
        const prioridadMejor = ROL_PRIORIDAD[mejor.rol_codigo] || 0;
        return prioridadActual > prioridadMejor ? fila : mejor;
      }, filas[0]);

      const rol = data.rol_codigo || null;

      setProfile({
        usuarioId: data.usuario_id,
        authUserId: data.auth_user_id,
        nombre_completo: data.nombre_completo,
        email: data.email,
        rol,
        empresaId: data.empresa_id,
        empresaNombre: data.empresa_nombre,
        profesionalId: ['admin', 'profesional', 'superadmin'].includes(rol) ? data.usuario_id : null,
        esAdmin: rol === 'admin' || rol === 'superadmin',
        esProfesional: rol === 'profesional' || rol === 'admin' || rol === 'superadmin',
        esCliente: rol === 'cliente',
        esMensana: rol === 'superadmin',
        colorPrimario: data.color_primary,
        colorSecundario: data.color_secondary,
        colorBackground: data.color_background,
        logoUrl: data.logo_url,
      });
    } catch (error: any) {
      console.error('[AuthContext] Error fetching profile:', error);
      if (retry && error.message === 'Query timeout') {
        fetchingProfile.current = false;
        return fetchProfile(authUserId, { retry: false });
      }
    } finally {
      fetchingProfile.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 10000)
        );
        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfile(prev => {
          if (prev && prev.authUserId === session.user.id) {
            setLoading(false);
            return prev;
          }
          fetchProfile(session.user.id);
          return prev;
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => { subscription?.unsubscribe(); };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error };
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { success: false, error };
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.error('[AuthContext] Error logout:', e);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const changePassword = async (email: string, currentPassword: string, newPassword: string) => {
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) return { success: false, error: signInError };

      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error };
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        login,
        register,
        logout,
        changePassword,
        rol: profile?.rol ?? null,
        empresaId: profile?.empresaId ?? null,
        isAdmin: profile?.esAdmin ?? false,
        isProfesional: profile?.esProfesional ?? false,
        isCliente: profile?.esCliente ?? false,
        isMensana: profile?.esMensana ?? false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
