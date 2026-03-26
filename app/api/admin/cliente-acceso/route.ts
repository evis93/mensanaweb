/**
 * POST /api/admin/cliente-acceso
 * Genera acceso a la app para un cliente existente (rol 'cliente').
 * Flujo:
 *   1. Busca el cliente en public.usuarios por clienteId
 *   2. Si no tiene auth_user_id → crea usuario en auth.users con password temporal
 *   3. Si ya lo tiene → genera un nuevo password temporal y lo actualiza
 *   4. Genera QR como data URL (PNG base64) con la URL de login de la empresa
 *   5. Responde: { webUrl, email, passwordTemporal, qrDataUrl }
 *
 * Body: { clienteId: string, empresaId: string }
 * Responde: { success, webUrl, email, passwordTemporal, qrDataUrl } | { error }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function generarPasswordTemporal(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(req: NextRequest) {
  try {
    const { clienteId, empresaId } = await req.json();

    if (!clienteId || !empresaId) {
      return NextResponse.json({ error: 'clienteId y empresaId son requeridos' }, { status: 400 });
    }

    const sb = adminClient();

    // 1. Obtener datos del cliente
    const { data: usuario, error: usuarioError } = await sb
      .from('usuarios')
      .select('id, email, nombre_completo, auth_user_id')
      .eq('id', clienteId)
      .single();

    if (usuarioError || !usuario) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    if (!usuario.email) {
      return NextResponse.json({ error: 'El cliente no tiene email registrado. Agregá el email antes de dar acceso.' }, { status: 400 });
    }

    // 2. Obtener slug de la empresa para construir la URL
    const { data: empresa } = await sb
      .from('empresas')
      .select('slug, custom_domain')
      .eq('id', empresaId)
      .single();

    const webUrl = empresa?.custom_domain
      ? `https://${empresa.custom_domain}`
      : empresa?.slug
      ? `https://${empresa.slug}.mensana.com.ar`
      : 'https://mensana.com.ar';

    const passwordTemporal = generarPasswordTemporal();

    if (usuario.auth_user_id) {
      // 3a. Ya tiene cuenta → actualizar password
      const { error: updateError } = await sb.auth.admin.updateUserById(
        usuario.auth_user_id,
        { password: passwordTemporal }
      );
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // 3b. No tiene cuenta → crear usuario en auth.users
      const { data: authData, error: authError } = await sb.auth.admin.createUser({
        email: usuario.email,
        password: passwordTemporal,
        email_confirm: true,
        user_metadata: { full_name: usuario.nombre_completo },
      });

      if (authError) {
        if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
          return NextResponse.json(
            { error: 'Ya existe una cuenta con ese email. Regenerá el acceso desde el perfil del cliente.' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      // Guardar auth_user_id en public.usuarios
      await sb
        .from('usuarios')
        .update({ auth_user_id: authData.user.id })
        .eq('id', clienteId);

      // Asegurar que tenga rol 'cliente' en usuario_empresa
      const { data: rolData } = await sb
        .from('roles')
        .select('id')
        .eq('nombre', 'cliente')
        .maybeSingle();

      if (rolData) {
        await sb
          .from('usuario_empresa')
          .upsert(
            { usuario_id: clienteId, empresa_id: empresaId, rol_id: rolData.id },
            { onConflict: 'usuario_id,empresa_id' }
          );
      }
    }

    // 4. Generar QR de la URL web de la empresa
    const qrDataUrl = await QRCode.toDataURL(webUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return NextResponse.json({
      success: true,
      webUrl,
      email: usuario.email,
      passwordTemporal,
      qrDataUrl,
    });
  } catch (e: any) {
    console.error('[api/admin/cliente-acceso] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
