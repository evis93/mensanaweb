import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/src/context/AuthContext';
import { BusinessProvider } from '@/src/context/BusinessContext';
import { ThemeProvider } from '@/src/context/ThemeContext';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', weight: ['400', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Mensana',
  description: 'Sistema de gestión de turnos y reservas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${manrope.variable} font-[family-name:var(--font-manrope)] antialiased`} suppressHydrationWarning>
        <BusinessProvider>
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </BusinessProvider>
      </body>
    </html>
  );
}
