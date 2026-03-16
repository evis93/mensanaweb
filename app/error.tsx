'use client';

import Link from 'next/link';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#f8fbff]">
      <div className="text-6xl mb-6">⚠️</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">algo salió mal</h1>
      <p className="text-sm text-gray-500 max-w-xs mb-8">
        Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-full text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          reintentar
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-full text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          ir al inicio
        </Link>
      </div>
    </div>
  );
}
