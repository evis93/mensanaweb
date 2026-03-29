-- ============================================================
-- PATCH RLS — Fase 1
-- Corrige políticas faltantes o incompletas
-- Fecha: 2026-03-28
-- ============================================================

-- ============================================================
-- 1. fichas: agregar rol 'profesional' a la policy admin
--    (el SQL original sólo tenía 'admin' y 'superadmin')
-- ============================================================
DROP POLICY IF EXISTS "fichas_profesional_admin" ON public.fichas;

CREATE POLICY "fichas_profesional_admin"
  ON public.fichas FOR ALL
  USING (
    -- El propio profesional puede ver/editar sus fichas
    profesional_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
    OR
    -- Admin / superadmin / profesional de la empresa también
    empresa_id IN (
      SELECT ue.empresa_id FROM public.usuario_empresa ue
      JOIN public.roles r ON r.id = ue.rol_id
      WHERE ue.usuario_id = (
        SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
      )
      AND r.nombre IN ('admin', 'superadmin', 'profesional')
    )
  );

-- ============================================================
-- 2. notificaciones_pendientes: habilitar RLS + policies
--    (la tabla se creó sin RLS ni policies)
-- ============================================================
ALTER TABLE public.notificaciones_pendientes ENABLE ROW LEVEL SECURITY;

-- Solo el service role (cron / backend) puede leer y actualizar
-- Las apps de cliente no necesitan acceder a esta tabla directamente
CREATE POLICY "notificaciones_service_only"
  ON public.notificaciones_pendientes FOR ALL
  USING (FALSE);  -- bloquea acceso desde clientes; el cron usa service_role que bypasea RLS

-- ============================================================
-- 3. reservas: agregar policy de INSERT para clientes
--    (el SQL original sólo tenía SELECT/UPDATE para clientes)
-- ============================================================
CREATE POLICY "reservas_cliente_insert"
  ON public.reservas FOR INSERT
  WITH CHECK (
    cliente_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- 4. reservas: agregar policy de INSERT para admins
--    (reservas_admin_all es FOR ALL pero sin WITH CHECK explícita
--     en INSERT — la agregamos para mayor claridad)
-- ============================================================
-- La policy "reservas_admin_all" FOR ALL ya cubre INSERT implícitamente;
-- no se necesita cambio extra. Verificación: OK.

-- ============================================================
-- 5. disponibilidad_profesional: resolver conflicto entre las
--    dos policies que cubren el mismo caso (propia + admin)
--    Postgres acepta múltiples policies — se evalúan con OR.
--    No hay conflicto real. Verificación: OK.
-- ============================================================
