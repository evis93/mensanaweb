import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  devIndicators: false,

  async rewrites() {
    return [
      // El SW debe estar en la raíz del dominio para tener scope completo.
      // Lo servimos dinámicamente desde /api/sw (branding por tenant).
      {
        source: '/sw.js',
        destination: '/api/sw',
      },
      // El manifest también es dinámico: nombre, colores e iconos por tenant.
      {
        source: '/manifest.webmanifest',
        destination: '/api/manifest',
      },
    ];
  },
};

export default nextConfig;
