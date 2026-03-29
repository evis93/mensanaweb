export interface HorarioDia {
  id?: string
  empresaId: string
  diaSemana: number        // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  horaInicio: string       // "09:00"
  horaFin: string          // "18:00"
  activo: boolean
}

export type ExcepcionTipo = 'bloqueo' | 'extension'

export interface ExcepcionDisponibilidad {
  id?: string
  usuarioId: string
  empresaId: string
  fecha: string            // "2026-03-28"
  tipo: ExcepcionTipo
  horaInicio: string
  horaFin: string
  motivo?: string
}

export interface Slot {
  horaInicio: string       // "09:00"
  horaFin: string          // "10:00"
  disponible: boolean
}

export interface SlotQuery {
  profesionalId: string
  empresaId: string
  servicioId: string
  fecha: string            // "2026-03-28"
}

export const DIAS_SEMANA = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]
