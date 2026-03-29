export interface Ficha {
  id: string
  usuarioEmpresaId: string
  empresaId: string
  profesionalId: string
  servicioId: string | null
  servicioNombre: string
  fecha: string            // "2026-03-28"
  hora: string             // "10:00"
  nota: string | null
  createdAt: string
  updatedAt: string
}

export interface FichaConProfesional extends Ficha {
  profesionalNombre: string
}

export interface CreateFichaInput {
  usuarioEmpresaId: string
  empresaId: string
  profesionalId: string
  servicioId: string | null
  servicioNombre: string
  fecha: string
  hora: string
  nota?: string
}
