import { supabase } from '../config/supabase';

interface FilterOption {
  field: string;
  operator: string;
  value: unknown;
}

interface QueryOptions {
  select?: string;
  filters?: FilterOption[];
  order?: { field: string; ascending?: boolean };
  single?: boolean;
}

function applyFilters(query: any, filters: FilterOption[]) {
  filters.forEach(({ field, operator, value }) => {
    switch (operator) {
      case 'eq': query = query.eq(field, value); break;
      case 'neq': query = query.neq(field, value); break;
      case 'gt': query = query.gt(field, value); break;
      case 'gte': query = query.gte(field, value); break;
      case 'lt': query = query.lt(field, value); break;
      case 'lte': query = query.lte(field, value); break;
      case 'in': query = query.in(field, value); break;
      case 'not': query = query.not(field, operator, value); break;
      default: query = query.eq(field, value);
    }
  });
  return query;
}

export class DatabaseService {
  static async obtenerTiposSesion(empresaId: string | null = null) {
    try {
      let query = supabase
        .from('servicios')
        .select('id, nombre, duracion_minutos, precio')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async query(table: string, options: QueryOptions = {}) {
    try {
      const { select = '*', filters = [], order = null, single = false } = options;

      let query = supabase.from(table).select(select);
      query = applyFilters(query, filters);

      if (order) {
        query = query.order(order.field, { ascending: order.ascending ?? true });
      }

      if (single) {
        query = (query as any).single();
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async insert(table: string, data: object | object[], returnData = true) {
    try {
      const dataArray = Array.isArray(data) ? data : [data];
      let query = supabase.from(table).insert(dataArray);

      if (returnData) {
        query = (query as any).select();
      }

      const { data: result, error } = await query;
      if (error) throw error;

      return { success: true, data: returnData ? result : null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async update(table: string, data: object, filters: FilterOption[] = [], returnData = true) {
    try {
      let query = supabase.from(table).update(data);
      query = applyFilters(query, filters);

      if (returnData) {
        query = (query as any).select();
      }

      const { data: result, error } = await query;
      if (error) throw error;

      return { success: true, data: returnData ? result : null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async delete(table: string, filters: FilterOption[] = []) {
    try {
      let query = supabase.from(table).delete();
      query = applyFilters(query, filters);

      const { error } = await query;
      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async count(table: string, filters: FilterOption[] = []) {
    try {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      query = applyFilters(query, filters);

      const { count, error } = await query;
      if (error) throw error;

      return { success: true, data: count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
