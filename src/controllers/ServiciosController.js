import { supabase } from '../config/supabase';
import { requirePermission, requireEmpresa } from '../utils/permissions';

export class ServiciosController {
  static async obtenerServicios(profile) {
    const permError = requirePermission(profile, 'servicios:read');
    if (permError) return permError;

    const empError = requireEmpresa(profile);
    if (empError) return empError;

    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('empresa_id', profile.empresaId)
        .order('nombre');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async crearServicio(servicioData, profile) {
    const permError = requirePermission(profile, 'servicios:write');
    if (permError) return permError;

    const empError = requireEmpresa(profile);
    if (empError) return empError;

    try {
      const { nombre, descripcion, duracion_minutos, precio, sena_tipo, sena_valor, modalidad } = servicioData;
      if (!nombre?.trim()) return { success: false, error: 'El nombre es obligatorio' };

      const { data, error } = await supabase
        .from('servicios')
        .insert([{
          empresa_id: profile.empresaId,
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          duracion_minutos: duracion_minutos ? parseInt(duracion_minutos) : null,
          precio: precio ? parseFloat(precio) : null,
          sena_tipo: sena_tipo || 'monto',
          sena_valor: sena_valor ? parseFloat(sena_valor) : 0,
          modalidad: modalidad || 'presencial',
          activo: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async actualizarServicio(id, servicioData, profile) {
    const permError = requirePermission(profile, 'servicios:write');
    if (permError) return permError;

    try {
      const { nombre, descripcion, duracion_minutos, precio, sena_tipo, sena_valor, modalidad } = servicioData;
      if (!nombre?.trim()) return { success: false, error: 'El nombre es obligatorio' };

      const { error } = await supabase
        .from('servicios')
        .update({
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          duracion_minutos: duracion_minutos ? parseInt(duracion_minutos) : null,
          precio: precio ? parseFloat(precio) : null,
          sena_tipo: sena_tipo || 'monto',
          sena_valor: sena_valor ? parseFloat(sena_valor) : 0,
          modalidad: modalidad || 'presencial',
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async toggleActivo(id, activo, profile) {
    const permError = requirePermission(profile, 'servicios:write');
    if (permError) return permError;

    try {
      const { error } = await supabase
        .from('servicios')
        .update({ activo })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async eliminarServicio(id, profile) {
    const permError = requirePermission(profile, 'servicios:write');
    if (permError) return permError;

    try {
      const { error } = await supabase
        .from('servicios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async obtenerServiciosProfesional(profesionalId, profile) {
    const permError = requirePermission(profile, 'servicios:read');
    if (permError) return permError;

    try {
      const { data, error } = await supabase
        .from('profesional_servicio')
        .select('servicio_id')
        .eq('profesional_id', profesionalId);

      if (error) throw error;
      return { success: true, data: (data || []).map(r => r.servicio_id) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async guardarServiciosProfesional(profesionalId, servicioIds, profile) {
    const permError = requirePermission(profile, 'servicios:write');
    if (permError) return permError;

    try {
      const { error: deleteError } = await supabase
        .from('profesional_servicio')
        .delete()
        .eq('profesional_id', profesionalId);

      if (deleteError) throw deleteError;

      if (servicioIds.length > 0) {
        const inserts = servicioIds.map(servicio_id => ({
          profesional_id: profesionalId,
          servicio_id,
        }));
        const { error: insertError } = await supabase
          .from('profesional_servicio')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
