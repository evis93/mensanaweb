import { supabase, supabaseAdmin } from '../config/supabase';
import { FichaConsultanteModel } from '../models/FichaConsultanteModel';
import { requirePermission, requireEmpresa } from '../utils/permissions';

export class FichaConsultanteController {
  // Crear ficha de consultante con perfil de usuario automático
  // La ficha se vincula a usuario_id + empresa_id (unique)
  static async crearFichaConsultante(fichaData, profile) {
    const permError = requirePermission(profile, 'consultantes:write');
    if (permError) return permError;

    const empError = requireEmpresa(profile);
    if (empError) return empError;

    try {
      const {
        nombre_completo,
        email,
        telefono,
        edad,
        profesional_id,
      } = fichaData;

      if (!nombre_completo) {
        return {
          success: false,
          error: 'El nombre es obligatorio',
        };
      }

      let usuarioId = null;

      // Si tiene email, crear usuario completo con autenticación
      if (email && email.trim() !== '') {
        // Verificar si ya existe usuario con este email
        const { data: existingUsuario } = await supabase
          .from('usuarios')
          .select('id, auth_user_id')
          .eq('email', email.trim())
          .maybeSingle();

        if (existingUsuario) {
          usuarioId = existingUsuario.id;

          // Verificar si ya tiene ficha en esta empresa
          const { data: fichaExistente } = await supabase
            .from('fichas')
            .select('id')
            .eq('cliente_id', usuarioId)
            .eq('empresa_id', profile.empresaId)
            .maybeSingle();

          if (fichaExistente) {
            return {
              success: false,
              error: 'Este usuario ya tiene una ficha en esta empresa',
            };
          }
        } else {
          // Crear usuario nuevo con autenticación
          const passwordTemporal = '123456';

          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: passwordTemporal,
            email_confirm: true,
            user_metadata: {
              nombre_completo: nombre_completo,
            }
          });

          if (authError) {
            throw new Error(`Error al crear cuenta de usuario: ${authError.message}`);
          }

          const { data: usuarioData, error: usuarioError } = await supabase
            .from('usuarios')
            .insert([{
              auth_user_id: authData.user.id,
              nombre_completo: nombre_completo,
              email: email,
              telefono: telefono || null,
              activo: true,
            }])
            .select()
            .single();

          if (usuarioError) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw new Error(`Error al crear registro de usuario: ${usuarioError.message}`);
          }

          usuarioId = usuarioData.id;

          // Agregar rol cliente en usuario_empresa
          const { data: rolData } = await supabase
            .from('roles')
            .select('id')
            .eq('nombre', 'cliente')
            .single();

          if (rolData) {
            await supabase
              .from('usuario_empresa')
              .insert([{
                usuario_id: usuarioId,
                empresa_id: profile.empresaId,
                rol_id: rolData.id,
              }]);
          }
        }
      } else {
        // Sin email: crear usuario sin autenticación
        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuarios')
          .insert([{
            nombre_completo: nombre_completo,
            email: null,
            telefono: telefono || null,
            activo: true,
            auth_user_id: null,
          }])
          .select()
          .single();

        if (usuarioError) throw usuarioError;

        usuarioId = usuarioData.id;

        // Agregar rol cliente
        const { data: rolData } = await supabase
          .from('roles')
          .select('id')
          .eq('nombre', 'cliente')
          .single();

        if (rolData) {
          await supabase
            .from('usuario_empresa')
            .insert([{
              usuario_id: usuarioId,
              empresa_id: profile.empresaId,
              rol_id: rolData.id,
            }]);
        }
      }

      // Crear ficha vinculada a cliente_id + empresa_id
      const fichaToInsert = {
        cliente_id: usuarioId,
        profesional_id: profesional_id || null,
        empresa_id: profile.empresaId,
        edad: edad || null,
        estado: 'abierta',
        activo: true,
        fecha_apertura: new Date().toISOString().split('T')[0],
      };

      const { data: fichaResult, error: fichaError } = await supabase
        .from('fichas')
        .insert([fichaToInsert])
        .select()
        .single();

      if (fichaError) {
        throw new Error(`Error al crear ficha: ${fichaError.message}`);
      }

      return {
        success: true,
        data: {
          ...fichaResult,
          nombre_completo: nombre_completo,
          email: email || null,
          telefono: telefono || null,
        },
        message: email
          ? 'Ficha y perfil de consultante creados exitosamente'
          : 'Ficha de consultante creada exitosamente (sin usuario de acceso)',
      };
    } catch (error) {
      console.error('[crearFichaConsultante] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obtener todas las fichas de consultantes
  static async obtenerFichasConsultantes(profesionalId = null, profile) {
    const permError = requirePermission(profile, 'consultantes:read');
    if (permError) return permError;

    try {
      let query = supabase
        .from('fichas')
        .select(`
          *,
          usuarios!fichas_cliente_id_fkey(
            id,
            nombre_completo,
            email,
            telefono
          )
        `)
        .eq('activo', true);

      // Scoping por empresa
      if (profile.rol !== 'superadmin') {
        const empError = requireEmpresa(profile);
        if (empError) return empError;
        query = query.eq('empresa_id', profile.empresaId);
      }

      if (profesionalId) {
        query = query.eq('profesional_id', profesionalId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const fichasConDatos = (data || []).map((ficha) => ({
        ...ficha,
        nombre_completo: ficha.usuarios?.nombre_completo || 'Sin nombre',
        email: ficha.usuarios?.email || null,
        telefono: ficha.usuarios?.telefono || null,
      }));

      return {
        success: true,
        data: fichasConDatos,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obtener ficha por ID
  static async obtenerFichaPorId(id, profile) {
    const permError = requirePermission(profile, 'consultantes:read');
    if (permError) return permError;

    try {
      const { data, error } = await supabase
        .from('fichas')
        .select(`
          *,
          usuarios!fichas_cliente_id_fkey(
            id,
            nombre_completo,
            email,
            telefono
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const fichaConDatos = {
        ...data,
        nombre_completo: data.usuarios?.nombre_completo || 'Sin nombre',
        email: data.usuarios?.email || null,
        telefono: data.usuarios?.telefono || null,
      };

      return {
        success: true,
        data: new FichaConsultanteModel(fichaConDatos),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Actualizar ficha de consultante
  static async actualizarFicha(id, fichaData, profile) {
    const permError = requirePermission(profile, 'consultantes:write');
    if (permError) return permError;

    try {
      const updateData = {
        edad: fichaData.edad || null,
        profesional_id: fichaData.profesional_id || null,
        estado: fichaData.estado || 'abierta',
      };

      const { error } = await supabase
        .from('fichas')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        message: 'Ficha actualizada correctamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Desactivar ficha (soft delete)
  static async desactivarFicha(id, profile) {
    const permError = requirePermission(profile, 'consultantes:write');
    if (permError) return permError;

    try {
      const { error } = await supabase
        .from('fichas')
        .update({ activo: false, estado: 'inactivo' })
        .eq('id', id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
