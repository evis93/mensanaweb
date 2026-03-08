'use client';

import Sidebar from './Sidebar';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { colors, empresaNombre } = useTheme();
  const { profile } = useAuth();

  const isMensana = profile?.rol === 'superadmin';

  return (
    <div className="flex min-h-screen" style={{ background: colors.background }}>
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Header secundario — color de la empresa */}
        <header
          className="flex items-center px-5 py-3 flex-shrink-0"
          style={{ backgroundColor: colors.secondary }}
        >
          <span className="text-sm font-bold text-white/90 lowercase tracking-wide">
            {empresaNombre || 'mensana'}
          </span>
        </header>

        <div className="flex-1">
          {children}
        </div>

        <footer className="px-6 py-4 border-t text-center" style={{ borderColor: colors.borderLight }}>
          <p className="text-xs" style={{ color: colors.textMuted }}>© 2026 mensana</p>
          {!isMensana && (
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              Powered by{' '}
              <span style={{ color: colors.primary }} className="font-semibold">mensana</span>
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}
