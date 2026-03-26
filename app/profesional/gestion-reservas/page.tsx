'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ReservaController } from '@/src/controllers/ReservaController';
import ModalPago from '@/src/components/reservas/ModalPago';
import { RefreshCw, MessageCircle, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

const TABS = ['Pendientes', 'Confirmadas', 'Historial'];

export default function GestionReservasPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState(0);
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagoModal, setPagoModal] = useState<{ open: boolean; reserva: any | null }>({ open: false, reserva: null });

  const cargarReservas = useCallback(async () => {
    setLoading(true);
    const result = await ReservaController.obtenerTodas(profile);
    if (result.success) setReservas((result as any).data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { cargarReservas(); }, [cargarReservas]);

  const reservasFiltradas = useMemo(() => {
    if (activeTab === 0) return reservas.filter(r => r.estado === 'pendiente');
    if (activeTab === 1) return reservas.filter(r => r.estado === 'confirmada');
    return reservas.filter(r => r.estado === 'cancelada' || r.estado === 'completada');
  }, [reservas, activeTab]);

  const handleConfirmar = async (id: string) => {
    await ReservaController.actualizarEstado(id, 'confirmada', profile);
    cargarReservas();
  };

  const handleRechazar = async (id: string) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    await ReservaController.actualizarEstado(id, 'cancelada', profile);
    cargarReservas();
  };

  const handleWhatsApp = (reserva: any) => {
    const tel = reserva.consultante?.telefono || '';
    const msg = `Hola ${reserva.consultante?.nombre || ''}, tu reserva para el ${reserva.fecha} a las ${reserva.hora_inicio} ha sido confirmada.`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const estadoColor: Record<string, string> = {
    pendiente: '#FFF3CD',
    confirmada: '#d1fae5',
    cancelada: '#fee2e2',
    completada: '#e0e7ff',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Gestión de Reservas</h1>
        <button onClick={cargarReservas} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <RefreshCw size={18} style={{ color: colors.textSecondary }} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab, i) => {
          const pendientesCount = i === 0 ? reservas.filter(r => r.estado === 'pendiente').length : 0;
          return (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition', activeTab === i ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            style={activeTab === i ? { color: colors.primary } : {}}
          >
            {tab}
            {pendientesCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-white font-bold"
                style={{ background: '#ef4444', fontSize: '10px', padding: '0 4px' }}
              >
                {pendientesCount}
              </span>
            )}
          </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
        </div>
      ) : reservasFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p style={{ color: colors.textSecondary }}>No hay reservas {TABS[activeTab].toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservasFiltradas.map(reserva => (
            <div
              key={reserva.id}
              className="bg-white rounded-xl border p-4"
              style={{ borderColor: colors.border, borderLeft: `4px solid ${colors.primary}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold" style={{ color: colors.text }}>
                    {reserva.consultante?.nombre || reserva.consultante_nombre || 'Sin nombre'}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                    {reserva.fecha} · {reserva.hora_inicio?.substring(0, 5)}
                    {reserva.profesional?.nombre ? ` · ${reserva.profesional.nombre}` : ''}
                  </p>
                  {reserva.precio_total != null && (
                    <p className="text-sm font-medium mt-1" style={{ color: colors.primary }}>
                      ${reserva.precio_total} {reserva.pagado ? '✅ Pagado' : '⏳ Pendiente de pago'}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: estadoColor[reserva.estado] || '#f3f4f6' }}
                >
                  {reserva.estado}
                </span>
              </div>

              <div className="flex gap-2 mt-3 flex-wrap">
                {reserva.estado === 'pendiente' && (
                  <>
                    <button
                      onClick={() => handleConfirmar(reserva.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ background: colors.success }}
                    >
                      <Check size={12} /> Confirmar
                    </button>
                    <button
                      onClick={() => handleRechazar(reserva.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600"
                    >
                      <X size={12} /> Rechazar
                    </button>
                  </>
                )}
                {!reserva.pagado && (
                  <button
                    onClick={() => setPagoModal({ open: true, reserva })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ background: colors.primary }}
                  >
                    💰 Registrar pago
                  </button>
                )}
                {(reserva.consultante?.telefono || reserva.consultante_telefono) && (
                  <button
                    onClick={() => handleWhatsApp(reserva)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagoModal.open && pagoModal.reserva && (
        <ModalPago
          open={pagoModal.open}
          onClose={() => setPagoModal({ open: false, reserva: null })}
          onSaved={() => { setPagoModal({ open: false, reserva: null }); cargarReservas(); }}
          reserva={pagoModal.reserva}
          profile={profile}
        />
      )}
    </div>
  );
}
