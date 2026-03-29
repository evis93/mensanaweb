-- ============================================================
-- FASE 1: Sistema de Reservas — Mensana / TusTurnos
-- Fecha: 2026-03-28
-- ============================================================

-- ============================================================
-- 1. Alterar tabla empresas
-- ============================================================
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS agenda_turnos             BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS politica_cancelacion_horas INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS whatsapp_contacto         TEXT,
  ADD COLUMN IF NOT EXISTS cierre_ultimo_at          TIMESTAMPTZ;

COMMENT ON COLUMN public.empresas.agenda_turnos IS
  'false = Mensana (salud/holístico), true = TusTurnos (belleza/estética)';

-- ============================================================
-- 2. Alterar tabla servicios
-- ============================================================
ALTER TABLE public.servicios
  ADD COLUMN IF NOT EXISTS descripcion   TEXT,
  ADD COLUMN IF NOT EXISTS sena_tipo     TEXT DEFAULT 'monto'
    CHECK (sena_tipo IN ('monto', 'porcentaje')),
  ADD COLUMN IF NOT EXISTS sena_valor    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS modalidad     TEXT DEFAULT 'presencial'
    CHECK (modalidad IN ('presencial', 'no_presencial', 'ambas'));

-- ============================================================
-- 3. Crear tabla horarios_empresa
-- ============================================================
CREATE TABLE IF NOT EXISTS public.horarios_empresa (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  dia_semana   SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio  TIME NOT NULL,
  hora_fin     TIME NOT NULL,
  activo       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empresa_id, dia_semana)
);

ALTER TABLE public.horarios_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horarios_empresa_public_read"
  ON public.horarios_empresa FOR SELECT USING (TRUE);

CREATE POLICY "horarios_empresa_admin_write"
  ON public.horarios_empresa FOR ALL
  USING (
    empresa_id IN (
      SELECT ue.empresa_id FROM public.usuario_empresa ue
      JOIN public.roles r ON r.id = ue.rol_id
      WHERE ue.usuario_id = (
        SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
      )
      AND r.nombre IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- 4. Crear tabla disponibilidad_profesional
-- ============================================================
CREATE TABLE IF NOT EXISTS public.disponibilidad_profesional (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  empresa_id   UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('bloqueo', 'extension')),
  hora_inicio  TIME NOT NULL,
  hora_fin     TIME NOT NULL,
  motivo       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_prof_fecha
  ON public.disponibilidad_profesional(usuario_id, empresa_id, fecha);

ALTER TABLE public.disponibilidad_profesional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disponibilidad_profesional_own"
  ON public.disponibilidad_profesional FOR ALL
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "disponibilidad_admin_empresa"
  ON public.disponibilidad_profesional FOR ALL
  USING (
    empresa_id IN (
      SELECT ue.empresa_id FROM public.usuario_empresa ue
      JOIN public.roles r ON r.id = ue.rol_id
      WHERE ue.usuario_id = (
        SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
      )
      AND r.nombre IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- 5. Crear tipos ENUM para reservas
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.reserva_estado AS ENUM (
    'PENDIENTE',
    'CONFIRMADA',
    'RECHAZADA',
    'CAMBIO_SOLICITADO',
    'CANCELADA_CLIENTE',
    'CANCELADA_PROFESIONAL',
    'COMPLETADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sena_estado AS ENUM (
    'PENDIENTE',
    'RETENIDA',
    'DEVUELTA',
    'RETENIDA_PLATAFORMA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. Crear tabla reservas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reservas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id),
  cliente_id           UUID NOT NULL REFERENCES public.usuarios(id),
  profesional_id       UUID NOT NULL REFERENCES public.usuarios(id),
  servicio_id          UUID NOT NULL REFERENCES public.servicios(id),

  fecha_hora_inicio    TIMESTAMPTZ NOT NULL,
  fecha_hora_fin       TIMESTAMPTZ NOT NULL,

  estado               public.reserva_estado NOT NULL DEFAULT 'PENDIENTE',
  estado_anterior      TEXT,
  motivo_cambio        TEXT,

  sena_monto           NUMERIC(10,2) DEFAULT 0,
  sena_estado          public.sena_estado DEFAULT 'PENDIENTE',
  sena_pago_id         TEXT,
  sena_pago_provider   TEXT CHECK (sena_pago_provider IN ('mercadopago', 'stripe')),

  reserva_origen_id    UUID REFERENCES public.reservas(id),

  notas_cliente        TEXT,
  notas_profesional    TEXT,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  created_by           UUID REFERENCES public.usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_reservas_profesional_fecha
  ON public.reservas(profesional_id, fecha_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente
  ON public.reservas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_empresa_estado
  ON public.reservas(empresa_id, estado);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER reservas_updated_at
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservas_cliente_select"
  ON public.reservas FOR SELECT
  USING (
    cliente_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "reservas_profesional_select"
  ON public.reservas FOR SELECT
  USING (
    profesional_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "reservas_profesional_update"
  ON public.reservas FOR UPDATE
  USING (
    profesional_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "reservas_cliente_cancelar"
  ON public.reservas FOR UPDATE
  USING (
    cliente_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (estado IN ('CANCELADA_CLIENTE', 'CAMBIO_SOLICITADO'));

CREATE POLICY "reservas_admin_all"
  ON public.reservas FOR ALL
  USING (
    empresa_id IN (
      SELECT ue.empresa_id FROM public.usuario_empresa ue
      JOIN public.roles r ON r.id = ue.rol_id
      WHERE ue.usuario_id = (
        SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
      )
      AND r.nombre IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- 7. Crear tabla fichas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fichas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_empresa_id  UUID NOT NULL REFERENCES public.usuario_empresa(id),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id),
  profesional_id      UUID NOT NULL REFERENCES public.usuarios(id),
  servicio_id         UUID REFERENCES public.servicios(id),
  servicio_nombre     TEXT NOT NULL,
  fecha               DATE NOT NULL,
  hora                TIME NOT NULL,
  nota                TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fichas_usuario_empresa_fecha
  ON public.fichas(usuario_empresa_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_fichas_profesional_empresa
  ON public.fichas(profesional_id, empresa_id, fecha DESC);

CREATE TRIGGER fichas_updated_at
  BEFORE UPDATE ON public.fichas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fichas_profesional_admin"
  ON public.fichas FOR ALL
  USING (
    profesional_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
    OR
    empresa_id IN (
      SELECT ue.empresa_id FROM public.usuario_empresa ue
      JOIN public.roles r ON r.id = ue.rol_id
      WHERE ue.usuario_id = (
        SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
      )
      AND r.nombre IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- 8. Crear tabla notificaciones_pendientes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notificaciones_pendientes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id   UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (
    tipo IN ('RECORDATORIO_24H', 'RECORDATORIO_1H', 'CONFIRMACION', 'CANCELACION', 'CAMBIO')
  ),
  destinatario TEXT NOT NULL CHECK (destinatario IN ('CLIENTE', 'PROFESIONAL')),
  telefono     TEXT NOT NULL,
  mensaje      TEXT NOT NULL,
  enviada_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_pendientes_sin_enviar
  ON public.notificaciones_pendientes(created_at)
  WHERE enviada_at IS NULL;

-- ============================================================
-- 9. Vistas
-- ============================================================
CREATE OR REPLACE VIEW public.v_reservas_detalle AS
SELECT
  r.id,
  r.empresa_id,
  r.estado,
  r.estado_anterior,
  r.fecha_hora_inicio,
  r.fecha_hora_fin,
  r.sena_monto,
  r.sena_estado,
  r.motivo_cambio,
  r.notas_cliente,
  r.notas_profesional,
  r.reserva_origen_id,
  r.created_at,
  r.updated_at,
  -- Cliente
  c.id               AS cliente_usuario_id,
  c.nombre_completo  AS cliente_nombre,
  c.email            AS cliente_email,
  c.telefono         AS cliente_telefono,
  -- Profesional
  p.id               AS profesional_usuario_id,
  p.nombre_completo  AS profesional_nombre,
  p.telefono         AS profesional_telefono,
  -- Servicio
  s.nombre           AS servicio_nombre,
  s.duracion_minutos,
  s.precio           AS servicio_precio,
  s.modalidad        AS servicio_modalidad,
  -- Empresa
  e.nombre           AS empresa_nombre,
  e.slug             AS empresa_slug
FROM public.reservas r
JOIN public.usuarios  c ON c.id = r.cliente_id
JOIN public.usuarios  p ON p.id = r.profesional_id
JOIN public.servicios s ON s.id = r.servicio_id
JOIN public.empresas  e ON e.id = r.empresa_id;

CREATE OR REPLACE VIEW public.v_fichas_cliente AS
SELECT
  f.id,
  f.usuario_empresa_id,
  f.empresa_id,
  f.fecha,
  f.hora,
  f.servicio_nombre,
  f.nota,
  f.created_at,
  f.updated_at,
  p.nombre_completo AS profesional_nombre
FROM public.fichas f
JOIN public.usuarios p ON p.id = f.profesional_id
ORDER BY f.fecha DESC;
