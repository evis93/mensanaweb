'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { colors, logoUrl, empresaNombre } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Completá el email y la contraseña');
      return;
    }
    setError('');
    setLoading(true);

    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.error?.message || 'Email o contraseña incorrectos');
      return;
    }

    router.replace('/');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.secondary} 100%)` }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="flex justify-center mb-4">
              <img src={logoUrl} alt={empresaNombre || 'logo'} className="w-14 h-14 rounded-2xl object-cover" />
            </div>
          ) : (
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white text-2xl font-bold mb-4"
              style={{ background: colors.primary }}
            >
              M
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Bienvenido</h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            Ingresá a {empresaNombre ? `${empresaNombre}` : 'tu cuenta de Mensana'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition"
              style={{ borderColor: colors.border, '--tw-ring-color': colors.primary } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 transition"
                style={{ borderColor: colors.border }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.textMuted }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ color: colors.error, background: colors.error + '15' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-2.5 px-4 rounded-lg transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: colors.primary }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: colors.textSecondary }}>
          ¿No tenés cuenta?{' '}
          <Link href="/auth/register" className="font-medium hover:underline" style={{ color: colors.primary }}>
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
