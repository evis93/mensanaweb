/**
 * Layout de /mensana — passthrough sin lógica.
 *
 * La protección de superadmin vive en app/mensana/page.tsx directamente.
 * Las páginas públicas de empresa (/mensana/[slug]/*) se renderizan
 * limpias sin ningún wrapper de dashboard.
 */
export default function MensanaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
