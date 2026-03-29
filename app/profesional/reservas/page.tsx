'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import BadgeEstadoReserva from '@/src/components/reservas/BadgeEstadoReserva';
import AccionesReserva from '@/src/components/reservas/AccionesReserva';
import type { ReservaEstado } from '@/src/types/reservas';

const TABS: { label: string; estados: ReservaEstado[] }[] = [
  { label: 'Pendientes',  estados: ['PENDIENTE', 'CAMBIO_SOLICITADO'] },
  { label: 'Confirmadas', estados: ['CONFIRMADA'] },
  { label: 'Historial',   estados: ['COMPLETADA', 'RECHAZADA', 'CANCELADA_CLIENTE', 'CANCELADA_PROFESIONAL'] },
];

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ReservasProfesionalPage() {
  const { profile } = useAuth();
  const { colors }  = useTheme();

  const [reservas, setReservas]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const cargar = useCallback(async () => {
    if (!profile?.usuarioId) return;
    setLoading(true);
    const res  = await fetch(`/api/reservas?profesionalId=${profile.usuarioId}`);
    const json = await res.json();
    if (json.success) setReservas(json.data ?? []);
    setLoading(false);
  }, [profile?.usuarioId]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = useMemo(() => {
    const estados = TABS[activeTab].estados;
    return reservas.filter(r => estados.includes(r.estado));
  }, [reservas, activeTab]);

  const pendientesCount = useMemo(
    () => reservas.filter(r => r.estado === 'PENDIENTE' || r.estado === 'CAMBIO_SOLICITADO').length,
    [reservas]
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Mis Reservas</h1>
        <button onClick={cargar} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <RefreshCw size={18} style={{ color: colors.textSecondary }} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition',
              activeTab === i ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
            style={activeTab === i ? { color: colors.primary } : {}}
          >
            {tab.label}
            {i === 0 && pendientesCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-white font-bold bg-red-500"
                style={{ fontSize: '10px', padding: '0 4px' }}>
                {pendientesCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p style={{ color: colors.textSecondary }}>No hay reservas {TABS[activeTab].label.toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(r => (
            <div
              key={r.id}
              className="bg-white rounded-xl border p-4"
              style={{ borderColor: colors.border, borderLeft: `4px solid ${colors.primary}` }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: colors.text }}>
                    {r.cliente_nombre}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                    {r.servicio_nombre} · {formatearFechaHora(r.fecha_hora_inicio)}
                  </p>
                  {r.sena_monto > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                      Seña: ${r.sena_monto} ({r.sena_estado})
                    </p>
                  )}
                  {r.motivo_cambio && (
                    <p className="text-xs mt-1 italic" style={{ color: colors.textSecondary }}>
                      "{r.motivo_cambio}"
                    </p>
                  )}
                </div>
                <BadgeEstadoReserva estado={r.estado} />
              </div>

              <AccionesReserva
                reserva={{
                  id:                 r.id,
                  estado:             r.estado,
                  clienteNombre:      r.cliente_nombre,
                  clienteTelefono:    r.cliente_telefono,
                  profesionalNombre:  r.profesional_nombre,
                  profesionalTelefono:r.profesional_telefono,
                  servicioNombre:     r.servicio_nombre,
                  fechaHoraInicio:    r.fecha_hora_inicio,
                  empresaSlug:        r.empresa_slug,
                }}
                onActualizado={cargar}
                modoProfesional
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
