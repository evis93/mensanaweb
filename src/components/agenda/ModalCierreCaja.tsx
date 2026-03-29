'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { X, CheckCircle, AlertCircle, LockKeyhole, MessageCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Props {
  open: boolean;
  onClose: () => void;
  onCajaActualizada: () => void;
  fecha: string;
  reservas: any[];   // reservas del día ya cargadas en la agenda (estados viejos — compatibilidad)
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

  const [cerrando, setCerrando]         = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [cerrada, setCerrada]           = useState(false);
  const [resumen, setResumen]           = useState<Record<string, number> | null>(null);

  // Pendientes desde la nueva API (estados nuevos MAYÚSCULAS)
  const [pendientesNuevos, setPendientesNuevos] = useState<any[]>([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);

  // Compatibilidad con estados viejos (minúsculas) de la agenda
  const paraCompletar      = reservas.filter(r => r.estado === 'confirmada' && r.pagado === true);
  const pendientesDeCobro  = reservas.filter(r => r.estado === 'confirmada' && r.pagado !== true);

  // Al abrir, consultar pendientes nuevos en la API
  useEffect(() => {
    if (!open || !profile?.empresaId) return;
    setCargandoPendientes(true);
    fetch(`/api/admin/cierre-dia?empresaId=${profile.empresaId}`)
      .then(r => r.json())
      .then(json => { if (json.success) setPendientesNuevos(json.pendientes ?? []); })
      .finally(() => setCargandoPendientes(false));
  }, [open, profile?.empresaId]);

  const puedesCerrar = pendientesNuevos.length === 0;

  const handleCerrarCaja = async () => {
    if (!puedesCerrar) return;
    setCerrando(true);
    setError(null);

    try {
      const res  = await fetch('/api/admin/cierre-dia', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ empresaId: profile.empresaId }),
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setResumen(json.resumen);
      setCerrada(true);
      onCajaActualizada();
    } catch (e: any) {
      setError(e.message || 'Error al cerrar la caja');
    }
    setCerrando(false);
  };

  const handleWhatsAppPendiente = (reserva: any) => {
    const tel = (reserva.consultante_telefono || reserva.cliente_telefono || '').replace(/\D/g, '');
    if (!tel) return;
    const msg =
      `Hola ${reserva.consultante_nombre || reserva.cliente_nombre || ''}! ` +
      `Tenés un turno pendiente de confirmar para el ${fecha}. ` +
      `Por favor respondé a la brevedad.`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: colors.borderLight }}>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition">
            <X size={18} style={{ color: colors.textSecondary }} />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-sm font-bold lowercase" style={{ color: colors.text }}>cierre de caja</h2>
            <p className="text-xs lowercase mt-0.5" style={{ color: colors.textSecondary }}>{fecha}</p>
          </div>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 space-y-5">

          {cerrada ? (
            /* ── Caja cerrada exitosamente ── */
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle size={48} style={{ color: '#16a34a' }} />
              <p className="font-semibold" style={{ color: colors.text }}>caja cerrada</p>
              {resumen && (
                <div className="text-sm space-y-1" style={{ color: colors.textSecondary }}>
                  {resumen['CONFIRMADA']          && <p>✓ {resumen['CONFIRMADA']} confirmadas archivadas</p>}
                  {resumen['RECHAZADA']           && <p>✓ {resumen['RECHAZADA']} rechazadas eliminadas</p>}
                  {resumen['CANCELADA_CLIENTE']   && <p>✓ {resumen['CANCELADA_CLIENTE']} canceladas por cliente</p>}
                  {resumen['CANCELADA_PROFESIONAL'] && <p>✓ {resumen['CANCELADA_PROFESIONAL']} canceladas por profesional</p>}
                </div>
              )}
            </div>

          ) : (
            <>
              {/* ── Bloqueo: hay pendientes sin resolver ── */}
              {cargandoPendientes ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: colors.primary }} />
                </div>
              ) : pendientesNuevos.length > 0 ? (
                <section className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">No podés cerrar la caja todavía</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Hay {pendientesNuevos.length} reserva{pendientesNuevos.length !== 1 ? 's' : ''} pendiente{pendientesNuevos.length !== 1 ? 's' : ''} sin confirmar o rechazar.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {pendientesNuevos.map((r: any) => (
                      <div key={r.id} className="rounded-lg px-3 py-2.5 bg-amber-50 border border-amber-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                              {r.cliente_nombre}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                              {r.servicio_nombre} · {new Date(r.fecha_hora_inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              {r.profesional_nombre ? ` · ${r.profesional_nombre}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.cliente_telefono && (
                              <button
                                onClick={() => handleWhatsAppPendiente(r)}
                                className="p-1.5 rounded-lg bg-green-50 text-green-700"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle size={13} />
                              </button>
                            )}
                            <Link
                              href={`/admin/gestion-reservas`}
                              onClick={onClose}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium text-white"
                              style={{ background: colors.primary }}
                            >
                              Resolver
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              ) : (
                <>
                  {/* ── Listas para cerrar (estados viejos, compatibilidad) ── */}
                  <section className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} style={{ color: '#16a34a' }} />
                      <h3 className="text-xs font-semibold lowercase" style={{ color: '#16a34a' }}>
                        pasar a completadas ({paraCompletar.length})
                      </h3>
                    </div>
                    {paraCompletar.length === 0 ? (
                      <p className="text-xs lowercase py-2" style={{ color: colors.textSecondary }}>
                        no hay sesiones pagadas para cerrar
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {paraCompletar.map(r => (
                          <div key={r.id} className="rounded-lg px-3 py-2.5" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium" style={{ color: colors.text }}>
                                {r.consultante_nombre || 'Sin nombre'}
                              </p>
                              <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                                {r.precio_total ? `$${r.precio_total}` : '—'}
                              </span>
                            </div>
                            <p className="text-xs lowercase mt-0.5" style={{ color: colors.textSecondary }}>
                              {r.hora_inicio?.substring(0, 5)}{r.servicio_nombre ? ` · ${r.servicio_nombre}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* ── Pendientes de cobro (estados viejos) ── */}
                  {pendientesDeCobro.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-500" />
                        <h3 className="text-xs font-semibold lowercase text-amber-600">
                          pendientes de cobro ({pendientesDeCobro.length})
                        </h3>
                      </div>
                      <div className="space-y-1.5">
                        {pendientesDeCobro.map(r => (
                          <div key={r.id} className="rounded-lg px-3 py-2.5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium" style={{ color: colors.text }}>
                                  {r.consultante_nombre || 'Sin nombre'}
                                </p>
                                <p className="text-xs lowercase mt-0.5" style={{ color: colors.textSecondary }}>
                                  {r.hora_inicio?.substring(0, 5)}{r.servicio_nombre ? ` · ${r.servicio_nombre}` : ''}
                                </p>
                              </div>
                              {r.consultante_telefono && (
                                <button
                                  onClick={() => handleWhatsAppPendiente(r)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700"
                                >
                                  <MessageCircle size={12} /> WA
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        {!cerrada && (
          <div className="px-5 py-4 border-t" style={{ borderColor: colors.borderLight, background: colors.primaryFaded }}>
            <button
              onClick={handleCerrarCaja}
              disabled={cerrando || !puedesCerrar || cargandoPendientes}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
              style={{ background: colors.primary }}
            >
              <LockKeyhole size={16} />
              {cerrando
                ? 'cerrando...'
                : !puedesCerrar
                ? 'resolvé las reservas pendientes primero'
                : 'cerrar caja'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
