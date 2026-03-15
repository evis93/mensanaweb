import { supabase } from '../config/supabase';
import { requirePermission, requireEmpresa } from '../utils/permissions';

export class ConsultanteController {
  // Buscar consultantes (clientes) por nombre o email
  // Un consultante es un usuario con rol 'cliente' en usuario_empresa
  static async buscarConsultantes(query, profile) {
    const permError = requirePermission(profile, 'consultantes:read');
    if (permError) return permError;

    try {
      if (!query || query.trim() === '') {
        return { success: true, data: [] };
      }

      const searchTerm = `%${query.trim().toLowerCase()}%`;

      // Obtener clientes de la empresa
      let empresaFilter = null;
      if (profile.rol !== 'superadmin') {
        const empError = requireEmpresa(profile);
        if (empError) return empError;
        empresaFilter = profile.empresaId;
      }

      // Buscar usuarios que son clientes
      let dbQuery = supabase
        .from('usuario_empresa')
        .select(`
          usuario_id,
          usuarios!inner(
            id,
            nombre_completo,
            email,
            telefono
          ),
          roles!inner(nombre)
        `)
        .eq('roles.nombre', 'cliente')
        .or(`nombre_completo.ilike.${searchTerm},email.ilike.${searchTerm}`, { referencedTable: 'usuarios' })
        .limit(10);

      if (empresaFilter) {
        dbQuery = dbQuery.eq('empresa_id', empresaFilter);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      // Obtener fichas de estos usuarios
      const usuarioIds = (data || []).map(d => d.usuarios.id);
      let fichasMap = new Map();

      if (usuarioIds.length > 0 && empresaFilter) {
        const { data: fichas } = await supabase
          .from('fichas')
          .select('id, cliente_id')
          .in('cliente_id', usuarioIds)
          .eq('empresa_id', empresaFilter)
          .eq('activo', true);

        (fichas || []).forEach(f => fichasMap.set(f.cliente_id, f.id));
      }

      const consultantes = (data || []).map(item => ({
        id: item.usuarios.id,
        usuario_id: item.usuarios.id,
        ficha_id: fichasMap.get(item.usuarios.id) || null,
        nombre_completo: item.usuarios.nombre_completo || '',
        email: item.usuarios.email || '',
        telefono: item.usuarios.telefono || '',
      })).sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

      return {
        success: true,
        data: consultantes,
      };
    } catch (error) {
      console.error('[buscarConsultantes] Error:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Obtener todos los consultantes (clientes)
  static async obtenerConsultantes(profile) {
    const permError = requirePermission(profile, 'consultantes:read');
    if (permError) return permError;

    try {
      let empresaFilter = null;
      if (profile.rol !== 'superadmin') {
        const empError = requireEmpresa(profile);
        if (empError) return empError;
        empresaFilter = profile.empresaId;
      }

      let query = supabase
        .from('usuario_empresa')
        .select(`
          usuario_id,
          usuarios!inner(
            id,
            nombre_completo,
            email,
            telefono
          ),
          roles!inner(nombre)
        `)
        .eq('roles.nombre', 'cliente');

      if (empresaFilter) {
        query = query.eq('empresa_id', empresaFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Obtener fichas
      const usuarioIds = (data || []).map(d => d.usuarios.id);
      let fichasMap = new Map();

      if (usuarioIds.length > 0 && empresaFilter) {
        const { data: fichas } = await supabase
          .from('fichas')
          .select('id, cliente_id')
          .in('cliente_id', usuarioIds)
          .eq('empresa_id', empresaFilter)
          .eq('activo', true);

        (fichas || []).forEach(f => fichasMap.set(f.cliente_id, f.id));
      }

      const consultantes = (data || []).map(item => ({
        id: item.usuarios.id,
        usuario_id: item.usuarios.id,
        ficha_id: fichasMap.get(item.usuarios.id) || null,
        nombre_completo: item.usuarios.nombre_completo || '',
        email: item.usuarios.email || '',
        telefono: item.usuarios.telefono || '',
      })).sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

      return {
        success: true,
        data: consultantes,
      };
    } catch (error) {
      console.error('[obtenerConsultantes] Error:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Crear nuevo consultante (cliente)
  // Solo crea usuario + rol cliente en usuario_empresa (sin login si no tiene email)
  static async crearConsultante(consultanteData, profile) {
    const permError = requirePermission(profile, 'consultantes:write');
    if (permError) return permError;

    const empError = requireEmpresa(profile);
    if (empError) return empError;

    try {
      const { nombre_completo, email, telefono } = consultanteData;

      if (!nombre_completo || nombre_completo.trim() === '') {
        return {
          success: false,
          error: 'El nombre es obligatorio',
        };
      }

      // Verificar si ya existe un usuario con el mismo email
      if (email && email.trim() !== '') {
        const { data: usuarioExistente } = await supabase
          .from('usuarios')
          .select('id, nombre_completo, email, telefono')
          .eq('email', email.trim())
          .maybeSingle();

        if (usuarioExistente) {
          // Verificar si ya tiene rol cliente en esta empresa
          const { data: ueExistente } = await supabase
            .from('usuario_empresa')
            .select('id, roles!inner(nombre)')
            .eq('usuario_id', usuarioExistente.id)
            .eq('empresa_id', profile.empresaId)
            .eq('roles.nombre', 'cliente')
            .maybeSingle();

          if (ueExistente) {
            return {
              success: true,
              data: {
                id: usuarioExistente.id,
                usuario_id: usuarioExistente.id,
                nombre_completo: usuarioExistente.nombre_completo,
                email: usuarioExistente.email,
                telefono: usuarioExistente.telefono,
              },
              message: 'Usuario ya existe como cliente',
            };
          }

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
                usuario_id: usuarioExistente.id,
                empresa_id: profile.empresaId,
                rol_id: rolData.id,
              }]);
          }

          return {
            success: true,
            data: {
              id: usuarioExistente.id,
              usuario_id: usuarioExistente.id,
              nombre_completo: usuarioExistente.nombre_completo,
              email: usuarioExistente.email,
              telefono: usuarioExistente.telefono,
            },
            message: 'Rol cliente agregado',
          };
        }
      }

      // Crear nuevo usuario (sin auth_user_id, sin login)
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .insert([{
          nombre_completo: nombre_completo.trim(),
          email: email?.trim() || null,
          telefono: telefono?.trim() || null,
          activo: true,
          auth_user_id: null,
        }])
        .select()
        .single();

      if (usuarioError) throw usuarioError;

      // Obtener rol_id de cliente
      const { data: rolData } = await supabase
        .from('roles')
        .select('id')
        .eq('nombre', 'cliente')
        .single();

      // Agregar en usuario_empresa
      if (rolData) {
        await supabase
          .from('usuario_empresa')
          .insert([{
            usuario_id: usuarioData.id,
            empresa_id: profile.empresaId,
            rol_id: rolData.id,
          }]);
      }

      return {
        success: true,
        data: {
          id: usuarioData.id,
          usuario_id: usuarioData.id,
          nombre_completo: usuarioData.nombre_completo,
          email: usuarioData.email,
          telefono: usuarioData.telefono,
        },
        message: 'Consultante creado exitosamente',
      };
    } catch (error) {
      console.error('[crearConsultante] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obtener consultante por ID (usuario_id)
  static async obtenerConsultantePorId(id, profile) {
    const permError = requirePermission(profile, 'consultantes:read');
    if (permError) return permError;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, email, telefono')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Obtener ficha si existe
      let fichaId = null;
      if (profile.empresaId) {
        const { data: ficha } = await supabase
          .from('fichas')
          .select('id')
          .eq('cliente_id', id)
          .eq('empresa_id', profile.empresaId)
          .eq('activo', true)
          .maybeSingle();

        fichaId = ficha?.id || null;
      }

      return {
        success: true,
        data: {
          id: data.id,
          usuario_id: data.id,
          ficha_id: fichaId,
          nombre_completo: data.nombre_completo || '',
          email: data.email || '',
          telefono: data.telefono || '',
        },
      };
    } catch (error) {
      console.error('[obtenerConsultantePorId] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Actualizar consultante
  static async actualizarConsultante(id, consultanteData, profile) {
    const permError = requirePermission(profile, 'consultantes:write');
    if (permError) return permError;

    try {
      const { nombre_completo, email, telefono } = consultanteData;

      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre_completo: nombre_completo?.trim() || null,
          email: email?.trim() || null,
          telefono: telefono?.trim() || null,
        })
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        message: 'Consultante actualizado correctamente',
      };
    } catch (error) {
      console.error('[actualizarConsultante] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Desactivar consultante (soft delete en usuario_empresa)
  static async desactivarConsultante(id, profile) {
    const permError = requirePermission(profile, 'consultantes:write');
    if (permError) return permError;

    try {
      const { error } = await supabase
        .from('usuario_empresa')
        .delete()
        .eq('cliente_id', id)
        .eq('empresa_id', profile.empresaId);

      if (error) throw error;

      return {
        success: true,
        message: 'Consultante desactivado correctamente',
      };
    } catch (error) {
      console.error('[desactivarConsultante] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
