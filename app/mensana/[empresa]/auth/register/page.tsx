'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

export default function EmpresaRegisterPage() {
  const params = useParams();
  const slug = params.empresa as string;
  const router = useRouter();
  const { register } = useAuth();
  const { colors, logoUrl, empresaNombre } = useTheme();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    const result = await register(email, password, nombre);
    if ((result as any).success) {
      setExito(true);
    } else {
      setError((result as any).error?.message || 'Error al crear la cuenta');
    }
    setLoading(false);
  };

  if (exito) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: colors.background }}>
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">¡cuenta creada!</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          revisá tu email para confirmar la cuenta y luego iniciá sesión.
        </p>
        <Link href={`/mensana/${slug}/auth/login`}
          className="px-8 py-3 rounded-xl font-bold text-white text-sm"
          style={{ backgroundColor: colors.primary }}>
          iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.background }}>
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">crear cuenta</h1>
          <p className="text-sm text-gray-500">registrate en {empresaNombre || 'mensana'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border bg-white text-gray-800 focus:outline-none"
              style={{ borderColor: colors.border }}
              placeholder="Tu nombre y apellido"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border bg-white text-gray-800 focus:outline-none"
              style={{ borderColor: colors.border }}
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
              placeholder="mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border bg-white text-gray-800 focus:outline-none"
              style={{ borderColor: colors.border }}
              placeholder="repetí tu contraseña"
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
            {loading ? 'creando cuenta...' : 'crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿ya tenés cuenta?{' '}
          <Link href={`/mensana/${slug}/auth/login`} className="font-bold" style={{ color: colors.primary }}>
            iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
