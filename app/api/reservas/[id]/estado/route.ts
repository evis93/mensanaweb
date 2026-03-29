/**
 * PATCH /api/reservas/[id]/estado
 * Cambia el estado de una reserva y ejecuta las acciones asociadas.
 *
 * Al confirmar (CONFIRMADA):
 *   - Crea la ficha del cliente automáticamente
 *   - Devuelve link wa.me para notificar al cliente
 *
 * Al rechazar (RECHAZADA):
 *   - Devuelve link wa.me para notificar al cliente
 *
 * Al crear (PENDIENTE desde CAMBIO_SOLICITADO):
 *   - Se crea una nueva reserva en estado PENDIENTE con nuevaFechaHoraInicio
 *
 * Body: { estado, motivoCambio?, nuevaFechaHoraInicio? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generarLinkWA } from '@/src/utils/whatsapp'
import type { ReservaEstado } from '@/src/types/reservas'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Formato legible de fecha para mensajes WA
function formatearFechaHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

// Transiciones permitidas por estado actual
const TRANSICIONES_VALIDAS: Record<ReservaEstado, ReservaEstado[]> = {
  PENDIENTE:             ['CONFIRMADA', 'RECHAZADA', 'CAMBIO_SOLICITADO'],
  CONFIRMADA:            ['CANCELADA_PROFESIONAL', 'CAMBIO_SOLICITADO'],
  CAMBIO_SOLICITADO:     ['CONFIRMADA', 'RECHAZADA', 'CANCELADA_CLIENTE', 'CANCELADA_PROFESIONAL'],
  RECHAZADA:             [],
  CANCELADA_CLIENTE:     [],
  CANCELADA_PROFESIONAL: [],
  COMPLETADA:            [],
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservaId } = await params
    const { estado, motivoCambio, nuevaFechaHoraInicio } = await req.json() as {
      estado: ReservaEstado
      motivoCambio?: string
      nuevaFechaHoraInicio?: string
    }

    if (!estado) {
      return NextResponse.json({ error: 'estado es requerido' }, { status: 400 })
    }

    const sb = adminClient()

    // Cargar reserva con detalle completo
    const { data: reserva, error: reservaError } = await sb
      .from('v_reservas_detalle')
      .select('*')
      .eq('id', reservaId)
      .single()

    if (reservaError || !reserva) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    // Validar transición
    const transicionesPermitidas = TRANSICIONES_VALIDAS[reserva.estado as ReservaEstado] ?? []
    if (!transicionesPermitidas.includes(estado)) {
      return NextResponse.json(
        { error: `No se puede pasar de ${reserva.estado} a ${estado}` },
        { status: 422 }
      )
    }

    // Actualizar estado de la reserva
    const { error: updateError } = await sb
      .from('reservas')
      .update({
        estado,
        estado_anterior: reserva.estado,
        motivo_cambio:   motivoCambio ?? null,
      })
      .eq('id', reservaId)

    if (updateError) throw updateError

    const datosWA = {
      profesionalNombre: reserva.profesional_nombre,
      clienteNombre:     reserva.cliente_nombre,
      servicio:          reserva.servicio_nombre,
      fechaHora:         formatearFechaHora(reserva.fecha_hora_inicio),
      linkReserva:       `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/cliente/reservas/${reservaId}`,
    }

    let waLinks: Record<string, string> = {}
    let fichaId: string | null = null
    let nuevaReservaId: string | null = null

    // ── CONFIRMADA: crear ficha ──────────────────────────────────────────────
    if (estado === 'CONFIRMADA') {
      // Buscar usuario_empresa_id del cliente en esta empresa
      const { data: ue } = await sb
        .from('usuario_empresa')
        .select('id')
        .eq('usuario_id', reserva.cliente_usuario_id)
        .eq('empresa_id', reserva.empresa_id)
        .maybeSingle()

      if (ue) {
        // Convertir TIMESTAMPTZ a hora local Argentina (UTC-3, sin DST)
        const fechaInicio  = new Date(reserva.fecha_hora_inicio)
        const AR_OFFSET_MS = -3 * 60 * 60 * 1000
        const arTime       = new Date(fechaInicio.getTime() + AR_OFFSET_MS)
        const fechaStr     = arTime.toISOString().split('T')[0]
        const horaStr      = arTime.toISOString().split('T')[1].substring(0, 5)  // "HH:MM" AR local
        const notaDefecto  = `${fechaStr} - ${reserva.servicio_nombre}`

        const { data: ficha, error: fichaError } = await sb
          .from('fichas')
          .insert({
            usuario_empresa_id: ue.id,
            empresa_id:         reserva.empresa_id,
            profesional_id:     reserva.profesional_usuario_id,
            servicio_id:        reserva.servicio_id,
            servicio_nombre:    reserva.servicio_nombre,
            fecha:              fechaStr,
            hora:               horaStr,
            nota:               notaDefecto,
          })
          .select('id')
          .single()

        if (!fichaError && ficha) fichaId = ficha.id
      }

      // Link WA para notificar al cliente
      if (reserva.cliente_telefono) {
        waLinks.cliente = generarLinkWA(reserva.cliente_telefono, 'CONFIRMACION_CLIENTE', datosWA)
      }
    }

    // ── RECHAZADA ────────────────────────────────────────────────────────────
    if (estado === 'RECHAZADA') {
      if (reserva.cliente_telefono) {
        waLinks.cliente = generarLinkWA(reserva.cliente_telefono, 'RECHAZO_CLIENTE', datosWA)
      }
    }

    // ── CANCELADA_PROFESIONAL ────────────────────────────────────────────────
    if (estado === 'CANCELADA_PROFESIONAL') {
      if (reserva.cliente_telefono) {
        waLinks.cliente = generarLinkWA(reserva.cliente_telefono, 'CANCELACION_PROFESIONAL_CLIENTE', datosWA)
      }
    }

    // ── CANCELADA_CLIENTE ────────────────────────────────────────────────────
    if (estado === 'CANCELADA_CLIENTE') {
      if (reserva.profesional_telefono) {
        waLinks.profesional = generarLinkWA(reserva.profesional_telefono, 'CANCELACION_CLIENTE_PROFESIONAL', datosWA)
      }
    }

    // ── CAMBIO_SOLICITADO: crear nueva reserva con nuevo horario ─────────────
    if (estado === 'CAMBIO_SOLICITADO' && nuevaFechaHoraInicio) {
      // Obtener duración del servicio
      const { data: servicio } = await sb
        .from('servicios')
        .select('duracion_minutos')
        .eq('id', reserva.servicio_id)
        .single()

      if (servicio) {
        const nuevaInicio = new Date(nuevaFechaHoraInicio)
        const nuevaFin    = new Date(nuevaInicio.getTime() + servicio.duracion_minutos * 60 * 1000)

        const { data: nuevaReserva } = await sb
          .from('reservas')
          .insert({
            empresa_id:        reserva.empresa_id,
            cliente_id:        reserva.cliente_usuario_id,
            profesional_id:    reserva.profesional_usuario_id,
            servicio_id:       reserva.servicio_id,
            fecha_hora_inicio: nuevaInicio.toISOString(),
            fecha_hora_fin:    nuevaFin.toISOString(),
            estado:            'PENDIENTE',
            sena_monto:        reserva.sena_monto,
            sena_estado:       reserva.sena_estado,
            sena_pago_id:      reserva.sena_pago_id,
            reserva_origen_id: reservaId,
          })
          .select('id')
          .single()

        if (nuevaReserva) nuevaReservaId = nuevaReserva.id
      }
    }

    return NextResponse.json({
      success: true,
      data: { reservaId, estado, fichaId, nuevaReservaId, waLinks },
    })
  } catch (e: any) {
    console.error('[api/reservas/[id]/estado PATCH]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
