import { supabase } from '../config/supabase';
import { requirePermission } from '../utils/permissions';

export class HorarioController {
  static DIAS_SEMANA = [
    { id: 0, nombre: 'Domingo' },
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
  ];

  // Obtener horarios del profesional (usa profile.profesionalId en vez de TERAPEUTA_ID)
  static async obtenerHorarios(profile) {
    const permError = requirePermission(profile, 'horarios:read');
    if (permError) return permError;

    try {
      const profesionalId = profile.profesionalId;
      if (!profesionalId) {
        return { success: false, error: 'No se encontró ID de profesional' };
      }

      const { data, error } = await supabase
        .from('horarios_atencion')
        .select('*')
        .eq('profesional_id', profesionalId)
        .order('dia_semana', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Crear horario
  static async crearHorario(horarioData, profile) {
    const permError = requirePermission(profile, 'horarios:write');
    if (permError) return permError;

    try {
      const profesionalId = profile.profesionalId;
      if (!profesionalId) {
        return { success: false, error: 'No se encontró ID de profesional' };
      }

      const { data, error } = await supabase
        .from('horarios_atencion')
        .insert([{
          profesional_id: profesionalId,
          dia_semana: horarioData.dia_semana,
          hora_inicio: horarioData.hora_inicio,
          hora_fin: horarioData.hora_fin,
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Actualizar horario
  static async actualizarHorario(id, horarioData, profile) {
    const permError = requirePermission(profile, 'horarios:write');
    if (permError) return permError;

    try {
      const { data, error } = await supabase
        .from('horarios_atencion')
        .update({
          hora_inicio: horarioData.hora_inicio,
          hora_fin: horarioData.hora_fin,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Toggle activo/inactivo
  static async toggleActivo(id, activoActual, profile) {
    const permError = requirePermission(profile, 'horarios:write');
    if (permError) return permError;

    try {
      const { data, error } = await supabase
        .from('horarios_atencion')
        .update({ activo: !activoActual })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Eliminar horario
  static async eliminarHorario(id, profile) {
    const permError = requirePermission(profile, 'horarios:write');
    if (permError) return permError;

    try {
      const { error } = await supabase
        .from('horarios_atencion')
        .delete()
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
