export class FichaConsultanteModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.cliente_id = data.cliente_id || null;
    this.profesional_id = data.profesional_id || null;
    this.empresa_id = data.empresa_id || null;
    this.estado = data.estado || 'abierta';
    this.fecha_apertura = data.fecha_apertura || new Date().toISOString().split('T')[0];
    this.edad = data.edad || null;
    this.activo = data.activo !== undefined ? data.activo : true;
    this.created_at = data.created_at || null;

    // Datos enriquecidos del cliente (desde JOIN)
    this.nombre_completo = data.nombre_completo || '';
    this.email = data.email || '';
    this.telefono = data.telefono || '';
  }

  isValid() {
    return this.cliente_id !== null;
  }

  toJSON() {
    return {
      cliente_id: this.cliente_id,
      profesional_id: this.profesional_id,
      empresa_id: this.empresa_id,
      estado: this.estado,
      fecha_apertura: this.fecha_apertura,
      edad: this.edad,
      activo: this.activo,
    };
  }
}
