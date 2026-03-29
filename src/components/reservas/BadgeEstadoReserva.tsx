'use client';

import { ESTADO_LABELS, ESTADO_COLORS } from '@/src/types/reservas';
import type { ReservaEstado } from '@/src/types/reservas';

interface Props {
  estado: ReservaEstado
}

export default function BadgeEstadoReserva({ estado }: Props) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {ESTADO_LABELS[estado] ?? estado}
    </span>
  );
}
