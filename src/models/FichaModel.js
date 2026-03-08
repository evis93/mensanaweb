export class FichaModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.consultante_id = data.consultante_id || '';
        this.profesional_id = data.profesional_id || '';
        this.fecha_atencion = data.fecha_atencion || '';
        this.notas_atencion = data.notas_atencion || '';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;

        // Datos relacionados (cuando se hace JOIN)
        this.consultante = data.consultante || null;
        this.profesional = data.profesional || null;
    }

    isValid() {
        return (
            this.consultante_id !== '' &&
            this.profesional_id !== '' &&
            this.fecha_atencion !== '' &&
            this.consultante_id !== this.profesional_id
        );
    }

    toJSON() {
        return {
            consultante_id: this.consultante_id,
            profesional_id: this.profesional_id,
            fecha_atencion: this.fecha_atencion,
            notas_atencion: this.notas_atencion || null,
        };
    }

    // Obtener nombre completo del consultante
    getNombreConsultante() {
        if (this.consultante) {
            return `${this.consultante.nombre || ''} ${this.consultante.apellido || ''}`.trim();
        }
        return '';
    }

    // Obtener nombre completo del profesional
    getNombreProfesional() {
        if (this.profesional) {
            return `${this.profesional.nombre || ''} ${this.profesional.apellido || ''}`.trim();
        }
        return '';
    }
}
