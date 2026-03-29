'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Clock,
  Users,
  UserRound,
  Sparkles,
  BarChart3,
  Building2,
  Home,
  LogOut,
  LayoutDashboard,
  KeyRound,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Agenda Diaria', href: '/admin/agenda', icon: <Home size={18} /> },
  { label: 'Gestión de Reservas', href: '/admin/gestion-reservas', icon: <ClipboardList size={18} /> },
  { label: 'Horarios', href: '/admin/horarios', icon: <Clock size={18} /> },
  { label: 'Profesionales', href: '/admin/profesionales', icon: <Users size={18} /> },
  { label: 'Clientes', href: '/admin/clientes', icon: <UserRound size={18} /> },
  { label: 'Servicios', href: '/admin/servicios', icon: <Sparkles size={18} /> },
  { label: 'Agenda mensual', href: '/admin/agenda-mensual', icon: <CalendarRange size={18} /> },
  { label: 'Reportes', href: '/admin/reportes', icon: <BarChart3 size={18} /> },
  { label: 'Administración', href: '/admin', icon: <LayoutDashboard size={18} /> },
];

const PROFESIONAL_NAV: NavItem[] = [
  { label: 'Agenda Diaria', href: '/profesional/agenda', icon: <Home size={18} /> },
  { label: 'Agenda mensual', href: '/profesional/agenda-mensual', icon: <CalendarRange size={18} /> },
  { label: 'Reservas', href: '/profesional/reservas', icon: <ClipboardList size={18} /> },
  { label: 'Horarios', href: '/profesional/horarios', icon: <Clock size={18} /> },
];

const CLIENTE_NAV: NavItem[] = [
  { label: 'Inicio', href: '/cliente', icon: <Home size={18} /> },
  { label: 'Explorar', href: '/cliente/explorar-profesionales', icon: <Building2 size={18} /> },
];

const MENSANA_NAV: NavItem[] = [
  { label: 'Empresas', href: '/mensana', icon: <Building2 size={18} /> },
];

function getNavByRol(rol: string | null): NavItem[] {
  if (rol === 'admin' || rol === 'superadmin') return ADMIN_NAV;
  if (rol === 'profesional') return PROFESIONAL_NAV;
  if (rol === 'cliente') return CLIENTE_NAV;
  return MENSANA_NAV;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const { colors, logoUrl, empresaNombre } = useTheme();
  const [logoFailed, setLogoFailed] = React.useState(false);

  React.useEffect(() => { setLogoFailed(false); }, [logoUrl]);

  const nav = getNavByRol(profile?.rol ?? null);

  return (
    <aside
      className="flex flex-col w-60 min-h-screen border-r border-gray-200 bg-white shadow-sm"
      style={{ borderColor: colors.border }}
    >
      {/* Logo / empresa */}
      <div
        className="flex flex-col items-center gap-2 px-5 py-5 border-b"
        style={{ borderColor: colors.border }}
      >
        {logoUrl && !logoFailed ? (
          <img
            src={logoUrl}
            alt="logo"
            className="h-12 w-auto max-w-[140px] object-contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
            style={{ background: colors.primary }}
          >
            {empresaNombre?.charAt(0)?.toUpperCase() || 'M'}
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && item.href !== '/profesional' && item.href !== '/cliente' && item.href !== '/mensana' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
              style={isActive ? { background: colors.primary, color: colors.headerText || '#fff' } : {}}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div
        className="px-4 py-4 border-t space-y-3"
        style={{ borderColor: colors.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: colors.primaryDark }}
          >
            {profile?.nombre_completo?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate" style={{ color: colors.text }}>
              {profile?.nombre_completo || 'Usuario'}
            </p>
            <p className="text-xs truncate" style={{ color: colors.textSecondary }}>
              {profile?.rol || ''}
            </p>
          </div>
        </div>
        <Link
          href="/cuenta/cambiar-contrasena"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <KeyRound size={16} />
          Cambiar contraseña
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
