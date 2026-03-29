'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ProfesionalController } from '@/src/controllers/ProfesionalController';
import ModalReserva from '@/src/components/reservas/ModalReserva';
import ModalFicha from '@/src/components/reservas/ModalFicha';
import ModalAccesoCliente from '@/src/components/reservas/ModalAccesoCliente';
import ModalCierreCaja from '@/src/components/agenda/ModalCierreCaja';
import BadgeEstadoReserva from '@/src/components/reservas/BadgeEstadoReserva';
import AccionesReserva from '@/src/components/reservas/AccionesReserva';
import { ChevronLeft, ChevronRight, ClipboardList, LockKeyhole } from 'lucide-react';
import { clsx } from 'clsx';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const HORARIOS = Array.from({ length: 13 }, (_, i) => i + 8); // 8–20 h

function getHoraLocal(iso: string) {
  return new Date(iso).getHours();
}

function formatHoraLocal(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function AgendaProfesionalPage() {
  const { profile } = useAuth();
  const { colors }  = useTheme();

  const hoy = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate]   = useState(hoy);
  const [reservas, setReservas]           = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [modalOpen, setModalOpen]         = useState(false);
  const [fichaModal, setFichaModal]       = useState<{ open: boolean; reserva: any | null }>({ open: false, reserva: null });
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
  const [cierreCajaOpen, setCierreCajaOpen]     = useState(false);

  const [accesoModal, setAccesoModal] = useState<{
    open: boolean; clienteId: string; clienteNombre: string; clienteTelefono: string;
  }>({ open: false, clienteId: '', clienteNombre: '', clienteTelefono: '' });

  const [horaActual, setHoraActual] = useState(new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHoraActual(new Date().getHours()), 60000);
    return () => clearInterval(id);
  }, []);

  const cargarReservas = useCallback(async () => {
    if (!profile?.empresaId || !profile?.profesionalId) return;
    setLoading(true);
    const desde = `${selectedDate}T00:00:00`;
    const hasta  = `${selectedDate}T23:59:59`;
    const res  = await fetch(
      `/api/reservas?empresaId=${profile.empresaId}&profesionalId=${profile.profesionalId}&fechaDesde=${desde}&fechaHasta=${hasta}`
    );
    const json = await res.json();
    if (json.success) setReservas(json.data ?? []);
    setLoading(false);
  }, [selectedDate, profile?.empresaId, profile?.profesionalId]);

  useEffect(() => { cargarReservas(); }, [cargarReservas]);

  useEffect(() => {
    ProfesionalController.obtenerProfesionales(profile).then(r => {
      if (r.success && 'data' in r) setProfesionales((r as any).data || []);
    });
  }, [profile]);

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const base = new Date(selectedDate + 'T12:00:00');
    base.setDate(base.getDate() + (i - 3));
    const str = base.toISOString().split('T')[0];
    return { fecha: str, diaSemana: DIAS_SEMANA[base.getDay()], diaNumero: base.getDate(), esHoy: str === hoy };
  });

  const fechaFormateada = (() => {
    const f = new Date(selectedDate + 'T12:00:00');
    return `${DIAS_SEMANA[f.getDay()]}, ${f.getDate()} de ${MESES[f.getMonth()]}`;
  })();

  const getReservasParaHora = (hora: number) =>
    reservas.filter(r => getHoraLocal(r.fecha_hora_inicio) === hora);

  const getReservaStyle = (estado: string) => {
    if (estado === 'CONFIRMADA' || estado === 'COMPLETADA') {
      return { background: colors.primaryFaded, borderLeft: `4px solid ${colors.primary}` };
    }
    if (estado === 'CANCELADA_CLIENTE' || estado === 'CANCELADA_PROFESIONAL' || estado === 'RECHAZADA') {
      return { background: '#f3f4f6', borderLeft: '4px solid #9ca3af' };
    }
    return { background: '#fffbeb', borderLeft: '4px solid #f59e0b' };
  };

  const navFecha = (dir: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNuevoClienteCreado = (clienteId: string, clienteNombre: string, clienteTelefono: string) => {
    setAccesoModal({ open: true, clienteId, clienteNombre, clienteTelefono });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Agenda</h1>
          <button
            onClick={() => setCierreCajaOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition hover:opacity-80"
            style={{ background: colors.primaryFaded, color: colors.primary }}
          >
            <LockKeyhole size={14} />
            cerrar caja
          </button>
        </div>

        {/* Navegación de días */}
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => navFecha(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft size={20} style={{ color: colors.text }} />
          </button>
          <div className="flex gap-1 flex-1 justify-center">
            {diasSemana.map(d => (
              <button
                key={d.fecha}
                onClick={() => setSelectedDate(d.fecha)}
                className="flex flex-col items-center px-3 py-2 rounded-xl transition-all text-center flex-1 max-w-[64px]"
                style={{
                  background: d.fecha === selectedDate ? colors.primary : 'transparent',
                  color:      d.fecha === selectedDate ? '#fff' : colors.text,
                }}
              >
                <span className="text-xs opacity-70">{d.diaSemana}</span>
                <span className={clsx('text-sm font-bold mt-0.5', d.esHoy && d.fecha !== selectedDate && 'underline')}>
                  {d.diaNumero}
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => navFecha(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <ChevronRight size={20} style={{ color: colors.text }} />
          </button>
        </div>

        <p className="text-sm mt-2 capitalize" style={{ color: colors.textSecondary }}>{fechaFormateada}</p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
          </div>
        ) : (
          <div className="space-y-1">
            {HORARIOS.map(hora => {
              const rsHora   = getReservasParaHora(hora);
              const horaLabel        = `${hora.toString().padStart(2, '0')}:00`;
              const mostrarLinea     = selectedDate === hoy && horaActual === hora;

              return (
                <div key={hora} className="flex items-stretch min-h-[56px] relative">
                  <span className="w-16 text-xs pt-2 shrink-0" style={{ color: colors.textMuted }}>{horaLabel}</span>
                  <div className="flex-1 border-l pl-3 relative" style={{ borderColor: colors.borderLight }}>

                    {mostrarLinea && (
                      <div className="absolute -left-px top-0 right-0 flex items-center pointer-events-none z-10">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 -ml-1" style={{ background: '#ef4444' }} />
                        <div className="flex-1 h-px" style={{ background: '#ef4444' }} />
                      </div>
                    )}

                    {rsHora.length > 0 ? (
                      <div className="space-y-2 py-1">
                        {rsHora.map(reserva => (
                          <div
                            key={reserva.id}
                            className="rounded-xl px-4 py-3"
                            style={getReservaStyle(reserva.estado)}
                          >
                            {/* Info + badge */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>
                                  {reserva.cliente_nombre || 'Sin nombre'}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                                  {formatHoraLocal(reserva.fecha_hora_inicio)}
                                  {reserva.servicio_nombre ? ` · ${reserva.servicio_nombre}` : ''}
                                  {reserva.sena_monto > 0 ? ` · Seña $${reserva.sena_monto}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {(reserva.estado === 'CONFIRMADA' || reserva.estado === 'COMPLETADA') && (
                                  <button
                                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                                    style={{ background: colors.primaryFaded, color: colors.primary }}
                                    onClick={() => setFichaModal({ open: true, reserva })}
                                  >
                                    <ClipboardList size={12} />
                                    Ficha
                                  </button>
                                )}
                                {reserva.cliente_usuario_id && (
                                  <button
                                    className="text-xs px-2.5 py-1 rounded-lg"
                                    style={{ background: colors.primaryFaded, color: colors.primary }}
                                    title="Dar acceso a la app al cliente"
                                    onClick={() => setAccesoModal({
                                      open: true,
                                      clienteId:       reserva.cliente_usuario_id,
                                      clienteNombre:   reserva.cliente_nombre || '',
                                      clienteTelefono: reserva.cliente_telefono || '',
                                    })}
                                  >
                                    📱
                                  </button>
                                )}
                                <BadgeEstadoReserva estado={reserva.estado} />
                              </div>
                            </div>

                            {/* Acciones de estado */}
                            <AccionesReserva
                              reserva={{
                                id:                  reserva.id,
                                estado:              reserva.estado,
                                clienteNombre:       reserva.cliente_nombre,
                                clienteTelefono:     reserva.cliente_telefono,
                                profesionalNombre:   reserva.profesional_nombre,
                                profesionalTelefono: reserva.profesional_telefono,
                                servicioNombre:      reserva.servicio_nombre,
                                fechaHoraInicio:     reserva.fecha_hora_inicio,
                                empresaSlug:         reserva.empresa_slug,
                              }}
                              onActualizado={cargarReservas}
                              modoProfesional={true}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => { setHoraSeleccionada(horaLabel); setModalOpen(true); }}
                        className="w-full h-12 text-left text-xs rounded-xl px-3 hover:bg-gray-50 transition text-gray-300 hover:text-gray-400"
                      >
                        + Agregar reserva
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      {modalOpen && (
        <ModalReserva
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); cargarReservas(); }}
          onNuevoClienteCreado={handleNuevoClienteCreado}
          fecha={selectedDate}
          horaInicial={horaSeleccionada}
          reservaEditar={null}
          profesionales={profesionales}
          profile={profile}
        />
      )}

      {fichaModal.open && fichaModal.reserva && (
        <ModalFicha
          open={fichaModal.open}
          onClose={() => setFichaModal({ open: false, reserva: null })}
          onSaved={() => { setFichaModal({ open: false, reserva: null }); cargarReservas(); }}
          reserva={fichaModal.reserva}
          profile={profile}
        />
      )}

      {accesoModal.open && (
        <ModalAccesoCliente
          open={accesoModal.open}
          onClose={() => setAccesoModal({ open: false, clienteId: '', clienteNombre: '', clienteTelefono: '' })}
          clienteId={accesoModal.clienteId}
          clienteNombre={accesoModal.clienteNombre}
          clienteTelefono={accesoModal.clienteTelefono}
          empresaId={profile?.empresaId || ''}
        />
      )}

      {cierreCajaOpen && (
        <ModalCierreCaja
          open={cierreCajaOpen}
          onClose={() => setCierreCajaOpen(false)}
          onCajaActualizada={() => { setCierreCajaOpen(false); cargarReservas(); }}
          fecha={selectedDate}
          reservas={reservas}
          profile={profile}
        />
      )}
    </div>
  );
}
