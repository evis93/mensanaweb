/**
 * GET /api/horarios?empresaId=
 * Devuelve el horario semanal base de una empresa (los 7 días).
 *
 * PUT /api/horarios
 * Reemplaza el horario semanal completo de una empresa.
 * Body: { empresaId, horarios: [{ diaSemana, horaInicio, horaFin, activo }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const empresaId = searchParams.get('empresaId')

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId es requerido' }, { status: 400 })
    }

    const sb = adminClient()
    const { data, error } = await sb
      .from('horarios_empresa')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('dia_semana')

    if (error) throw error

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (e: any) {
    console.error('[api/horarios GET]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, horarios } = await req.json() as {
      empresaId: string
      horarios: Array<{
        diaSemana: number
        horaInicio: string
        horaFin: string
        activo: boolean
      }>
    }

    if (!empresaId || !Array.isArray(horarios)) {
      return NextResponse.json({ error: 'empresaId y horarios son requeridos' }, { status: 400 })
    }

    const sb = adminClient()

    // Upsert de los 7 días — usa ON CONFLICT(empresa_id, dia_semana)
    const rows = horarios.map(h => ({
      empresa_id:  empresaId,
      dia_semana:  h.diaSemana,
      hora_inicio: h.horaInicio,
      hora_fin:    h.horaFin,
      activo:      h.activo,
    }))

    const { error } = await sb
      .from('horarios_empresa')
      .upsert(rows, { onConflict: 'empresa_id,dia_semana' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[api/horarios PUT]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
