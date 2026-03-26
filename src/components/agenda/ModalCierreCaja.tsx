'use client';

import { useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/config/supabase';
import { X, CheckCircle, AlertCircle, LockKeyhole, MessageCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCajaActualizada: () => void;
  fecha: string;
  reservas: any[]; // reservas del día ya cargadas en la agenda
  profile: any;
}

export default function ModalCierreCaja({
  open,
  onClose,
  onCajaActualizada,
  fecha,
  reservas,
  profile,
}: Props) {
  const { colors } = useTheme();
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cerrada, setCerrada] = useState(false);

  // Reservas listas para cerrar: confirmadas Y pagadas
  const paraCompletar = reservas.filter(
    r => r.estado === 'confirmada' && r.pagado === true
  );

  // Reservas que necesitan atención: confirmadas pero NO pagadas
  const pendientesDeCobro = reservas.filter(
    r => r.estado === 'confirmada' && r.pagado !== true
  );

  const handleCerrarCaja = async () => {
    if (paraCompletar.length === 0) return;
    setCerrando(true);
    setError(null);

    const ids = paraCompletar.map(r => r.id);

    const { error: err } = await supabase
      .from('reservas')
      .update({ estado: 'completada' })
      .in('id', ids);

    setCerrando(false);

    if (err) {
      setError(err.message);
      return;
    }

    setCerrada(true);
    onCajaActualizada();
  };

  const handleWhatsAppPendiente = (reserva: any) => {
    const tel = (reserva.consultante_telefono || '').replace(/\D/g, '');
    if (!tel) return;
    const msg =
      `Hola ${reserva.consultante_nombre || ''}! Te contactamos de ${profile?.empresaNombre || 'la empresa'}. ` +
      `Tenés una sesión del ${reserva.fecha} a las ${reserva.hora_inicio?.substring(0, 5)} pendiente de pago. ` +
      `¿Podemos coordinar el pago o reprogramar?`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: colors.borderLight }}
        >
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition">
            <X size={18} style={{ color: colors.textSecondary }} />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-sm font-bold lowercase" style={{ color: colors.text }}>
              cierre de caja
            </h2>
            <p className="text-xs lowercase mt-0.5" style={{ color: colors.textSecondary }}>
              {fecha}
            </p>
          </div>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 space-y-5">

          {cerrada ? (
            /* Estado: caja cerrada exitosamente */
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle size={48} style={{ color: colors.success || '#16a34a' }} />
              <p className="font-semibold" style={{ color: colors.text }}>
                caja cerrada
              </p>
              <p className="text-sm lowercase" style={{ color: colors.textSecondary }}>
                {paraCompletar.length} sesión{paraCompletar.length !== 1 ? 'es' : ''} marcada
                {paraCompletar.length !== 1 ? 's' : ''} como completada
                {paraCompletar.length !== 1 ? 's' : ''}
              </p>
              {pendientesDeCobro.length > 0 && (
                <p className="text-sm lowercase text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  {pendientesDeCobro.length} sesión{pendientesDeCobro.length !== 1 ? 'es' : ''} pendiente
                  {pendientesDeCobro.length !== 1 ? 's' : ''} de pago — revisalas abajo
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Sección: listas para cerrar */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} style={{ color: colors.success || '#16a34a' }} />
                  <h3 className="text-xs font-semibold lowercase" style={{ color: colors.success || '#16a34a' }}>
                    pasar a completadas ({paraCompletar.length})
                  </h3>
                </div>
                {paraCompletar.length === 0 ? (
                  <p className="text-xs lowercase py-2" style={{ color: colors.textMuted }}>
                    no hay sesiones pagadas para cerrar
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {paraCompletar.map(r => (
                      <div
                        key={r.id}
                        className="rounded-lg px-3 py-2.5"
                        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium" style={{ color: colors.text }}>
                            {r.consultante_nombre || 'Sin nombre'}
                          </p>
                          <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                            {r.precio_total ? `$${r.precio_total}` : '—'}
                          </span>
                        </div>
                        <p className="text-xs lowercase mt-0.5" style={{ color: colors.textSecondary }}>
                          {r.hora_inicio?.substring(0, 5)}
                          {r.servicio_nombre ? ` · ${r.servicio_nombre}` : ''}
                          {r.metodo_pago ? ` · ${r.metodo_pago}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sección: pendientes de cobro */}
              {pendientesDeCobro.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-500" />
                    <h3 className="text-xs font-semibold lowercase text-amber-600">
                      pendientes de cobro ({pendientesDeCobro.length})
                    </h3>
                  </div>
                  <p className="text-xs lowercase" style={{ color: colors.textMuted }}>
                    estas sesiones no se van a cerrar. podés contactar al cliente para cobrar o reprogramar.
                  </p>
                  <div className="space-y-1.5">
                    {pendientesDeCobro.map(r => (
                      <div
                        key={r.id}
                        className="rounded-lg px-3 py-2.5"
                        style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                              {r.consultante_nombre || 'Sin nombre'}
                            </p>
                            <p className="text-xs lowercase mt-0.5" style={{ color: colors.textSecondary }}>
                              {r.hora_inicio?.substring(0, 5)}
                              {r.servicio_nombre ? ` · ${r.servicio_nombre}` : ''}
                              {r.precio_total ? ` · $${r.precio_total}` : ''}
                            </p>
                          </div>
                          {r.consultante_telefono && (
                            <button
                              onClick={() => handleWhatsAppPendiente(r)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition"
                            >
                              <MessageCircle size={12} />
                              WA
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!cerrada && (
          <div className="px-5 py-4 border-t" style={{ borderColor: colors.borderLight, background: colors.primaryFaded }}>
            <button
              onClick={handleCerrarCaja}
              disabled={cerrando || paraCompletar.length === 0}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
              style={{ background: colors.primary }}
            >
              <LockKeyhole size={16} />
              {cerrando
                ? 'cerrando...'
                : paraCompletar.length === 0
                ? 'no hay sesiones para cerrar'
                : `cerrar caja · ${paraCompletar.length} sesión${paraCompletar.length !== 1 ? 'es' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
