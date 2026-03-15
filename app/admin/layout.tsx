'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import DashboardLayout from '@/src/components/layout/DashboardLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace('/');
    } else if (profile.rol !== 'admin' && profile.rol !== 'superadmin') {
      router.replace('/');
    }
  }, [profile, loading, router]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
