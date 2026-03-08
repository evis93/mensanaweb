'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ReservaController } from '@/src/controllers/ReservaController';
import { ProfesionalController } from '@/src/controllers/ProfesionalController';
import { ConsultanteController } from '@/src/controllers/ConsultanteController';
import ModalReserva from '@/src/components/reservas/ModalReserva';
import ModalPago from '@/src/components/reservas/ModalPago';
import ModalFicha from '@/src/components/reservas/ModalFicha';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { clsx } from 'clsx';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const HORARIOS = Array.from({ length: 13 }, (_, i) => i + 8); // 8-20h

export default function AgendaPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const hoy = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(hoy);
  const [reservas, setReservas] = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pagoModal, setPagoModal] = useState<{ open: boolean; reserva: any | null }>({ open: false, reserva: null });
  const [fichaModal, setFichaModal] = useState<{ open: boolean; reserva: any | null }>({ open: false, reserva: null });
  const [editingReserva, setEditingReserva] = useState<any>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);

  const cargarReservas = useCallback(async () => {
    setLoading(true);
    const result = await ReservaController.obtenerReservasPorFecha(selectedDate, profile?.profesionalId, profile);
    if (result.success) setReservas((result as any).data || []);
    setLoading(false);
  }, [selectedDate, profile]);

  useEffect(() => { cargarReservas(); }, [cargarReservas]);

  useEffect(() => {
    ProfesionalController.obtenerProfesionales(profile).then(r => {
      if (r.success) setProfesionales(r.data || []);
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

  const getReservaParaHora = (hora: number) =>
    reservas.find(r => r.hora_inicio && parseInt(r.hora_inicio.split(':')[0]) === hora);

  const handleNuevaReserva = (hora?: number) => {
    setEditingReserva(null);
    setHoraSeleccionada(hora ? `${hora.toString().padStart(2, '0')}:00` : null);
    setModalOpen(true);
  };

  const handleEditarReserva = (reserva: any) => {
    setEditingReserva(reserva);
    setHoraSeleccionada(null);
    setModalOpen(true);
  };

  const handleEliminarReserva = async (id: string) => {
    if (!confirm('¿Eliminar esta reserva?')) return;
    await ReservaController.eliminarReserva(id, profile);
    cargarReservas();
  };

  const navFecha = (dir: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Agenda</h1>
        </div>

        {/* Navegación de días */}
        <div className="flex items-center gap-2">
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
                  color: d.fecha === selectedDate ? '#fff' : colors.text,
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
              const reserva = getReservaParaHora(hora);
              const horaLabel = `${hora.toString().padStart(2, '0')}:00`;
              return (
                <div key={hora} className="flex items-stretch min-h-[56px]">
                  <span className="w-16 text-xs pt-2 shrink-0" style={{ color: colors.textMuted }}>{horaLabel}</span>
                  <div className="flex-1 border-l pl-3" style={{ borderColor: colors.borderLight }}>
                    {reserva ? (
                      <div
                        className="rounded-xl px-4 py-3 cursor-pointer hover:opacity-90 transition"
                        style={{ background: reserva.pagado ? colors.primaryFaded : '#FFF3CD', borderLeft: `4px solid ${reserva.pagado ? colors.primary : colors.warning}` }}
                        onClick={() => handleEditarReserva(reserva)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm" style={{ color: colors.text }}>
                              {reserva.consultante_nombre || 'Sin nombre'}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                              {reserva.hora_inicio?.substring(0, 5)} · {reserva.estado}
                              {reserva.servicio_nombre ? ` · ${reserva.servicio_nombre}` : ''}
                              {reserva.precio_total ? ` · $${reserva.precio_total}` : ''}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg"
                              style={{ background: colors.primaryFaded, color: colors.primary }}
                              onClick={e => { e.stopPropagation(); setFichaModal({ open: true, reserva }); }}
                            >
                              <ClipboardList size={13} />
                              Ficha
                            </button>
                            {!reserva.pagado && (
                              <button
                                className="text-xs px-3 py-1 rounded-lg"
                                style={{ background: colors.primary, color: '#fff' }}
                                onClick={e => { e.stopPropagation(); setPagoModal({ open: true, reserva }); }}
                              >
                                Cobrar
                              </button>
                            )}
                            <button
                              className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600"
                              onClick={e => { e.stopPropagation(); handleEliminarReserva(reserva.id); }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleNuevaReserva(hora)}
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

      {modalOpen && (
        <ModalReserva
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); cargarReservas(); }}
          fecha={selectedDate}
          horaInicial={horaSeleccionada}
          reservaEditar={editingReserva}
          profesionales={profesionales}
          profile={profile}
        />
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

      {fichaModal.open && fichaModal.reserva && (
        <ModalFicha
          open={fichaModal.open}
          onClose={() => setFichaModal({ open: false, reserva: null })}
          onSaved={() => { setFichaModal({ open: false, reserva: null }); cargarReservas(); }}
          reserva={fichaModal.reserva}
          profile={profile}
        />
      )}
    </div>
  );
}
