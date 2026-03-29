export type ModalidadServicio = 'presencial' | 'no_presencial' | 'ambas'
export type SenaTipo = 'monto' | 'porcentaje'

export interface Servicio {
  id: string
  empresaId: string
  nombre: string
  descripcion: string | null
  duracionMinutos: number
  precio: number | null
  senaTipo: SenaTipo
  senaValor: number
  modalidad: ModalidadServicio
  activo: boolean
}

export interface CreateServicioInput {
  empresaId: string
  nombre: string
  descripcion?: string
  duracionMinutos: number
  precio?: number
  senaTipo: SenaTipo
  senaValor: number
  modalidad: ModalidadServicio
}

export function calcularMontoSena(servicio: Pick<Servicio, 'senaTipo' | 'senaValor' | 'precio'>): number {
  if (servicio.senaTipo === 'monto') return servicio.senaValor
  if (!servicio.precio) return 0
  return Math.round((servicio.precio * servicio.senaValor) / 100 * 100) / 100
}
