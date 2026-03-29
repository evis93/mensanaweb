/**
 * GET /api/reservas/[id]
 * Devuelve el detalle completo de una reserva por id.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sb = adminClient()
    const { data, error } = await sb
      .from('v_reservas_detalle')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[api/reservas/[id] GET]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
