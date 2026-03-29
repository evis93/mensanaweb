import type { HorarioDia, ExcepcionDisponibilidad, Slot } from '@/src/types/disponibilidad'

// Argentina no tiene DST — offset fijo UTC-3
const AR_OFFSET_MS = -3 * 60 * 60 * 1000

interface ReservaOcupada {
  fechaHoraInicio: string
  fechaHoraFin: string
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function fechaStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Extrae la hora en tiempo local AR desde un TIMESTAMPTZ
// Los horarios_empresa están en hora local AR, así que la comparación de ocupación
// debe usar también hora AR para evitar un desfase de 3 horas.
function horaDeTimestamp(iso: string): string {
  const arTime = new Date(new Date(iso).getTime() + AR_OFFSET_MS)
  return arTime.toISOString().split('T')[1].substring(0, 5)
}

function mismaFecha(iso: string, fecha: Date): boolean {
  // Compara la fecha AR del timestamp contra la fecha UTC de referencia
  const arDate = new Date(new Date(iso).getTime() + AR_OFFSET_MS).toISOString().split('T')[0]
  return arDate === fechaStr(fecha)
}

export function calcularSlots(
  horarioBase: HorarioDia[],
  excepciones: ExcepcionDisponibilidad[],
  reservasExistentes: ReservaOcupada[],
  duracionMinutos: number,
  fecha: Date
): Slot[] {
  const diaSemana = fecha.getDay()
  const horarioDia = horarioBase.find(h => h.diaSemana === diaSemana && h.activo)

  if (!horarioDia) return []

  const inicio = timeToMinutes(horarioDia.horaInicio)
  const fin    = timeToMinutes(horarioDia.horaFin)

  // Generar todos los slots posibles del horario base
  const slots: Slot[] = []
  for (let t = inicio; t + duracionMinutos <= fin; t += duracionMinutos) {
    slots.push({
      horaInicio: minutesToTime(t),
      horaFin:    minutesToTime(t + duracionMinutos),
      disponible: true,
    })
  }

  // Bloques por excepciones del profesional (tipo 'bloqueo')
  const bloqueos = excepciones.filter(
    e => e.fecha === fechaStr(fecha) && e.tipo === 'bloqueo'
  )

  // Bloques por reservas existentes (PENDIENTE y CONFIRMADA)
  const ocupadosPorReserva = reservasExistentes
    .filter(r => mismaFecha(r.fechaHoraInicio, fecha))
    .map(r => ({
      horaInicio: horaDeTimestamp(r.fechaHoraInicio),
      horaFin:    horaDeTimestamp(r.fechaHoraFin),
    }))

  const todosLosBloqueos = [
    ...bloqueos.map(b => ({ horaInicio: b.horaInicio, horaFin: b.horaFin })),
    ...ocupadosPorReserva,
  ]

  return slots.map(slot => {
    const slotInicio = timeToMinutes(slot.horaInicio)
    const slotFin    = timeToMinutes(slot.horaFin)

    const bloqueado = todosLosBloqueos.some(b => {
      const bInicio = timeToMinutes(b.horaInicio)
      const bFin    = timeToMinutes(b.horaFin)
      return slotInicio < bFin && slotFin > bInicio
    })

    return { ...slot, disponible: !bloqueado }
  })
}
