import { supabase } from '../config/supabase';
import { ReservaModel } from '../models/ReservaModel';
import { requirePermission, requireEmpresa } from '../utils/permissions';

export class ReservaController {
  // Función auxiliar para enriquecer reservas con datos de consultante y profesional
  static async enriquecerReservas(reservas) {
    if (!reservas || reservas.length === 0) return [];

    // Obtener IDs únicos
    const clienteIds = [...new Set(reservas.map(r => r.cliente_id).filter(Boolean))];
    const profesionalIds = [...new Set(reservas.map(r => r.profesional_id).filter(Boolean))];

    // Obtener datos de usuarios (clientes y profesionales)
    const todosIds = [...new Set([...clienteIds, ...profesionalIds])];

    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, email, telefono')
      .in('id', todosIds);

    // Crear mapa para búsqueda rápida
    const usuariosMap = new Map((usuarios || []).map(u => [u.id, u]));

    // Enriquecer cada reserva
    return reservas.map(reserva => {
      const cliente = usuariosMap.get(reserva.cliente_id);
      const profesional = usuariosMap.get(reserva.profesional_id);

      return new ReservaModel({
        ...reserva,
        consultante_id: reserva.cliente_id,
        consultante_nombre: cliente?.nombre_completo || '',
        consultante_email: cliente?.email || '',
        consultante_telefono: cliente?.telefono || '',
        profesional_nombre: profesional?.nombre_completo || '',
        servicio_nombre: reserva.servicios?.nombre || '',
      });
    });
  }

  // Helper: obtener profesional IDs de la empresa del profile
  static async obtenerProfesionalIdsEmpresa(profile) {
    if (profile.rol === 'superadmin') return null; // null = sin filtro

    const { data: usuarioEmpresa } = await supabase
      .from('usuario_empresa')
      .select('usuario_id, roles!inner(nombre)')
      .eq('empresa_id', profile.empresaId)
      .in('roles.nombre', ['profesional', 'admin']);

    return (usuarioEmpresa || []).map(r => r.usuario_id);
  }

  // Obtener reservas por fecha con datos del consultante
  static async obtenerReservasPorFecha(fecha, profesionalId, profile) {
    const permError = requirePermission(profile, 'reservas:read');
    if (permError) return permError;

    try {
      let query = supabase
        .from('reservas')
        .select('*, servicios(nombre)')
        .eq('fecha', fecha)
        .order('hora_inicio', { ascending: true });

      // Scoping por empresa
      if (profile.rol !== 'superadmin') {
        const empError = requireEmpresa(profile);
        if (empError) return empError;

        const profIds = await this.obtenerProfesionalIdsEmpresa(profile);
        if (profIds && profIds.length === 0) {
          return { success: true, data: [] };
        }
        if (profIds) {
          query = query.in('profesional_id', profIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const reservasEnriquecidas = await this.enriquecerReservas(data);

      return {
        success: true,
        data: reservasEnriquecidas,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obtener fechas con reservas del mes
  static async obtenerFechasConReservas(mesInicio, mesFin, profesionalId, profile) {
    const permError = requirePermission(profile, 'reservas:read');
    if (permError) return permError;

    try {
      let query = supabase
        .from('reservas')
        .select('fecha_hora_inicio')
        .gte('fecha_hora_inicio', mesInicio + 'T00:00:00')
        .lte('fecha_hora_inicio', mesFin + 'T23:59:59');

      if (profesionalId) {
        query = query.eq('profesional_id', profesionalId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Extraer fecha local AR (UTC-3) de cada timestamp
      const AR_OFFSET_MS = -3 * 60 * 60 * 1000;
      const mapped = (data || []).map(r => ({
        fecha: new Date(new Date(r.fecha_hora_inicio).getTime() + AR_OFFSET_MS)
          .toISOString().split('T')[0],
      }));

      return {
        success: true,
        data: mapped,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Crear nueva reserva
  static async crearReserva(reservaData, profesionalId, profile) {
    const permError = requirePermission(profile, 'reservas:write');
    if (permError) return permError;

    try {
      const reserva = new ReservaModel({
        ...reservaData,
        profesional_id: profesionalId,
        cliente_id: reservaData.cliente_id || reservaData.consultante_id,
        autor_id: profile.usuarioId,
        empresa_id: profile.empresaId,
      });

      if (!reserva.isValid()) {
        return {
          success: false,
          error: 'Complete los campos obligatorios (cliente, fecha, hora, tipo de sesión)',
        };
      }

      const insertData = reserva.toJSON();

      const { data, error } = await supabase
        .from('reservas')
        .insert([insertData])
        .select('*');

      if (error) throw error;

      const [reservaEnriquecida] = await this.enriquecerReservas(data);

      return {
        success: true,
        data: reservaEnriquecida,
      };
    } catch (error) {
      console.error('[ReservaController.crearReserva] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Eliminar reserva
  static async eliminarReserva(id, profile) {
    const permError = requirePermission(profile, 'reservas:write');
    if (permError) return permError;

    try {
      const { error } = await supabase
        .from('reservas')
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

  // Actualizar estado de reserva
  static async actualizarEstado(id, nuevoEstado, profile) {
    const permError = requirePermission(profile, 'reservas:write');
    if (permError) return permError;

    try {
      const { error } = await supabase
        .from('reservas')
        .update({ estado: nuevoEstado })
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

  // Obtener todas las reservas (scoped por empresa)
  static async obtenerTodas(profile) {
    const permError = requirePermission(profile, 'reservas:read');
    if (permError) return permError;

    try {
      let query = supabase
        .from('reservas')
        .select('*')
        .order('fecha', { ascending: false });

      // Scoping por empresa
      if (profile.rol !== 'superadmin') {
        const empError = requireEmpresa(profile);
        if (empError) return empError;

        const profIds = await this.obtenerProfesionalIdsEmpresa(profile);
        if (profIds && profIds.length === 0) return { success: true, data: [] };
        if (profIds) {
          query = query.in('profesional_id', profIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return { success: true, data: [] };

      // Obtener IDs únicos
      const clienteIds = [...new Set(data.map(r => r.cliente_id).filter(Boolean))];
      const profesionalIds = [...new Set(data.map(r => r.profesional_id).filter(Boolean))];
      const todosIds = [...new Set([...clienteIds, ...profesionalIds])];

      // Obtener datos de usuarios
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, email, telefono')
        .in('id', todosIds);

      const usuariosMap = new Map((usuarios || []).map(u => [u.id, u]));

      const reservasEnriquecidas = data.map(reserva => {
        const cliente = usuariosMap.get(reserva.cliente_id);
        const profesional = usuariosMap.get(reserva.profesional_id);

        return {
          ...reserva,
          consultante: cliente ? {
            nombre: cliente.nombre_completo || '',
            email: cliente.email || '',
            telefono: cliente.telefono || '',
          } : null,
          profesional: profesional ? {
            nombre: profesional.nombre_completo || '',
          } : null,
        };
      });

      return {
        success: true,
        data: reservasEnriquecidas,
      };
    } catch (error) {
      console.error('[ReservaController.obtenerTodas] Error:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Obtener resumen de caja diario (scoped por empresa)
  static async obtenerResumenCajaDiario(fecha, profile) {
    const permError = requirePermission(profile, 'reportes:read');
    if (permError) return permError;

    try {
      let query = supabase
        .from('reservas')
        .select('*')
        .eq('fecha', fecha);

      // Scoping por empresa
      if (profile.rol !== 'superadmin') {
        const empError = requireEmpresa(profile);
        if (empError) return empError;

        const profIds = await this.obtenerProfesionalIdsEmpresa(profile);
        if (profIds && profIds.length === 0) {
          return {
            success: true,
            data: { totalRecaudado: 0, desglosePagos: {}, transaccionesPendientes: [], cantidadPagadas: 0, cantidadPendientes: 0 },
          };
        }
        if (profIds) {
          query = query.in('profesional_id', profIds);
        }
      }

      const { data: reservas, error } = await query;

      if (error) throw error;

      const reservasPagadas = (reservas || []).filter(r => r.pagado === true);
      const totalRecaudado = reservasPagadas.reduce((sum, r) => sum + (r.precio_total || 0), 0);

      const desglosePagos = {};
      reservasPagadas.forEach(r => {
        const metodo = r.metodo_pago || 'sin_especificar';
        if (!desglosePagos[metodo]) {
          desglosePagos[metodo] = 0;
        }
        desglosePagos[metodo] += (r.precio_total || 0);
      });

      const reservasPendientes = (reservas || []).filter(r => r.pagado !== true);
      const transaccionesPendientes = await this.enriquecerReservas(reservasPendientes);

      return {
        success: true,
        data: {
          totalRecaudado,
          desglosePagos,
          transaccionesPendientes,
          cantidadPagadas: reservasPagadas.length,
          cantidadPendientes: transaccionesPendientes.length,
        },
      };
    } catch (error) {
      console.error('[ReservaController.obtenerResumenCajaDiario] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Registrar pago de una reserva
  static async registrarPago(id, pagoData, profile) {
    const permError = requirePermission(profile, 'reservas:write');
    if (permError) return permError;

    try {
      const updateData = {};
      if (pagoData.precio_total !== undefined) updateData.precio_total = pagoData.precio_total;
      if (pagoData.metodo_pago !== undefined) updateData.metodo_pago = pagoData.metodo_pago;
      if (pagoData.pagado !== undefined) updateData.pagado = pagoData.pagado;

      const { error } = await supabase
        .from('reservas')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Obtener una reserva por ID con ficha incluida (Gap #12)
  static async obtenerReservaPorId(id, profile) {
    const permError = requirePermission(profile, 'reservas:read');
    if (permError) return permError;

    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*, servicios(nombre), fichas(id, nota)')
        .eq('id', id)
        .single();

      if (error) throw error;

      const [enriquecida] = await this.enriquecerReservas([data]);
      return {
        success: true,
        data: { ...enriquecida, ficha: data.fichas?.[0] || null },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Obtener historial de reservas de un cliente (Gap #13)
  static async obtenerReservasPorCliente(clienteId, profile) {
    const permError = requirePermission(profile, 'reservas:read');
    if (permError) return permError;

    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*, servicios(nombre), fichas(nota)')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', profile.empresaId)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Actualizar reserva completa
  static async actualizarReserva(id, reservaData, profile) {
    const permError = requirePermission(profile, 'reservas:write');
    if (permError) return permError;

    try {
      const reserva = new ReservaModel({
        ...reservaData,
        cliente_id: reservaData.cliente_id || reservaData.consultante_id,
      });

      if (!reserva.isValid()) {
        return {
          success: false,
          error: 'Complete los campos obligatorios',
        };
      }

      const updateData = reserva.toJSON();

      const { data, error } = await supabase
        .from('reservas')
        .update(updateData)
        .eq('id', id)
        .select('*');

      if (error) throw error;

      const [reservaEnriquecida] = await this.enriquecerReservas(data);

      return {
        success: true,
        data: reservaEnriquecida,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
