/**
 * POST /api/admin/clientes
 * Crea un cliente con acceso a la app (password fija: 123456).
 * Flujo:
 *   1. Verifica que no exista ya como cliente en esta empresa
 *   2. Si el email ya existe en auth.users → reutiliza auth_user_id
 *   3. Si no → crea en auth.users con password '123456', email_confirm: true
 *   4. Upsert en public.usuarios con auth_user_id
 *   5. Vincula en usuario_empresa con rol 'cliente'
 *
 * Body: { email, nombre, telefono?, empresaId }
 * Responde: { success, usuarioId } | { error }
 *
 * PUT /api/admin/clientes
 * Actualiza datos básicos del cliente (nombre, telefono, email).
 * Body: { usuarioId, nombre?, telefono?, email? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PASSWORD_CLIENTES = '123456';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaId = searchParams.get('empresaId');

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId es requerido' }, { status: 400 });
    }

    const sb = adminClient();

    const { data, error } = await sb
      .from('usuario_empresa')
      .select(`
        usuario_id,
        usuarios!inner(id, nombre_completo, email, telefono),
        roles!inner(nombre)
      `)
      .eq('empresa_id', empresaId)
      .eq('roles.nombre', 'cliente');

    if (error) throw error;

    const clientes = (data || [])
      .map((item: any) => ({
        id: item.usuarios.id,
        nombre_completo: item.usuarios.nombre_completo || '',
        email: item.usuarios.email || '',
        telefono: item.usuarios.telefono || '',
      }))
      .sort((a: any, b: any) => a.nombre_completo.localeCompare(b.nombre_completo));

    return NextResponse.json({ success: true, data: clientes });
  } catch (e: any) {
    console.error('[api/admin/clientes GET] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, nombre, telefono, empresaId } = await req.json();

    if (!email || !nombre || !empresaId) {
      return NextResponse.json({ error: 'email, nombre y empresaId son requeridos' }, { status: 400 });
    }

    const sb = adminClient();

    // 1. Verificar si ya existe un usuario con este email en public.usuarios
    const { data: usuarioExistente } = await sb
      .from('usuarios')
      .select('id, auth_user_id, nombre_completo, email, telefono')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    let usuarioId: string;
    let authUserId: string;

    if (usuarioExistente) {
      usuarioId = usuarioExistente.id;

      if (usuarioExistente.auth_user_id) {
        // Ya tiene cuenta de auth → reutilizar
        authUserId = usuarioExistente.auth_user_id;
      } else {
        // Tiene registro en public.usuarios pero sin auth → crear auth user
        const { data: authData, error: authError } = await sb.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password: PASSWORD_CLIENTES,
          email_confirm: true,
          user_metadata: { full_name: nombre.trim() },
        });

        if (authError) {
          if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
            // El usuario existe en auth pero no está linkeado → buscar y linkear
            const { data: authList } = await sb.auth.admin.listUsers();
            const existingAuthUser = authList?.users?.find(u => u.email === email.trim().toLowerCase());
            if (!existingAuthUser) {
              return NextResponse.json({ error: 'Email ya registrado en autenticación' }, { status: 409 });
            }
            authUserId = existingAuthUser.id;
          } else {
            return NextResponse.json({ error: authError.message }, { status: 500 });
          }
        } else {
          authUserId = authData.user.id;
        }

        // Linkear auth_user_id al registro existente
        await sb
          .from('usuarios')
          .update({ auth_user_id: authUserId })
          .eq('id', usuarioId);
      }
    } else {
      // 2. No existe → crear en auth.users
      const { data: authData, error: authError } = await sb.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: PASSWORD_CLIENTES,
        email_confirm: true,
        user_metadata: { full_name: nombre.trim() },
      });

      if (authError) {
        if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
          return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 });
        }
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      authUserId = authData.user.id;

      // 3. El trigger handle_new_user puede haber creado ya la fila en public.usuarios.
      //    Intentamos buscarlo; si no existe aún, lo insertamos.
      const { data: usuarioPorAuth } = await sb
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (usuarioPorAuth) {
        usuarioId = usuarioPorAuth.id;
        await sb
          .from('usuarios')
          .update({ nombre_completo: nombre.trim(), telefono: telefono?.trim() || null, activo: true })
          .eq('id', usuarioId);
      } else {
        const { data: nuevoUsuario, error: usuarioError } = await sb
          .from('usuarios')
          .insert({
            auth_user_id: authUserId,
            nombre_completo: nombre.trim(),
            email: email.trim().toLowerCase(),
            telefono: telefono?.trim() || null,
            activo: true,
          })
          .select('id')
          .single();

        if (usuarioError) {
          return NextResponse.json({ error: usuarioError.message }, { status: 500 });
        }
        usuarioId = nuevoUsuario.id;
      }
    }

    // 4. Buscar rol 'cliente'
    const { data: rolData, error: rolError } = await sb
      .from('roles')
      .select('id')
      .eq('nombre', 'cliente')
      .maybeSingle();

    if (rolError || !rolData) {
      return NextResponse.json({ error: 'Rol "cliente" no encontrado' }, { status: 500 });
    }

    // 5. Vincular a la empresa (solo si no existe ya el vínculo)
    const { data: ueExistente } = await sb
      .from('usuario_empresa')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (!ueExistente) {
      const { error: ueError } = await sb
        .from('usuario_empresa')
        .insert({ usuario_id: usuarioId, empresa_id: empresaId, rol_id: rolData.id });

      if (ueError) {
        return NextResponse.json({ error: ueError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, usuarioId });
  } catch (e: any) {
    console.error('[api/admin/clientes POST] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { usuarioId, nombre, telefono, email } = await req.json();

    if (!usuarioId) {
      return NextResponse.json({ error: 'usuarioId es requerido' }, { status: 400 });
    }

    const sb = adminClient();

    const updateData: Record<string, any> = {};
    if (nombre) updateData.nombre_completo = nombre.trim();
    if (telefono !== undefined) updateData.telefono = telefono?.trim() || null;
    if (email) updateData.email = email.trim().toLowerCase();

    if (Object.keys(updateData).length > 0) {
      const { error } = await sb.from('usuarios').update(updateData).eq('id', usuarioId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[api/admin/clientes PUT] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { usuarioId, empresaId } = await req.json();

    if (!usuarioId || !empresaId) {
      return NextResponse.json({ error: 'usuarioId y empresaId son requeridos' }, { status: 400 });
    }

    const sb = adminClient();

    const { error } = await sb
      .from('usuario_empresa')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('empresa_id', empresaId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[api/admin/clientes DELETE] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
