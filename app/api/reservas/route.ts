/**
 * GET /api/reservas?empresaId=&profesionalId=&estado=&fechaDesde=&fechaHasta=
 * Lista reservas con filtros opcionales.
 *
 * POST /api/reservas
 * Crea una nueva reserva en estado PENDIENTE.
 * Body: { empresaId, clienteId, profesionalId, servicioId, fechaHoraInicio }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const empresaId     = searchParams.get('empresaId')
    const profesionalId = searchParams.get('profesionalId')
    const clienteId     = searchParams.get('clienteId')
    const estado        = searchParams.get('estado')
    const fechaDesde    = searchParams.get('fechaDesde')
    const fechaHasta    = searchParams.get('fechaHasta')

    if (!empresaId && !profesionalId && !clienteId) {
      return NextResponse.json(
        { error: 'Se requiere al menos empresaId, profesionalId o clienteId' },
        { status: 400 }
      )
    }

    const sb = adminClient()
    let query = sb.from('v_reservas_detalle').select('*')

    if (empresaId)     query = query.eq('empresa_id', empresaId)
    if (profesionalId) query = query.eq('profesional_usuario_id', profesionalId)
    if (clienteId)     query = query.eq('cliente_usuario_id', clienteId)
    if (estado)        query = query.eq('estado', estado)
    if (fechaDesde)    query = query.gte('fecha_hora_inicio', fechaDesde)
    if (fechaHasta)    query = query.lte('fecha_hora_inicio', fechaHasta)

    query = query.order('fecha_hora_inicio', { ascending: true })

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (e: any) {
    console.error('[api/reservas GET]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, clienteId, profesionalId, servicioId, fechaHoraInicio } = await req.json()

    if (!empresaId || !clienteId || !profesionalId || !servicioId || !fechaHoraInicio) {
      return NextResponse.json(
        { error: 'empresaId, clienteId, profesionalId, servicioId y fechaHoraInicio son requeridos' },
        { status: 400 }
      )
    }

    const sb = adminClient()

    // Obtener duración del servicio para calcular fecha_hora_fin
    const { data: servicio, error: servicioError } = await sb
      .from('servicios')
      .select('id, nombre, duracion_minutos, sena_tipo, sena_valor, precio')
      .eq('id', servicioId)
      .single()

    if (servicioError || !servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }

    const inicio = new Date(fechaHoraInicio)
    const fin    = new Date(inicio.getTime() + servicio.duracion_minutos * 60 * 1000)

    // Calcular monto de seña
    let senaMonto = 0
    if (servicio.sena_tipo === 'monto') {
      senaMonto = servicio.sena_valor ?? 0
    } else if (servicio.sena_tipo === 'porcentaje' && servicio.precio) {
      senaMonto = Math.round((servicio.precio * servicio.sena_valor) / 100 * 100) / 100
    }

    // Verificar que el slot no esté ya ocupado
    const { data: conflicto } = await sb
      .from('reservas')
      .select('id')
      .eq('profesional_id', profesionalId)
      .in('estado', ['PENDIENTE', 'CONFIRMADA', 'CAMBIO_SOLICITADO'])
      .lt('fecha_hora_inicio', fin.toISOString())
      .gt('fecha_hora_fin', inicio.toISOString())
      .maybeSingle()

    if (conflicto) {
      return NextResponse.json(
        { error: 'El horario seleccionado ya está ocupado' },
        { status: 409 }
      )
    }

    const { data: reserva, error: reservaError } = await sb
      .from('reservas')
      .insert({
        empresa_id:       empresaId,
        cliente_id:       clienteId,
        profesional_id:   profesionalId,
        servicio_id:      servicioId,
        fecha_hora_inicio: inicio.toISOString(),
        fecha_hora_fin:   fin.toISOString(),
        estado:           'PENDIENTE',
        sena_monto:       senaMonto,
        sena_estado:      'PENDIENTE',
      })
      .select()
      .single()

    if (reservaError) throw reservaError

    return NextResponse.json({ success: true, data: reserva }, { status: 201 })
  } catch (e: any) {
    console.error('[api/reservas POST]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
