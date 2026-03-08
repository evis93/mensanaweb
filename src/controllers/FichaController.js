import { supabase } from '../config/supabase';
import { FichaModel } from '../models/FichaModel';

export class FichaController {
    // Crear nueva ficha
    static async crearFicha(fichaData) {
        try {
            const ficha = new FichaModel(fichaData);

            if (!ficha.isValid()) {
                return {
                    success: false,
                    error: 'Complete los campos obligatorios de la ficha',
                };
            }

            const { data, error } = await supabase
                .from('fichas')
                .insert([ficha.toJSON()])
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                data: new FichaModel(data),
            };
        } catch (error) {
            console.error('[FichaController.crearFicha] Error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Obtener ficha por ID
    static async obtenerFichaPorId(id) {
        try {
            const { data, error } = await supabase
                .from('fichas')
                .select(`
          *,
          consultante:consultantes!consultante_id(
            id,
            usuario_id,
            usuarios!inner(nombre_completo, email, telefono)
          ),
          profesional:profesionales!profesional_id(
            id,
            usuario_id,
            usuarios!inner(nombre_completo, email)
          )
        `)
                .eq('id', id)
                .single();

            if (error) throw error;

            return {
                success: true,
                data: new FichaModel(data),
            };
        } catch (error) {
            console.error('[FichaController.obtenerFichaPorId] Error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Obtener fichas por consultante
    static async obtenerFichasPorConsultante(consultanteId) {
        try {
            const { data, error } = await supabase
                .from('fichas')
                .select(`
          *,
          consultante:consultantes!consultante_id(
            id,
            usuarios!inner(nombre_completo, email)
          ),
          profesional:profesionales!profesional_id(
            id,
            usuarios!inner(nombre_completo, email)
          )
        `)
                .eq('consultante_id', consultanteId)
                .order('fecha_atencion', { ascending: false });

            if (error) throw error;

            return {
                success: true,
                data: (data || []).map(item => new FichaModel(item)),
            };
        } catch (error) {
            console.error('[FichaController.obtenerFichasPorConsultante] Error:', error);
            return {
                success: false,
                error: error.message,
                data: [],
            };
        }
    }

    // Actualizar notas de atención
    static async actualizarNotas(id, notas) {
        try {
            const { data, error } = await supabase
                .from('fichas')
                .update({
                    notas_atencion: notas,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                data: new FichaModel(data),
                message: 'Notas actualizadas correctamente',
            };
        } catch (error) {
            console.error('[FichaController.actualizarNotas] Error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Obtener ficha por reserva
    static async obtenerFichaPorReserva(reservaId) {
        try {
            // Primero obtener la reserva para sacar el ficha_id
            const { data: reserva, error: reservaError } = await supabase
                .from('reservas')
                .select('ficha_id')
                .eq('id', reservaId)
                .single();

            if (reservaError) throw reservaError;

            if (!reserva.ficha_id) {
                return {
                    success: false,
                    error: 'Esta reserva no tiene ficha asociada',
                };
            }

            // Obtener la ficha
            return await this.obtenerFichaPorId(reserva.ficha_id);
        } catch (error) {
            console.error('[FichaController.obtenerFichaPorReserva] Error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Verificar si existe ficha para consultante/profesional/fecha
    static async existeFicha(consultanteId, profesionalId, fecha) {
        try {
            const { data, error } = await supabase
                .from('fichas')
                .select('id')
                .eq('consultante_id', consultanteId)
                .eq('profesional_id', profesionalId)
                .eq('fecha_atencion', fecha)
                .maybeSingle();

            if (error) throw error;

            return {
                success: true,
                existe: !!data,
                fichaId: data?.id || null,
            };
        } catch (error) {
            console.error('[FichaController.existeFicha] Error:', error);
            return {
                success: false,
                error: error.message,
                existe: false,
            };
        }
    }
}
