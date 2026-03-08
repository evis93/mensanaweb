'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';

export default function RootPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.replace('/auth/login');
      return;
    }

    const rol = profile.rol;
    if (rol === 'superadmin') router.replace('/mensana');
    else if (rol === 'admin') router.replace('/admin');
    else if (rol === 'profesional') router.replace('/profesional');
    else if (rol === 'cliente') router.replace('/cliente');
    else router.replace('/auth/login');
  }, [profile, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );
}
