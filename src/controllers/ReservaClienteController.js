import { supabase } from '../config/supabase';

// Helper: genera slots cada 30 min entre horaInicio y horaFin (strings 'HH:MM')
function generarSlotsDelRango(horaInicio, horaFin) {
  const slots = [];
  let [h, m] = horaInicio.split(':').map(Number);
  const [hFin, mFin] = horaFin.split(':').map(Number);
  const finTotal = hFin * 60 + mFin;

  while (h * 60 + m < finTotal) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += 30;
    if (m >= 60) { h += 1; m -= 60; }
  }
  return slots;
}

export class ReservaClienteController {

  // Profesionales activos de la empresa (sin guardia de permisos — RLS de Supabase controla acceso)
  static async obtenerProfesionalesEmpresa(empresaId) {
    try {
      const { data, error } = await supabase
        .from('usuario_empresa')
        .select(`
          usuario_id,
          roles!inner(nombre),
          usuarios!inner(id, nombre_completo, avatar_url)
        `)
        .eq('empresa_id', empresaId)
        .in('roles.nombre', ['profesional', 'admin']);

      if (error) throw error;

      // Deduplicar por usuario_id, priorizar 'admin' sobre 'profesional'
      const ROL_PRIORIDAD = { admin: 2, profesional: 1 };
      const profMap = new Map();
      (data || []).forEach(item => {
        const id = item.usuarios.id;
        const rol = item.roles.nombre;
        const existing = profMap.get(id);
        if (!existing || (ROL_PRIORIDAD[rol] || 0) > (ROL_PRIORIDAD[existing.rol] || 0)) {
          profMap.set(id, {
            id,
            nombre_completo: item.usuarios.nombre_completo || '',
            avatar_url: item.usuarios.avatar_url || '',
            rol,
          });
        }
      });

      const profesionales = Array.from(profMap.values());
      profesionales.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

      return { success: true, data: profesionales };
    } catch (error) {
      console.error('[ReservaClienteController.obtenerProfesionalesEmpresa]', error);
      return { success: false, error: error.message };
    }
  }

  // Servicios activos de la empresa
  static async obtenerServiciosEmpresa(empresaId) {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre, duracion_minutos, precio')
        .eq('empresa_id', empresaId)
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('[ReservaClienteController.obtenerServiciosEmpresa]', error);
      return { success: false, error: error.message };
    }
  }

  // Horarios del profesional para un día de semana (0=Dom, 1=Lun … 6=Sab)
  static async obtenerHorariosDelDia(profesionalId, diaSemana) {
    try {
      const { data, error } = await supabase
        .from('horarios_atencion')
        .select('hora_inicio, hora_fin')
        .eq('profesional_id', profesionalId)
        .eq('dia_semana', diaSemana)
        .eq('activo', true);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('[ReservaClienteController.obtenerHorariosDelDia]', error);
      return { success: false, error: error.message };
    }
  }

  // Slots ya ocupados para un profesional en una fecha (hora_inicio como 'HH:MM')
  static async obtenerSlotsOcupados(profesionalId, fecha) {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('hora_inicio')
        .eq('profesional_id', profesionalId)
        .eq('fecha', fecha)
        .neq('estado', 'cancelada');

      if (error) throw error;

      // Normalizar a 'HH:MM' para comparar con los slots generados
      const ocupados = (data || []).map(r => r.hora_inicio?.substring(0, 5));
      return { success: true, data: ocupados };
    } catch (error) {
      console.error('[ReservaClienteController.obtenerSlotsOcupados]', error);
      return { success: false, error: error.message };
    }
  }

  // Calcula los slots disponibles (libres) dados los horarios del profesional y las reservas existentes
  static calcularSlotsDisponibles(horarios, ocupados) {
    const todosLosSlots = [];
    horarios.forEach(h => {
      todosLosSlots.push(...generarSlotsDelRango(h.hora_inicio, h.hora_fin));
    });

    const disponibles = todosLosSlots.filter(s => !ocupados.includes(s));

    const manana = disponibles.filter(s => {
      const [h] = s.split(':').map(Number);
      return h < 13;
    });
    const tarde = disponibles.filter(s => {
      const [h] = s.split(':').map(Number);
      return h >= 13;
    });

    return { manana, tarde, todos: disponibles };
  }

  // Crea la solicitud de turno con estado 'pendiente'
  static async solicitarReserva({ empresaId, profesionalId, clienteId, servicioId, fecha, horaInicio }) {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .insert([{
          empresa_id: empresaId,
          profesional_id: profesionalId,
          cliente_id: clienteId,
          autor_id: clienteId,
          servicio_id: servicioId || null,
          fecha,
          hora_inicio: `${horaInicio}:00`,
          estado: 'pendiente',
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[ReservaClienteController.solicitarReserva]', error);
      return { success: false, error: error.message };
    }
  }
}
