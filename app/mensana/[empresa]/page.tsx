'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBusiness } from '@/src/context/BusinessContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/config/supabase';

const NOVEDADES = [
  { id: '1', titulo: '5 minutos para tu calma', categoria: 'bienestar emocional', icon: '🧘' },
  { id: '2', titulo: 'nueva sede disponible', categoria: 'nuevos centros', icon: '🏢' },
  { id: '3', titulo: 'higiene del sueño', categoria: 'tips de salud', icon: '🌙' },
];

export default function EmpresaPublicPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.empresa as string;
  const { setBusiness, businessBranding, businessLoading } = useBusiness();
  const { colors, logoUrl, empresaNombre } = useTheme();
  const { session, profile } = useAuth();

  // Resolver empresa por slug y setearla en BusinessContext
  useEffect(() => {
    if (!slug) return;

    async function resolverEmpresa() {
      // Buscar por slug o por nombre normalizado
      const { data } = await supabase
        .from('v_empresa_branding')
        .select('id, nombre, slug')
        .or(`slug.eq.${slug},nombre.ilike.${slug.replace(/_/g, ' ')}`)
        .maybeSingle();

      if (data?.id) {
        setBusiness(data.id);
      }
    }

    resolverEmpresa();
  }, [slug, setBusiness]);

  // Si el usuario ya tiene sesión, redirigir a su home
  useEffect(() => {
    if (session && profile) {
      switch (profile.rol) {
        case 'admin': case 'superadmin': router.replace('/admin'); break;
        case 'profesional': router.replace('/profesional'); break;
        case 'cliente': router.replace('/cliente'); break;
      }
    }
  }, [session, profile, router]);

  if (businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8fbff' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f8fbff' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-blue-50">
        <div className="w-8" />
        <div className="flex items-center gap-2">
          {logoUrl && <img src={logoUrl} alt="logo" className="w-8 h-8 rounded-lg object-cover" />}
          <span className="text-xl font-bold" style={{ color: colors.primary }}>
            {empresaNombre || 'mensana'}
          </span>
        </div>
        <div className="w-8" />
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Saludo */}
        <div className="px-4 pt-6 pb-2">
          <h1 className="text-2xl font-bold text-gray-800">hola, ¿cómo te sentís hoy?</h1>
        </div>

        {/* Novedades */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">novedades en mensana</h2>
            <span className="text-xs font-bold tracking-wider" style={{ color: colors.primary }}>VER TODO</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {NOVEDADES.map(n => (
              <div key={n.id} className="flex-shrink-0 w-64 rounded-xl overflow-hidden">
                <div className="h-36 flex items-center justify-center rounded-xl text-5xl"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                  {n.icon}
                </div>
                <div className="pt-2">
                  <p className="text-sm font-bold text-gray-800">{n.titulo}</p>
                  <p className="text-xs text-gray-500">{n.categoria}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explorar catálogo */}
        <div className="px-4 pt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">¿querés explorar servicios?</h2>
          <Link href={`/mensana/${slug}/catalogo`}
            className="block bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
            style={{ borderColor: '#e1f5fe' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: colors.primaryFaded }}>🌿</div>
                <div>
                  <p className="text-sm font-bold text-gray-800">catálogo de servicios</p>
                  <p className="text-xs text-gray-500">masajes, yoga, terapias y más</p>
                </div>
              </div>
              <span className="text-gray-400">›</span>
            </div>
          </Link>
        </div>

        {/* Botones de acceso */}
        <div className="px-4 pt-5 flex gap-3">
          <Link href={`/mensana/${slug}/auth/login`}
            className="flex-1 py-3 rounded-xl text-center text-sm font-bold text-white"
            style={{ backgroundColor: colors.primary }}>
            iniciar sesión
          </Link>
          <Link href={`/mensana/${slug}/auth/register`}
            className="flex-1 py-3 rounded-xl text-center text-sm font-bold border-2"
            style={{ borderColor: colors.primary, color: colors.primary }}>
            crear cuenta
          </Link>
        </div>

        {/* Bloque profesional */}
        <div className="mx-4 mt-6 mb-6 bg-white rounded-xl border p-6 text-center shadow-sm" style={{ borderColor: 'rgba(52,152,219,0.1)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto mb-3"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
            🩺
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">¿sos profesional o tenés un centro?</h3>
          <p className="text-sm text-gray-500 mb-4">contactate con nosotros y unite a nuestra red de especialistas.</p>
          <Link href={`/mensana/${slug}/auth/login`}
            className="inline-block px-8 py-3 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: colors.primary }}>
            más información
          </Link>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3" style={{ borderColor: 'rgba(52,152,219,0.1)' }}>
        <button className="flex flex-col items-center gap-0.5">
          <span className="text-lg">🏠</span>
          <span className="text-xs font-bold" style={{ color: colors.primary }}>inicio</span>
        </button>
        <Link href={`/mensana/${slug}/catalogo`} className="flex flex-col items-center gap-0.5">
          <span className="text-lg text-gray-400">🔍</span>
          <span className="text-xs text-gray-400">explorar</span>
        </Link>
        <Link href={`/mensana/${slug}/auth/login`} className="flex flex-col items-center gap-0.5">
          <span className="text-lg text-gray-400">📅</span>
          <span className="text-xs text-gray-400">citas</span>
        </Link>
        <Link href={`/mensana/${slug}/auth/login`} className="flex flex-col items-center gap-0.5">
          <span className="text-lg text-gray-400">👤</span>
          <span className="text-xs text-gray-400">perfil</span>
        </Link>
      </nav>
    </div>
  );
}
