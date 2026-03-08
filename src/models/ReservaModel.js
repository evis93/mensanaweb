export class ReservaModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.empresa_id = data.empresa_id || null;
    this.profesional_id = data.profesional_id || null;
    this.cliente_id = data.cliente_id || data.consultante_id || null;
    this.autor_id = data.autor_id || null;
    this.servicio_id = data.servicio_id || data.tipo_sesion_id || null;
    this.sucursal_id = data.sucursal_id || null;

    // Datos del cliente (enriquecidos)
    this.consultante_id = this.cliente_id;
    this.consultante_nombre = data.consultante_nombre || '';
    this.consultante_email = data.consultante_email || '';
    this.consultante_telefono = data.consultante_telefono || '';

    // Datos del profesional (enriquecidos)
    this.profesional_nombre = data.profesional_nombre || '';

    // Nombre del servicio (enriquecido)
    this.servicio_nombre = data.servicio_nombre || '';

    this.fecha = data.fecha || '';
    this.hora_inicio = data.hora_inicio || '';
    this.estado = data.estado || 'pendiente';

    // Campos de pago
    const precioTotal = data.precio_total;
    this.precio_total = (precioTotal === '' || precioTotal === null || precioTotal === undefined)
      ? null
      : parseFloat(precioTotal);

    const montoSeña = data.monto_seña;
    this.monto_seña = (montoSeña === '' || montoSeña === null || montoSeña === undefined)
      ? null
      : parseFloat(montoSeña);

    this.seña_pagada = data.seña_pagada || false;
    this.pagado = data.pagado || false;
    this.metodo_pago = data.metodo_pago || null;

    // Campos de auditoría
    this.recordatorio_enviado = data.recordatorio_enviado || false;
    this.created_at = data.created_at || null;
  }

  // Validaciones
  isValid() {
    return (
      this.cliente_id !== null &&
      this.fecha !== '' &&
      this.hora_inicio !== ''
    );
  }

  // Formateo de hora para mostrar
  getHoraFormateada() {
    if (!this.hora_inicio) return '';
    return this.hora_inicio.substring(0, 5);
  }

  // Convertir a objeto para Supabase
  toJSON() {
    return {
      empresa_id: this.empresa_id,
      profesional_id: this.profesional_id,
      cliente_id: this.cliente_id,
      autor_id: this.autor_id,
      servicio_id: this.servicio_id,
      sucursal_id: this.sucursal_id,
      fecha: this.fecha,
      hora_inicio: this.hora_inicio,
      estado: this.estado,
      precio_total: this.precio_total,
      monto_seña: this.monto_seña,
      seña_pagada: this.seña_pagada,
      pagado: this.pagado,
      metodo_pago: this.metodo_pago,
    };
  }
}
