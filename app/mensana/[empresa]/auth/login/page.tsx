'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

export default function EmpresaLoginPage() {
  const params = useParams();
  const slug = params.empresa as string;
  const router = useRouter();
  const { login, session, profile } = useAuth();
  const { colors, logoUrl, empresaNombre } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session || !profile) return;
    switch (profile.rol) {
      case 'admin': case 'superadmin': router.replace('/admin'); break;
      case 'profesional': router.replace('/profesional'); break;
      case 'cliente': router.replace('/cliente'); break;
    }
  }, [session, profile, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!(result as any).success) {
      setError((result as any).error?.message || 'Email o contraseña incorrectos');
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white">

      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center bg-white px-4 py-4 justify-between">
    </header>

      <main className="flex-1 flex flex-col px-6 pb-12">

        {/* Logo */}
        <div className="mt-8 mb-12 flex justify-center">
          <div
            className="w-full max-w-[200px] aspect-[3/1] rounded-xl flex items-center justify-center overflow-hidden"
            style={{ border: logoUrl ? 'none' : '1.5px dashed #d1d5db', background: logoUrl ? 'transparent' : '#f9fafb' }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={empresaNombre || slug}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-2xl font-bold" style={{ color: colors.primary }}>
                {empresaNombre || slug}
              </span>
            )}
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-md mx-auto">

          {/* Bienvenida */}
          <div className="flex flex-col gap-1 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h1>
            <p className="text-sm text-gray-500">Ingresá tus credenciales para acceder.</p>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="flex flex-col w-full">
              <p className="text-sm font-semibold text-gray-800 pb-1.5 px-1">Correo electrónico</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="nombre@clinica.com"
                className="w-full h-14 rounded-lg border border-gray-200 bg-white px-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': colors.primary + '33', borderColor: 'border' } as any}
                onFocus={e => { e.currentTarget.style.borderColor = colors.primary; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              />
            </label>
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-2">
            <label className="flex flex-col w-full">
              <p className="text-sm font-semibold text-gray-800 pb-1.5 px-1">Contraseña</p>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full h-14 rounded-lg border border-gray-200 bg-white pl-4 pr-12 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all"
                  onFocus={e => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>
          </div>

          {/* Olvidé contraseña */}
          <div className="flex justify-center py-2">
            <Link
              href="/auth/recuperar-contrasena"
              className="text-sm font-semibold hover:underline underline-offset-4 decoration-2"
              style={{ color: colors.primary }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
          )}

          {/* Botón */}
          <div className="mt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                backgroundColor: colors.primary,
                boxShadow: `0 8px 24px ${colors.primary}33`,
              }}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </div>

          {/* Seguridad */}
          <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
            <Lock size={14} />
            <p className="text-xs font-medium uppercase tracking-widest">Conexión Segura Encriptada</p>
          </div>

        </form>
      </main>

      {/* Footer */}
      <footer className="mt-auto p-6 text-center">
        <p className="text-xs text-gray-400">
          ¿No tenés cuenta?{' '}
          <Link
            href={`/mensana/${slug}/auth/register`}
            className="font-bold"
            style={{ color: colors.primary }}
          >
            Crear cuenta
          </Link>
        </p>
        <div className="h-8" />
      </footer>

    </div>
  );
}
