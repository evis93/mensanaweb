export type ReservaEstado =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'RECHAZADA'
  | 'CAMBIO_SOLICITADO'
  | 'CANCELADA_CLIENTE'
  | 'CANCELADA_PROFESIONAL'
  | 'COMPLETADA'

export type SenaEstado = 'PENDIENTE' | 'RETENIDA' | 'DEVUELTA' | 'RETENIDA_PLATAFORMA'

export type PagoProvider = 'mercadopago' | 'stripe'

export interface Reserva {
  id: string
  empresaId: string
  clienteId: string
  profesionalId: string
  servicioId: string
  fechaHoraInicio: string
  fechaHoraFin: string
  estado: ReservaEstado
  estadoAnterior: ReservaEstado | null
  motivoCambio: string | null
  senaMonto: number
  senaEstado: SenaEstado
  senaPagoId: string | null
  senaPagoProvider: PagoProvider | null
  reservaOrigenId: string | null
  notasCliente: string | null
  notasProfesional: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface ReservaDetalle extends Reserva {
  clienteNombre: string
  clienteEmail: string
  clienteTelefono: string | null
  profesionalNombre: string
  profesionalTelefono: string | null
  servicioNombre: string
  duracionMinutos: number
  servicioPrecio: number | null
  servicioModalidad: 'presencial' | 'no_presencial' | 'ambas'
  empresaNombre: string
  empresaSlug: string
}

export interface CreateReservaInput {
  empresaId: string
  clienteId: string
  profesionalId: string
  servicioId: string
  fechaHoraInicio: string
}

export interface CambiarEstadoInput {
  estado: ReservaEstado
  motivoCambio?: string
  nuevaFechaHoraInicio?: string
}

export interface ReservaFilters {
  estado?: ReservaEstado | ReservaEstado[]
  profesionalId?: string
  clienteId?: string
  fechaDesde?: string
  fechaHasta?: string
}

// Estados en los que el profesional puede actuar
export const ACCIONES_POR_ESTADO: Record<ReservaEstado, ReservaEstado[]> = {
  PENDIENTE:            ['CONFIRMADA', 'RECHAZADA', 'CAMBIO_SOLICITADO'],
  CONFIRMADA:           ['CANCELADA_PROFESIONAL', 'CAMBIO_SOLICITADO'],
  CAMBIO_SOLICITADO:    ['CONFIRMADA', 'RECHAZADA'],
  RECHAZADA:            [],
  CANCELADA_CLIENTE:    [],
  CANCELADA_PROFESIONAL:[],
  COMPLETADA:           [],
}

export const ESTADO_LABELS: Record<ReservaEstado, string> = {
  PENDIENTE:            'Pendiente',
  CONFIRMADA:           'Confirmada',
  RECHAZADA:            'Rechazada',
  CAMBIO_SOLICITADO:    'Cambio solicitado',
  CANCELADA_CLIENTE:    'Cancelada por cliente',
  CANCELADA_PROFESIONAL:'Cancelada por profesional',
  COMPLETADA:           'Completada',
}

export const ESTADO_COLORS: Record<ReservaEstado, string> = {
  PENDIENTE:            'bg-yellow-100 text-yellow-800',
  CONFIRMADA:           'bg-green-100 text-green-800',
  RECHAZADA:            'bg-red-100 text-red-800',
  CAMBIO_SOLICITADO:    'bg-blue-100 text-blue-800',
  CANCELADA_CLIENTE:    'bg-gray-100 text-gray-600',
  CANCELADA_PROFESIONAL:'bg-gray-100 text-gray-600',
  COMPLETADA:           'bg-purple-100 text-purple-800',
}
