'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GestionReservasRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/profesional/reservas'); }, [router]);
  return null;
}
