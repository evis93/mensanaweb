'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import BadgeEstadoReserva from '@/src/components/reservas/BadgeEstadoReserva';
import AccionesReserva from '@/src/components/reservas/AccionesReserva';
import { ESTADO_LABELS } from '@/src/types/reservas';

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function Fila({ label, valor }: { label: string; valor: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div className="flex justify-between items-start py-3 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
      <span className="text-sm" style={{ color: colors.textSecondary }}>{label}</span>
      <span className="text-sm font-medium text-right ml-4" style={{ color: colors.text }}>{valor}</span>
    </div>
  );
}

export default function DetalleReservaPage() {
  const { id }     = useParams<{ id: string }>();
  const router     = useRouter();
  const { colors } = useTheme();

  const [reserva, setReserva] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    const res  = await fetch(`/api/reservas?profesionalId=_&id=${id}`);
    // Usamos la vista directamente desde el listado filtrado por id
    const res2 = await fetch(`/api/reservas/${id}`);
    const json = await res2.json();
    if (json.success) setReserva(json.data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [id]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
    </div>
  );

  if (!reserva) return (
    <div className="p-6 text-center">
      <p style={{ color: colors.textSecondary }}>Reserva no encontrada</p>
      <button onClick={() => router.back()} className="mt-4 text-sm underline" style={{ color: colors.primary }}>
        Volver
      </button>
    </div>
  );

  return (
    <div className="p-6 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft size={18} style={{ color: colors.text }} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: colors.text }}>Detalle de Reserva</h1>
        </div>
        <BadgeEstadoReserva estado={reserva.estado} />
      </div>

      {/* Datos del cliente */}
      <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: colors.border }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textSecondary }}>Cliente</p>
        <Fila label="Nombre"   valor={reserva.cliente_nombre} />
        <Fila label="Email"    valor={reserva.cliente_email} />
        {reserva.cliente_telefono && (
          <div className="flex justify-between items-center py-3">
            <span className="text-sm" style={{ color: colors.textSecondary }}>Teléfono</span>
            <a
              href={`https://wa.me/${reserva.cliente_telefono?.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: '#16a34a' }}
            >
              <MessageCircle size={14} /> {reserva.cliente_telefono}
            </a>
          </div>
        )}
      </div>

      {/* Datos del turno */}
      <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: colors.border }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textSecondary }}>Turno</p>
        <Fila label="Servicio"  valor={reserva.servicio_nombre} />
        <Fila label="Fecha"     valor={formatearFechaHora(reserva.fecha_hora_inicio)} />
        <Fila label="Duración"  valor={`${reserva.duracion_minutos} min`} />
        {reserva.servicio_precio && <Fila label="Precio" valor={`$${reserva.servicio_precio}`} />}
        <Fila label="Modalidad" valor={reserva.servicio_modalidad === 'presencial' ? 'Presencial' : reserva.servicio_modalidad === 'no_presencial' ? 'No presencial' : 'Ambas'} />
      </div>

      {/* Seña */}
      {reserva.sena_monto > 0 && (
        <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: colors.border }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textSecondary }}>Seña</p>
          <Fila label="Monto"  valor={`$${reserva.sena_monto}`} />
          <Fila label="Estado" valor={reserva.sena_estado} />
        </div>
      )}

      {/* Historial de estado */}
      {reserva.estado_anterior && (
        <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: colors.border }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textSecondary }}>Historial</p>
          <Fila label="Estado anterior" valor={ESTADO_LABELS[reserva.estado_anterior] ?? reserva.estado_anterior} />
          {reserva.motivo_cambio && <Fila label="Motivo" valor={reserva.motivo_cambio} />}
        </div>
      )}

      {/* Notas */}
      {(reserva.notas_cliente || reserva.notas_profesional) && (
        <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: colors.border }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textSecondary }}>Notas</p>
          {reserva.notas_cliente     && <Fila label="Del cliente"      valor={reserva.notas_cliente} />}
          {reserva.notas_profesional && <Fila label="Del profesional"  valor={reserva.notas_profesional} />}
        </div>
      )}

      {/* Acciones */}
      <div className="bg-white rounded-xl border p-4" style={{ borderColor: colors.border }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: colors.textSecondary }}>Acciones</p>
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
          onActualizado={cargar}
          modoProfesional
        />
      </div>
    </div>
  );
}
