export class ProfesionalModel {
  constructor(data = {}) {
    this.id = data.id || data.usuario_id || null;
    this.usuario_id = data.usuario_id || data.id || null;
    this.nombre_completo = data.nombre_completo || data.nombre || '';
    this.email = data.email || '';
    this.telefono = data.telefono || '';
    this.avatar_url = data.avatar_url || data.logo_url || null;
    this.rol = data.rol || 'profesional';
    this.activo = data.activo !== undefined ? data.activo : true;
  }

  isValid() {
    return this.nombre_completo.trim() !== '';
  }

  toJSON() {
    return {
      id: this.id,
      usuario_id: this.usuario_id,
      nombre_completo: this.nombre_completo,
      email: this.email,
      telefono: this.telefono,
      avatar_url: this.avatar_url,
      rol: this.rol,
      activo: this.activo,
    };
  }
}
