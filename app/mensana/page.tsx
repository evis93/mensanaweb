'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/config/supabase';
import { Building2, Plus, Users } from 'lucide-react';

export default function MensanaPage() {
  const { colors } = useTheme();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('empresas')
      .select('id, nombre, descripcion, logo_url, activo, color_primary')
      .order('nombre')
      .then(({ data }) => {
        if (data) setEmpresas(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Gestión de Empresas</h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Panel de superadmin Mensana</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <Building2 size={20} style={{ color: colors.primary }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.primary }}>{empresas.length}</p>
              <p className="text-xs" style={{ color: colors.textSecondary }}>Empresas total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <Users size={20} style={{ color: colors.success }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.success }}>
                {empresas.filter(e => e.activo).length}
              </p>
              <p className="text-xs" style={{ color: colors.textSecondary }}>Activas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de empresas */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
        </div>
      ) : (
        <div className="space-y-3">
          {empresas.map(empresa => (
            <div
              key={empresa.id}
              className="bg-white rounded-xl border p-4 flex items-center gap-4"
              style={{ borderColor: colors.border, opacity: empresa.activo ? 1 : 0.6 }}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: empresa.color_primary || colors.primary }}
              >
                {empresa.logo_url
                  ? <img src={empresa.logo_url} alt="" className="h-full w-full rounded-xl object-cover" />
                  : empresa.nombre?.charAt(0)
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: colors.text }}>{empresa.nombre}</p>
                {empresa.descripcion && (
                  <p className="text-sm truncate mt-0.5" style={{ color: colors.textSecondary }}>{empresa.descripcion}</p>
                )}
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                style={{ background: empresa.activo ? '#d1fae5' : '#fee2e2', color: empresa.activo ? '#065f46' : '#991b1b' }}
              >
                {empresa.activo ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
