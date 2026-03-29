export type WATemplate =
  | 'NUEVA_RESERVA_PROFESIONAL'
  | 'CONFIRMACION_CLIENTE'
  | 'RECHAZO_CLIENTE'
  | 'CAMBIO_SOLICITADO_CLIENTE'
  | 'CAMBIO_SOLICITADO_PROFESIONAL'
  | 'CANCELACION_PROFESIONAL_CLIENTE'
  | 'CANCELACION_CLIENTE_PROFESIONAL'
  | 'RECORDATORIO_24H'
  | 'RECORDATORIO_1H'

export interface DatosNotificacion {
  profesionalNombre: string
  clienteNombre: string
  servicio: string
  fechaHora: string
  direccion?: string
  linkReserva: string
}

const TEMPLATES: Record<WATemplate, (d: DatosNotificacion) => string> = {
  // PENDIENTE → profesional
  NUEVA_RESERVA_PROFESIONAL: (d) =>
    `Nueva solicitud de turno de *${d.clienteNombre}* para ${d.servicio} el ${d.fechaHora}. Confirmá o rechazá en: ${d.linkReserva}`,

  // CONFIRMADA → cliente
  CONFIRMACION_CLIENTE: (d) =>
    `¡Tu turno está confirmado! *${d.servicio}* con ${d.profesionalNombre} el ${d.fechaHora}${d.direccion ? ` en ${d.direccion}` : ''}. Más info: ${d.linkReserva}`,

  // RECHAZADA → cliente
  RECHAZO_CLIENTE: (d) =>
    `Lamentablemente tu turno para *${d.servicio}* del ${d.fechaHora} no pudo confirmarse. Por favor contactá a ${d.profesionalNombre} para reagendar.`,

  // CAMBIO_SOLICITADO → cliente (cuando lo pide el profesional)
  CAMBIO_SOLICITADO_CLIENTE: (d) =>
    `${d.profesionalNombre} propone cambiar tu turno de *${d.servicio}*. Revisá la propuesta en: ${d.linkReserva}`,

  // CAMBIO_SOLICITADO → profesional (cuando lo pide el cliente)
  CAMBIO_SOLICITADO_PROFESIONAL: (d) =>
    `${d.clienteNombre} solicita cambiar el turno del ${d.fechaHora} para *${d.servicio}*. Revisá en: ${d.linkReserva}`,

  // CANCELADA_PROFESIONAL → cliente
  CANCELACION_PROFESIONAL_CLIENTE: (d) =>
    `Tu turno del ${d.fechaHora} fue cancelado por ${d.profesionalNombre}. Tu seña será devuelta automáticamente. Podés reagendar en: ${d.linkReserva}`,

  // CANCELADA_CLIENTE → profesional
  CANCELACION_CLIENTE_PROFESIONAL: (d) =>
    `${d.clienteNombre} canceló el turno del ${d.fechaHora} para *${d.servicio}*.`,

  // Recordatorio 24h → cliente
  RECORDATORIO_24H: (d) =>
    `Recordatorio: mañana tenés turno de *${d.servicio}* con ${d.profesionalNombre} a las ${d.fechaHora}${d.direccion ? ` en ${d.direccion}` : ''}.`,

  // Recordatorio 1h → cliente
  RECORDATORIO_1H: (d) =>
    `Tu turno de *${d.servicio}* con ${d.profesionalNombre} es en 1 hora (${d.fechaHora}). ¡Te esperamos!`,
}

export function generarLinkWA(
  telefono: string,
  template: WATemplate,
  datos: DatosNotificacion
): string {
  const mensaje = TEMPLATES[template](datos)
  const telefonoLimpio = telefono.replace(/\D/g, '')
  return `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`
}
