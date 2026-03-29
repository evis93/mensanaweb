'use client';

import { useState } from 'react';
import { Check, X, RefreshCw, MessageCircle, Loader2 } from 'lucide-react';
import { useTheme } from '@/src/context/ThemeContext';
import { ACCIONES_POR_ESTADO } from '@/src/types/reservas';
import type { ReservaEstado } from '@/src/types/reservas';
import { generarLinkWA } from '@/src/utils/whatsapp';

interface ReservaParaAccion {
  id: string
  estado: ReservaEstado
  clienteNombre: string
  clienteTelefono?: string | null
  profesionalNombre: string
  profesionalTelefono?: string | null
  servicioNombre: string
  fechaHoraInicio: string
  empresaSlug?: string
}

interface Props {
  reserva: ReservaParaAccion
  onActualizado: () => void
  /** Si true, muestra solo acciones relevantes para el profesional */
  modoProfesional?: boolean
}

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AccionesReserva({ reserva, onActualizado, modoProfesional = true }: Props) {
  const { colors } = useTheme();
  const [ejecutando, setEjecutando] = useState<ReservaEstado | null>(null);
  const [modalCambio, setModalCambio] = useState(false);
  const [motivoCambio, setMotivoCambio] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');

  const acciones = ACCIONES_POR_ESTADO[reserva.estado] ?? [];

  const ejecutarCambio = async (nuevoEstado: ReservaEstado, extras: Record<string, any> = {}) => {
    setEjecutando(nuevoEstado);
    try {
      const res = await fetch(`/api/reservas/${reserva.id}/estado`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ estado: nuevoEstado, ...extras }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // Abrir WA si viene link
      if (json.data?.waLinks?.cliente) {
        window.open(json.data.waLinks.cliente, '_blank');
      }
      if (json.data?.waLinks?.profesional) {
        window.open(json.data.waLinks.profesional, '_blank');
      }

      onActualizado();
    } catch (e: any) {
      alert(e.message || 'Error al actualizar');
    }
    setEjecutando(null);
  };

  const handleCambioHorario = async () => {
    if (!nuevaFecha || !nuevaHora) { alert('Completá fecha y hora'); return; }
    const nuevaFechaHoraInicio = `${nuevaFecha}T${nuevaHora}:00`;
    await ejecutarCambio('CAMBIO_SOLICITADO', { motivoCambio, nuevaFechaHoraInicio });
    setModalCambio(false);
    setMotivoCambio('');
    setNuevaFecha('');
    setNuevaHora('');
  };

  const abrirWA = (tipo: 'cliente' | 'profesional') => {
    const tel  = tipo === 'cliente' ? reserva.clienteTelefono : reserva.profesionalTelefono;
    if (!tel) return;
    const datos = {
      profesionalNombre: reserva.profesionalNombre,
      clienteNombre:     reserva.clienteNombre,
      servicio:          reserva.servicioNombre,
      fechaHora:         formatearFechaHora(reserva.fechaHoraInicio),
      linkReserva:       `${window.location.origin}/profesional/reservas/${reserva.id}`,
    };
    // Link genérico de contacto
    window.open(`https://wa.me/${tel.replace(/\D/g, '')}`, '_blank');
  };

  if (acciones.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {acciones.includes('CONFIRMADA') && (
          <button
            onClick={() => ejecutarCambio('CONFIRMADA')}
            disabled={!!ejecutando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
            style={{ background: '#16a34a' }}
          >
            {ejecutando === 'CONFIRMADA' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Confirmar
          </button>
        )}

        {acciones.includes('RECHAZADA') && (
          <button
            onClick={() => ejecutarCambio('RECHAZADA')}
            disabled={!!ejecutando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 disabled:opacity-60"
          >
            {ejecutando === 'RECHAZADA' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            Rechazar
          </button>
        )}

        {acciones.includes('CAMBIO_SOLICITADO') && (
          <button
            onClick={() => setModalCambio(true)}
            disabled={!!ejecutando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 disabled:opacity-60"
          >
            <RefreshCw size={12} /> Cambiar horario
          </button>
        )}

        {(acciones.includes('CANCELADA_PROFESIONAL') || acciones.includes('CANCELADA_CLIENTE')) && (
          <button
            onClick={() => {
              if (!confirm('¿Cancelar esta reserva?')) return;
              // Usar el estado de cancelación válido para la transición actual.
              // CANCELADA_PROFESIONAL tiene prioridad (admin actúa como empresa/profesional).
              // CANCELADA_CLIENTE solo se usa cuando es la única opción disponible.
              const estado = acciones.includes('CANCELADA_PROFESIONAL')
                ? 'CANCELADA_PROFESIONAL'
                : 'CANCELADA_CLIENTE';
              ejecutarCambio(estado as ReservaEstado);
            }}
            disabled={!!ejecutando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 disabled:opacity-60"
          >
            {ejecutando ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            Cancelar turno
          </button>
        )}

        {reserva.clienteTelefono && (
          <button
            onClick={() => abrirWA('cliente')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700"
          >
            <MessageCircle size={12} /> WhatsApp
          </button>
        )}
      </div>

      {/* Modal cambio de horario */}
      {modalCambio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold mb-4" style={{ color: colors.text }}>Proponer nuevo horario</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Nueva fecha</label>
                <input
                  type="date"
                  value={nuevaFecha}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setNuevaFecha(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.border }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Nueva hora</label>
                <input
                  type="time"
                  value={nuevaHora}
                  onChange={e => setNuevaHora(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.border }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Motivo (opcional)</label>
                <input
                  type="text"
                  value={motivoCambio}
                  onChange={e => setMotivoCambio(e.target.value)}
                  placeholder="Ej: Surgió un inconveniente..."
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.border }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModalCambio(false)}
                className="flex-1 py-2.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCambioHorario}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ background: colors.primary }}
              >
                Proponer cambio
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
