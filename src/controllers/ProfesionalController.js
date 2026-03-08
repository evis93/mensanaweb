import { supabase, supabaseAdmin } from '../config/supabase';
import { requirePermission, requireEmpresa } from '../utils/permissions';

export class ProfesionalController {
  // Obtener todos los profesionales activos (scoped por empresa)
  // Un profesional es un usuario con rol 'profesional' o 'admin' en usuario_empresa
  static async obtenerProfesionales(profile) {
    const permError = requirePermission(profile, 'profesionales:read');
    if (permError) return permError;

    try {
      // Mensana ve todo; los demás filtran por empresa
      let empresaFilter = null;
      if (profile.rol !== 'superadmin') {
        const empError = requireEmpresa(profile);
        if (empError) return empError;
        empresaFilter = profile.empresaId;
      }

      // Obtener usuarios que son profesionales/admins en la empresa
      let query = supabase
        .from('usuario_empresa')
        .select(`
          usuario_id,
          roles!inner(nombre),
          usuarios!inner(
            id,
            nombre_completo,
            email,
            telefono,
            avatar_url
          )
        `)
        .in('roles.nombre', ['profesional', 'admin']);

      if (empresaFilter) {
        query = query.eq('empresa_id', empresaFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const ROL_PRIORIDAD = { superadmin: 4, admin: 3, profesional: 2, cliente: 1 };
      const profMap = new Map();
      (data || []).forEach(item => {
        const id = item.usuarios.id;
        const rol = item.roles.nombre;
        const existing = profMap.get(id);
        if (!existing || (ROL_PRIORIDAD[rol] || 0) > (ROL_PRIORIDAD[existing.rol] || 0)) {
          profMap.set(id, {
            id,
            usuario_id: id,
            nombre_completo: item.usuarios.nombre_completo || '',
            email: item.usuarios.email || '',
            telefono: item.usuarios.telefono || '',
            avatar_url: item.usuarios.avatar_url || '',
            rol,
          });
        }
      });
      const profesionales = Array.from(profMap.values());

      profesionales.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

      return {
        success: true,
        data: profesionales,
      };
    } catch (error) {
      console.error('[obtenerProfesionales] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obtener profesional por ID (usuario_id)
  static async obtenerProfesionalPorId(id, profile) {
    const permError = requirePermission(profile, 'profesionales:read');
    if (permError) return permError;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, email, telefono, avatar_url')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          usuario_id: data.id,
          nombre_completo: data.nombre_completo,
          email: data.email,
          telefono: data.telefono,
          avatar_url: data.avatar_url,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Crear nuevo profesional con cuenta de usuario completa
  static async crearProfesional(profesionalData, profile) {
    const permError = requirePermission(profile, 'profesionales:write');
    if (permError) return permError;

    const empError = requireEmpresa(profile);
    if (empError) return empError;

    try {
      const { nombre, email, telefono, esAdmin } = profesionalData;

      if (!nombre || !email) {
        return {
          success: false,
          error: 'Complete los campos obligatorios (nombre y email)',
        };
      }

      const emailNormalizado = email.trim().toLowerCase();
      const passwordTemporal = '123456';

      // 1. Crear auth user con contraseña temporal (sin necesidad de email)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailNormalizado,
        password: passwordTemporal,
        email_confirm: true,
        user_metadata: { nombre_completo: nombre },
      });

      let authUserId;

      if (authError) {
        // Si el email ya tiene cuenta en Auth, reusar el auth_user_id existente sin tocar la contraseña
        if (authError.status === 422 || authError.message?.includes('already been registered')) {
          const { data: byEmail } = await supabase
            .from('usuarios')
            .select('id, auth_user_id')
            .eq('email', emailNormalizado)
            .maybeSingle();
          if (byEmail?.auth_user_id) {
            authUserId = byEmail.auth_user_id;
            // NO se resetea la contraseña: el usuario ya tiene acceso con sus credenciales actuales
          } else {
            throw new Error('El email ya está registrado. Si es un profesional existente, editalo desde la lista.');
          }
        } else {
          throw new Error(`Error al crear cuenta: ${authError.message}`);
        }
      } else {
        authUserId = authData.user.id;
      }

      // 2. Verificar/crear registro en usuarios
      let usuarioId;
      const { data: usuarioExistente } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', emailNormalizado)
        .maybeSingle();

      if (usuarioExistente) {
        usuarioId = usuarioExistente.id;
        // Vincular auth_user_id si estaba vacío
        await supabase
          .from('usuarios')
          .update({ auth_user_id: authUserId })
          .eq('id', usuarioId)
          .is('auth_user_id', null);
      } else {
        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuarios')
          .insert([{
            auth_user_id: authUserId,
            nombre_completo: nombre,
            email: emailNormalizado,
            telefono: telefono || null,
            activo: true,
          }])
          .select()
          .single();

        if (usuarioError) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
          throw new Error(`Error al crear registro de usuario: ${usuarioError.message}`);
        }
        usuarioId = usuarioData.id;
      }

      // 3. Obtener el rol_id correspondiente
      const rolCodigo = esAdmin ? 'admin' : 'profesional';
      const { data: rolData, error: rolError } = await supabase
        .from('roles')
        .select('id')
        .eq('nombre', rolCodigo)
        .single();

      if (rolError || !rolData) {
        throw new Error(`No se encontró el rol: ${rolCodigo}`);
      }

      // 4. Crear/actualizar en usuario_empresa
      const ROL_PRIORIDAD = { superadmin: 4, admin: 3, profesional: 2, cliente: 1 };

      const { data: ueExistente } = await supabase
        .from('usuario_empresa')
        .select('id, roles(nombre)')
        .eq('usuario_id', usuarioId)
        .eq('empresa_id', profile.empresaId)
        .maybeSingle();

      if (ueExistente) {
        const rolActual = ueExistente.roles?.nombre;
        const prioridadActual = ROL_PRIORIDAD[rolActual] || 0;
        const prioridadNueva = ROL_PRIORIDAD[rolCodigo] || 0;

        if (prioridadActual >= prioridadNueva) {
          return {
            success: false,
            error: `Este usuario ya tiene el rol "${rolActual}" en esta empresa. Para cambiarlo usá la opción Editar desde la lista.`,
          };
        }

        await supabase
          .from('usuario_empresa')
          .update({ rol_id: rolData.id })
          .eq('id', ueExistente.id);
      } else {
        const { error: ueError } = await supabase
          .from('usuario_empresa')
          .insert([{
            usuario_id: usuarioId,
            empresa_id: profile.empresaId,
            rol_id: rolData.id,
          }]);

        if (ueError) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
          throw new Error(`Error al asignar empresa: ${ueError.message}`);
        }
      }

      return {
        success: true,
        data: {
          id: usuarioId,
          usuario_id: usuarioId,
          nombre_completo: nombre,
          email: emailNormalizado,
        },
        passwordTemporal,
      };
    } catch (error) {
      console.error('[crearProfesional] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Actualizar profesional y su rol
  static async actualizarProfesional(id, profesionalData, profile) {
    const permError = requirePermission(profile, 'profesionales:write');
    if (permError) return permError;

    try {
      const { nombre_completo, email, telefono, esAdmin } = profesionalData;

      // 1. Leer registro actual para verificar auth_user_id (supabase regular, ya funcionaba antes)
      const { data: usuarioActual, error: leerError } = await supabase
        .from('usuarios')
        .select('id, auth_user_id, email')
        .eq('id', id)
        .maybeSingle();

      if (leerError) {
        throw new Error(`Error al leer profesional: ${leerError.message}`);
      }

      let passwordTemporal = null;

      // 2. Si auth_user_id es null, crear auth user con contraseña temporal (reparación)
      if (usuarioActual && !usuarioActual.auth_user_id) {
        const emailParaAuth = email?.trim().toLowerCase() || usuarioActual.email;
        if (!emailParaAuth) {
          throw new Error('No se puede crear acceso sin email');
        }
        const tempPassword = '123456';
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: emailParaAuth,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { nombre_completo: nombre_completo },
        });
        if (authError) {
          throw new Error(`Error al crear acceso: ${authError.message}`);
        }
        const { error: patchError } = await supabase
          .from('usuarios')
          .update({ auth_user_id: authData.user.id })
          .eq('id', id);
        if (patchError) {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw new Error(`Error al vincular cuenta: ${patchError.message}`);
        }
        passwordTemporal = tempPassword;
      }

      // 3. Actualizar datos del usuario
      const emailActual = usuarioActual?.email || '';
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .update({
          nombre_completo: nombre_completo,
          email: email?.trim().toLowerCase() || emailActual,
          telefono: telefono,
        })
        .eq('id', id);

      if (usuarioError) throw usuarioError;

      // 4. Actualizar rol en usuario_empresa
      const rolCodigo = esAdmin ? 'admin' : 'profesional';
      const { data: rolData } = await supabase
        .from('roles')
        .select('id')
        .eq('nombre', rolCodigo)
        .single();

      if (rolData) {
        await supabase
          .from('usuario_empresa')
          .update({ rol_id: rolData.id })
          .eq('usuario_id', id)
          .eq('empresa_id', profile.empresaId);
      }

      return {
        success: true,
        message: 'Profesional actualizado correctamente',
        ...(passwordTemporal && { passwordTemporal }),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Desactivar profesional (soft delete en usuario_empresa)
  static async desactivarProfesional(id, profile) {
    const permError = requirePermission(profile, 'profesionales:write');
    if (permError) return permError;

    try {
      const { error } = await supabase
        .from('usuario_empresa')
        .delete()
        .eq('usuario_id', id)
        .eq('empresa_id', profile.empresaId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obtener profesionales disponibles para una fecha y hora
  static async obtenerProfesionalesDisponibles(fecha, horaInicio, horaFin, profile) {
    const permError = requirePermission(profile, 'reservas:read');
    if (permError) return permError;

    try {
      const diaSemana = new Date(fecha).getDay();

      // Obtener profesionales de la empresa
      const result = await this.obtenerProfesionales(profile);
      if (!result.success) return result;

      const profesionales = result.data;
      const profesionalIds = profesionales.map(p => p.id);

      if (profesionalIds.length === 0) {
        return { success: true, data: [] };
      }

      // Obtener horarios de atención
      const { data: horarios } = await supabase
        .from('horarios_atencion')
        .select('*')
        .in('profesional_id', profesionalIds)
        .eq('dia_semana', diaSemana);

      // Filtrar profesionales que trabajan en ese horario
      const disponibles = profesionales.filter(prof => {
        const horario = (horarios || []).find(h => h.profesional_id === prof.id);
        if (!horario) return false;
        return horaInicio >= horario.hora_inicio && horaFin <= horario.hora_fin;
      });

      return {
        success: true,
        data: disponibles,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
