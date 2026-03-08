'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <Link href={`/mensana/${slug}`} className="w-8 h-8 flex items-center justify-center text-gray-500 text-xl">‹</Link>
        <div className="flex items-center gap-2">
          {logoUrl && <img src={logoUrl} alt="logo" className="w-7 h-7 rounded-lg object-cover" />}
          <span className="text-base font-bold" style={{ color: colors.primary }}>{empresaNombre || 'mensana'}</span>
        </div>
        <div className="w-8" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">iniciar sesión</h1>
          <p className="text-sm text-gray-500">ingresá con tu cuenta de {empresaNombre || 'mensana'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border bg-white text-gray-800 focus:outline-none focus:ring-2"
              style={{ borderColor: colors.border, focusRingColor: colors.primary } as any}
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border bg-white text-gray-800 focus:outline-none"
              style={{ borderColor: colors.border }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-sm mt-2 disabled:opacity-60"
            style={{ backgroundColor: colors.primary }}
          >
            {loading ? 'ingresando...' : 'iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            ¿no tenés cuenta?{' '}
            <Link href={`/mensana/${slug}/auth/register`} className="font-bold" style={{ color: colors.primary }}>
              crear cuenta
            </Link>
          </p>
        </div>

        <div className="mt-3 text-center">
          <Link href="/auth/recuperar-contrasena" className="text-xs text-gray-400 hover:underline">
            olvidé mi contraseña
          </Link>
        </div>
      </div>
    </div>
  );
}
