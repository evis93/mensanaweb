'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import SelectorEmpresas from '@/src/components/SelectorEmpresas';

export default function SeleccionarEmpresaPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  // Sin sesión → login
  useEffect(() => {
    if (!loading && !profile) {
      router.replace('/auth/login');
    }
  }, [loading, profile, router]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#43b9e5]" />
      </div>
    );
  }

  return <SelectorEmpresas />;
}
