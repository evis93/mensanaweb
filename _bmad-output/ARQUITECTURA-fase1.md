# Arquitectura Técnica — Fase 1: Profesional Operativo

**Versión:** 1.1
**Fecha:** 2026-03-28
**Basado en:** PRD v1.2 + relevamiento de codebase existente

---

## Diagnóstico del código existente

### Ya está construido (no tocar)
- Autenticación completa (`AuthContext`, `auth.users`, triggers)
- Multi-tenant: middleware + `tenant-server.ts` + `TenantContext`
- Theming dinámico: `ThemeContext` + `colorUtils`
- Roles y permisos: `permissions.ts` + RLS base
- Alta de profesionales: `POST /api/admin/usuarios`
- Alta de clientes con contraseña `123456`: `POST /api/admin/clientes`
- Estructura de páginas: `/admin/agenda`, `/admin/servicios`, `/admin/horarios`, `/profesional/agenda`, etc.
- Modales base: `ModalReserva`, `ModalPago`, `ModalFicha`, `ModalCierreCaja` (incompletos pero existen)
- `DatabaseService` como capa de acceso a datos

### Existe parcialmente (completar)
- `app/admin/agenda/page.tsx` — existe pero incompleta
- `app/admin/gestion-reservas/page.tsx` — existe pero incompleta
- `app/admin/servicios/page.tsx` — existe, agregar campos de seña
- `app/admin/horarios/page.tsx` — existe, rediseñar para horario semanal
- `app/profesional/agenda/page.tsx` — existe pero incompleta
- `app/profesional/horarios/page.tsx` — existe, completar
- `src/components/reservas/ModalReserva.tsx` — existe, completar con estados
- `src/services/database.service.ts` — agregar métodos de reservas

### No existe (crear)
- Tabla `reservas` con máquina de estados
- Tabla `fichas` (historial de sesiones por cliente/empresa)
- Tabla `horarios_empresa` (horario semanal base)
- Tabla `disponibilidad_profesional` (excepciones por día)
- Tabla `notificaciones_pendientes`
- Columna `agenda_turnos` en `empresas`
- Campos de seña en `servicios`
- Páginas `/profesional/reservas` y `/profesional/reservas/[id]`
- API routes para reservas y fichas
- Lógica de bloqueo de disponibilidad
- Lógica de cierre del día (integrar en `ModalCierreCaja` existente)

---

## 1. Cambios en Base de Datos (Supabase)

### 1.1 Alterar tabla `empresas`

```sql
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS agenda_turnos        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS politica_cancelacion_horas INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS whatsapp_contacto    TEXT;

COMMENT ON COLUMN public.empresas.agenda_turnos IS
  'false = Mensana (salud/holístico), true = TusTurnos (belleza/estética)';
```

### 1.2 Alterar tabla `servicios`

```sql
ALTER TABLE public.servicios
  ADD COLUMN IF NOT EXISTS descripcion          TEXT,
  ADD COLUMN IF NOT EXISTS sena_tipo            TEXT CHECK (sena_tipo IN ('monto', 'porcentaje')) DEFAULT 'monto',
  ADD COLUMN IF NOT EXISTS sena_valor           NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS modalidad            TEXT CHECK (modalidad IN ('presencial', 'no_presencial', 'ambas')) DEFAULT 'presencial';

-- duracion_minutos y precio ya existen en la tabla
```

### 1.3 Crear tabla `horarios_empresa`

```sql
CREATE TABLE IF NOT EXISTS public.horarios_empresa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  dia_semana      SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Dom, 1=Lun ... 6=Sab
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empresa_id, dia_semana)
);

-- RLS
ALTER TABLE public.horarios_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa puede gestionar sus horarios"
  ON public.horarios_empresa
  FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresa ue
      JOIN public.roles r ON r.id = ue.rol_id
      WHERE ue.usuario_id = (
        SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
      )
      AND r.nombre IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Horarios son públicos para lectura"
  ON public.horarios_empresa
  FOR SELECT USING (TRUE);
```

### 1.4 Crear tabla `disponibilidad_profesional`

```sql
CREATE TABLE IF NOT EXISTS public.disponibilidad_profesional (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('bloqueo', 'extension')),
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  motivo          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disponibilidad_profesional_fecha
  ON public.disponibilidad_profesional(usuario_id, empresa_id, fecha);

ALTER TABLE public.disponibilidad_profesional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profesional gestiona su propia disponibilidad"
  ON public.disponibilidad_profesional
  FOR ALL
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin puede gestionar disponibilidad de su empresa"
  ON public.disponibilidad_profesional
  FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresa ue
      JOIN public.roles r ON r.id = ue.rol_id
      WHERE ue.usuario_id = (
        SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
      )
      AND r.nombre IN ('admin', 'superadmin')
    )
  );
```

### 1.5 Crear tabla `reservas`

```sql
CREATE TYPE public.reserva_estado AS ENUM (
  'PENDIENTE',
  'CONFIRMADA',
  'RECHAZADA',
  'CAMBIO_SOLICITADO',
  'CANCELADA_CLIENTE',
  'CANCELADA_PROFESIONAL',
  'COMPLETADA'
);

CREATE TYPE public.sena_estado AS ENUM (
  'PENDIENTE',
  'RETENIDA',
  'DEVUELTA',
  'RETENIDA_PLATAFORMA'
);

CREATE TABLE IF NOT EXISTS public.reservas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id),
  cliente_id            UUID NOT NULL REFERENCES public.usuarios(id),
  profesional_id        UUID NOT NULL REFERENCES public.usuarios(id),
  servicio_id           UUID NOT NULL REFERENCES public.servicios(id),

  -- Fecha y hora
  fecha_hora_inicio     TIMESTAMPTZ NOT NULL,
  fecha_hora_fin        TIMESTAMPTZ NOT NULL,

  -- Estado
  estado                public.reserva_estado NOT NULL DEFAULT 'PENDIENTE',
  estado_anterior       public.reserva_estado,            -- para auditoría
  motivo_cambio         TEXT,                             -- cuando cambia estado

  -- Seña
  sena_monto            NUMERIC(10,2) DEFAULT 0,
  sena_estado           public.sena_estado DEFAULT 'PENDIENTE',
  sena_pago_id          TEXT,                             -- ID en MercadoPago/Stripe
  sena_pago_provider    TEXT CHECK (sena_pago_provider IN ('mercadopago', 'stripe')),

  -- Reserva padre (para cambios de horario)
  reserva_origen_id     UUID REFERENCES public.reservas(id),

  -- Notas
  notas_cliente         TEXT,
  notas_profesional     TEXT,

  -- Auditoría
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID REFERENCES public.usuarios(id)
);

CREATE INDEX idx_reservas_profesional_fecha
  ON public.reservas(profesional_id, fecha_hora_inicio);
CREATE INDEX idx_reservas_cliente
  ON public.reservas(cliente_id);
CREATE INDEX idx_reservas_empresa_estado
  ON public.reservas(empresa_id, estado);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_reservas_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservas_updated_at
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION update_reservas_updated_at();

-- RLS
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente ve sus propias reservas"
  ON public.reservas FOR SELECT
  USING (
    cliente_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Profesional ve sus reservas"
  ON public.reservas FOR SELECT
  USING (
    profesional_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin ve reservas de su empresa"
  ON public.reservas FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresa ue
      JOIN public.roles r ON r.id = ue.rol_id
      WHERE ue.usuario_id = (
        SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
      )
      AND r.nombre IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Profesional puede actualizar sus reservas"
  ON public.reservas FOR UPDATE
  USING (
    profesional_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Cliente puede cancelar su reserva"
  ON public.reservas FOR UPDATE
  USING (
    cliente_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    estado IN ('CANCELADA_CLIENTE', 'CAMBIO_SOLICITADO')
  );
```

### 1.6 Crear tabla `fichas`

```sql
CREATE TABLE IF NOT EXISTS public.fichas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_empresa_id  UUID NOT NULL REFERENCES public.usuario_empresa(id),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id),
  profesional_id      UUID NOT NULL REFERENCES public.usuarios(id),
  servicio_id         UUID REFERENCES public.servicios(id),
  servicio_nombre     TEXT NOT NULL,          -- desnormalizado por si el servicio cambia
  fecha               DATE NOT NULL,
  hora                TIME NOT NULL,
  nota                TEXT,                   -- si vacío al crear, se usa "fecha + servicio"
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fichas_usuario_empresa
  ON public.fichas(usuario_empresa_id, fecha DESC);

CREATE INDEX idx_fichas_profesional
  ON public.fichas(profesional_id, empresa_id, fecha DESC);

-- Trigger updated_at
CREATE TRIGGER fichas_updated_at
  BEFORE UPDATE ON public.fichas
  FOR EACH ROW EXECUTE FUNCTION update_reservas_updated_at();

-- RLS
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profesional ve fichas de sus clientes en su empresa"
  ON public.fichas FOR ALL
  USING (
    profesional_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
    OR
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresa ue
      JOIN public.roles r ON r.id = ue.rol_id
      WHERE ue.usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
      AND r.nombre IN ('admin', 'superadmin','profesional')
    )
  );
```

**Reglas de negocio:**
- Al confirmar una reserva (`PATCH /api/reservas/[id]/estado` con `estado: 'CONFIRMADA'`), se crea automáticamente la ficha.
- La nota por defecto es `"${fechaFormateada} - ${servicio_nombre}"` si el profesional no escribe nada.
- La reserva **permanece** en la tabla hasta el cierre del día. La ficha y la reserva coexisten hasta ese momento.
- Las reservas se eliminan (hard DELETE) durante el cierre del día desde `ModalCierreCaja`.

**Vista para historial del cliente:**
```sql
CREATE OR REPLACE VIEW public.v_fichas_cliente AS
SELECT
  f.id,
  f.usuario_empresa_id,
  f.fecha,
  f.hora,
  f.servicio_nombre,
  f.nota,
  f.created_at,
  p.nombre_completo AS profesional_nombre
FROM public.fichas f
JOIN public.usuarios p ON p.id = f.profesional_id
ORDER BY f.fecha DESC;
-- El frontend pagina: primeras 3 visibles, resto a demanda
```

---

### 1.7 Crear tabla `notificaciones_pendientes`

```sql
CREATE TABLE IF NOT EXISTS public.notificaciones_pendientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id      UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('RECORDATORIO_24H', 'RECORDATORIO_1H', 'CONFIRMACION', 'CANCELACION', 'CAMBIO')),
  destinatario    TEXT NOT NULL CHECK (destinatario IN ('CLIENTE', 'PROFESIONAL')),
  telefono        TEXT NOT NULL,
  mensaje         TEXT NOT NULL,
  enviada_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_pendientes
  ON public.notificaciones_pendientes(enviada_at, tipo)
  WHERE enviada_at IS NULL;
```

### 1.7 Vista `v_reservas_detalle`

```sql
CREATE OR REPLACE VIEW public.v_reservas_detalle AS
SELECT
  r.id,
  r.empresa_id,
  r.estado,
  r.fecha_hora_inicio,
  r.fecha_hora_fin,
  r.sena_monto,
  r.sena_estado,
  r.motivo_cambio,
  r.notas_cliente,
  r.notas_profesional,
  r.created_at,
  -- Cliente
  c.id           AS cliente_usuario_id,
  c.nombre_completo AS cliente_nombre,
  c.email        AS cliente_email,
  c.telefono     AS cliente_telefono,
  -- Profesional
  p.id           AS profesional_usuario_id,
  p.nombre_completo AS profesional_nombre,
  p.telefono     AS profesional_telefono,
  -- Servicio
  s.nombre       AS servicio_nombre,
  s.duracion_minutos,
  s.precio       AS servicio_precio,
  s.modalidad    AS servicio_modalidad,
  -- Empresa
  e.nombre       AS empresa_nombre,
  e.slug         AS empresa_slug
FROM public.reservas r
JOIN public.usuarios c  ON c.id = r.cliente_id
JOIN public.usuarios p  ON p.id = r.profesional_id
JOIN public.servicios s ON s.id = r.servicio_id
JOIN public.empresas e  ON e.id = r.empresa_id;
```

---

## 2. Nuevas API Routes

### Estructura de archivos a crear

```
app/api/
├── reservas/
│   ├── route.ts                    # GET (lista) + POST (crear)
│   └── [id]/
│       ├── route.ts                # GET (detalle)
│       └── estado/route.ts         # PATCH (cambiar estado)
├── disponibilidad/
│   └── route.ts                    # GET slots libres de un profesional
├── horarios/
│   └── route.ts                    # GET + PUT horario semanal empresa
└── cron/
    └── recordatorios/route.ts      # GET (Vercel Cron)
```

### Contratos de API

#### `POST /api/reservas` — Crear reserva
```typescript
// Request body
{
  empresaId: string
  clienteId: string
  profesionalId: string
  servicioId: string
  fechaHoraInicio: string  // ISO 8601
}

// Response
{
  id: string
  estado: 'PENDIENTE'
  fechaHoraInicio: string
  fechaHoraFin: string  // calculado: inicio + duracion del servicio
  senaMonto: number
}
```

#### `PATCH /api/reservas/[id]/estado` — Cambiar estado
```typescript
// Request body
{
  estado: 'CONFIRMADA' | 'RECHAZADA' | 'CAMBIO_SOLICITADO' | 'CANCELADA_CLIENTE' | 'CANCELADA_PROFESIONAL'
  motivoCambio?: string
  nuevaFechaHoraInicio?: string  // solo si estado = CAMBIO_SOLICITADO
}

// Response
{
  id: string
  estado: string
  waLink?: string  // link wa.me pre-redactado para notificar
}
```

#### `GET /api/disponibilidad?profesionalId=&empresaId=&servicioId=&fecha=` — Slots libres
```typescript
// Response
{
  fecha: string
  slots: Array<{
    horaInicio: string  // "09:00"
    horaFin: string     // "10:00"
    disponible: boolean
  }>
}
```

#### `GET /api/cron/recordatorios` — Cron Vercel
```
Headers: { Authorization: Bearer CRON_SECRET }
Consulta reservas CONFIRMADAS próximas 24h y 1h
Genera notificaciones_pendientes
Response: { procesadas: number }
```

---

## 3. Archivos a Modificar (existentes)

### `src/services/database.service.ts`
Agregar métodos:
```typescript
// Nuevos métodos a agregar al DatabaseService
static async getReservas(empresaId: string, filters?: ReservaFilters)
static async getReservaById(id: string)
static async createReserva(data: CreateReservaInput)
static async updateReservaEstado(id: string, estado: ReservaEstado, extra?: object)
static async getSlotsDisponibles(profesionalId: string, empresaId: string, servicioId: string, fecha: Date)
static async getHorariosEmpresa(empresaId: string)
static async upsertHorariosEmpresa(empresaId: string, horarios: HorarioSemanal[])
static async getDisponibilidadProfesional(profesionalId: string, empresaId: string, mes: Date)
```

### `src/components/reservas/ModalReserva.tsx`
Completar con:
- Selector de cliente (búsqueda por nombre/email)
- Selector de servicio (dropdown con duración y precio)
- Selector de fecha (calendario)
- Selector de hora (slots calculados dinámicamente desde `/api/disponibilidad`)
- Mostrar monto de seña calculado
- Submit → `POST /api/reservas`

### `app/admin/servicios/page.tsx`
Agregar campos al formulario de servicio:
- `descripcion` (textarea)
- `modalidad` (select: presencial / no presencial / ambas)
- `sena_tipo` (radio: monto fijo / porcentaje)
- `sena_valor` (input numérico)

### `app/admin/horarios/page.tsx`
Rediseñar como horario semanal:
- Toggle por día (Lun–Dom)
- Si día activo: inputs hora_inicio y hora_fin
- Guardar en `horarios_empresa` vía `PUT /api/horarios`

### `app/profesional/horarios/page.tsx`
Completar con:
- Mostrar horario base de la empresa (solo lectura)
- Agregar/eliminar bloqueos o extensiones por fecha específica
- Guardar en `disponibilidad_profesional`

---

## 4. Archivos a Crear (nuevos)

### Páginas nuevas

```
app/profesional/reservas/
├── page.tsx          # Lista de reservas con filtros por estado
└── [id]/page.tsx     # Detalle + acciones
```

### Componentes nuevos

```
src/components/reservas/
├── TablaReservas.tsx           # Tabla reutilizable (admin y profesional)
├── FiltrosReservas.tsx         # Filtros por estado, fecha, profesional
├── DetalleReserva.tsx          # Panel lateral con detalle y acciones
├── AccionesReserva.tsx         # Botones según estado actual
└── BadgeEstadoReserva.tsx      # Chip con color por estado

src/components/disponibilidad/
├── CalendarioDisponibilidad.tsx  # Vista mensual con slots
└── FormBloqueoHorario.tsx        # Formulario para agregar bloqueo/extensión

src/components/horarios/
└── FormHorarioSemanal.tsx        # Configuración días + rangos

src/utils/
├── whatsapp.ts                   # generarLinkWA(telefono, template, datos)
└── disponibilidad.ts             # calcularSlots(horarioBase, excepciones, reservas, duracion)
```

### Tipos TypeScript

```
src/types/
├── reservas.ts        # Tipos: Reserva, ReservaEstado, CreateReservaInput, etc.
├── disponibilidad.ts  # Tipos: Slot, HorarioSemanal, BloqueoHorario
└── servicios.ts       # Tipos: Servicio (con campos de seña)
```

---

## 5. Notificaciones WhatsApp — Tabla de eventos

| Evento | Quién recibe | Se envía cuando |
|--------|-------------|-----------------|
| Nueva reserva (PENDIENTE) | **Profesional** | Al crear la reserva |
| Reserva CONFIRMADA | **Cliente** | Al confirmar el profesional |
| Reserva RECHAZADA | **Cliente** | Al rechazar el profesional |
| Cambio de horario solicitado | Quien NO lo solicitó | Al solicitar cambio |
| Cancelación por profesional | **Cliente** | Al cancelar el profesional |
| Cancelación por cliente | **Profesional** | Al cancelar el cliente |
| Recordatorio 24h | **Cliente** | Cron 24h antes |
| Recordatorio 1h | **Cliente** | Cron 1h antes |

> **Nota:** No se envía WhatsApp al cliente cuando la reserva queda en PENDIENTE. Solo el profesional es notificado en ese momento.

---

## 5b. Utilidad WhatsApp

```typescript
// src/utils/whatsapp.ts

type TemplateReserva = {
  profesionalNombre: string
  clienteNombre: string
  servicio: string
  fechaHora: string
  direccion?: string
  linkReserva: string
}

const TEMPLATES = {
  // PENDIENTE → solo profesional
  NUEVA_RESERVA_PROFESIONAL: (d: TemplateReserva) =>
    `Nueva solicitud de turno de *${d.clienteNombre}* para ${d.servicio} el ${d.fechaHora}. Confirmá o rechazá en: ${d.linkReserva}`,

  // CONFIRMADA → solo cliente
  CONFIRMACION_CLIENTE: (d: TemplateReserva) =>
    `¡Tu turno está confirmado! *${d.servicio}* con ${d.profesionalNombre} el ${d.fechaHora}${d.direccion ? ` en ${d.direccion}` : ''}. Link: ${d.linkReserva}`,

  // RECHAZADA → solo cliente
  RECHAZO_CLIENTE: (d: TemplateReserva) =>
    `Lamentablemente tu turno para *${d.servicio}* del ${d.fechaHora} no pudo confirmarse. Por favor contactá a ${d.profesionalNombre} para reagendar.`,

  // CAMBIO_SOLICITADO → quien no lo solicitó
  CAMBIO_SOLICITADO_CLIENTE: (d: TemplateReserva) =>
    `El profesional ${d.profesionalNombre} propuso cambiar tu turno de *${d.servicio}*. Revisá la propuesta en: ${d.linkReserva}`,
  CAMBIO_SOLICITADO_PROFESIONAL: (d: TemplateReserva) =>
    `${d.clienteNombre} solicita cambiar el turno del ${d.fechaHora} para *${d.servicio}*. Revisá en: ${d.linkReserva}`,

  // CANCELADA_PROFESIONAL → cliente
  CANCELACION_PROFESIONAL_CLIENTE: (d: TemplateReserva) =>
    `Tu turno del ${d.fechaHora} fue cancelado por el profesional. Tu seña será devuelta automáticamente. Podés reagendar en: ${d.linkReserva}`,

  // CANCELADA_CLIENTE → profesional
  CANCELACION_CLIENTE_PROFESIONAL: (d: TemplateReserva) =>
    `${d.clienteNombre} canceló el turno del ${d.fechaHora} para *${d.servicio}*.`,

  // Recordatorios → cliente
  RECORDATORIO_24H: (d: TemplateReserva) =>
    `Recordatorio: mañana tenés turno de *${d.servicio}* con ${d.profesionalNombre} a las ${d.fechaHora}${d.direccion ? ` en ${d.direccion}` : ''}.`,
  RECORDATORIO_1H: (d: TemplateReserva) =>
    `Tu turno de *${d.servicio}* con ${d.profesionalNombre} es en 1 hora (${d.fechaHora}). ¡Te esperamos!`,
}

export function generarLinkWA(telefono: string, template: keyof typeof TEMPLATES, datos: TemplateReserva): string {
  const mensaje = TEMPLATES[template](datos)
  const telefonoLimpio = telefono.replace(/\D/g, '')
  return `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`
}
```

---

## 6. Lógica de Slots Disponibles

```typescript
// src/utils/disponibilidad.ts

export function calcularSlots(
  horarioBase: HorarioDia[],        // de horarios_empresa
  excepciones: Excepcion[],         // de disponibilidad_profesional
  reservasExistentes: ReservaOcupada[], // de reservas CONFIRMADAS/PENDIENTES
  duracionMinutos: number,
  fecha: Date
): Slot[] {
  const diaSemana = fecha.getDay()
  const horarioDia = horarioBase.find(h => h.dia_semana === diaSemana && h.activo)

  if (!horarioDia) return []  // día no laboral

  // Generar todos los slots del horario base
  const slots = generarSlotsEnRango(
    horarioDia.hora_inicio,
    horarioDia.hora_fin,
    duracionMinutos
  )

  // Aplicar bloqueos de excepciones
  const bloqueos = excepciones.filter(e =>
    e.fecha === fechaStr(fecha) && e.tipo === 'bloqueo'
  )

  // Aplicar reservas existentes
  const ocupados = reservasExistentes.filter(r =>
    mismaFecha(r.fecha_hora_inicio, fecha)
  )

  return slots.map(slot => ({
    ...slot,
    disponible: !estaOcupado(slot, bloqueos) && !estaOcupado(slot, ocupados)
  }))
}
```

---

## 7. Vercel Cron — Recordatorios

### Configurar en `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/recordatorios",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

### Implementación `/api/cron/recordatorios/route.ts`

```typescript
// Verificar que viene de Vercel Cron o tiene el secret
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const ahora = new Date()
  const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000)
  const en1h  = new Date(ahora.getTime() + 60 * 60 * 1000)
  const ventana = 30 * 60 * 1000  // ventana de 30 min (frecuencia del cron)

  // Buscar reservas confirmadas cuyo turno cae en la ventana de 24h o 1h
  // y que no tengan notificación ya enviada de ese tipo

  // Para cada reserva encontrada:
  // 1. Calcular link wa.me con template RECORDATORIO_24H o RECORDATORIO_1H
  // 2. Insertar en notificaciones_pendientes con enviada_at = NOW()
  // (El profesional/admin ve las notificaciones pendientes en su panel)

  return Response.json({ procesadas: n })
}
```

---

## 7b. Cierre del Día — `ModalCierreCaja` (existente, ampliar)

El modal ya existe en `src/components/agenda/ModalCierreCaja.tsx`. Al ejecutar el cierre, además de la lógica actual, debe:

```
1. Consultar todas las reservas de la empresa con fecha <= hoy
2. Para cada reserva:
   - CONFIRMADA (ficha ya creada) → hard DELETE
   - CANCELADA_CLIENTE / CANCELADA_PROFESIONAL / RECHAZADA → hard DELETE
   - PENDIENTE → el cierre está BLOQUEADO hasta que el profesional las resuelva (confirmar o rechazar). Se muestran en el modal con acceso directo a cada una.
3. Las fichas NO se borran (son el historial permanente)
4. Registrar timestamp del cierre en empresa (campo cierre_ultimo_at)
```

**Nueva API route:**
```
POST /api/admin/cierre-dia
  - Requiere rol admin o superadmin
  - Ejecuta el batch de DELETE en transacción
  - Devuelve resumen: { confirmadas, canceladas, pendientesVencidas }
```

**Flujo de creación de ficha (al confirmar reserva):**
```
PATCH /api/reservas/[id]/estado { estado: 'CONFIRMADA' }
  1. UPDATE reservas SET estado = 'CONFIRMADA'
  2. INSERT INTO fichas (
       usuario_empresa_id,  ← de la reserva (cliente + empresa)
       empresa_id,
       profesional_id,
       servicio_id,
       servicio_nombre,     ← desnormalizado
       fecha,
       hora,
       nota                 ← null por ahora, profesional la completa después
     )
  3. Generar link WA para notificar al cliente (CONFIRMACION_CLIENTE)
  4. Retornar { reserva, ficha, waLink }
```

---

## 8. Orden de Implementación — Fase 1

### Sprint 1 — Base de datos y tipos (2-3 días)
1. Ejecutar migraciones SQL (secciones 1.1 a 1.7)
2. Crear `src/types/reservas.ts`, `src/types/disponibilidad.ts`, `src/types/servicios.ts`
3. Agregar métodos al `DatabaseService`
4. Crear `src/utils/whatsapp.ts`
5. Crear `src/utils/disponibilidad.ts`

### Sprint 2 — Servicios y horarios (2 días)
6. Actualizar `app/admin/servicios/page.tsx` (agregar campos seña)
7. Actualizar `app/admin/horarios/page.tsx` (horario semanal)
8. Crear `src/components/horarios/FormHorarioSemanal.tsx`
9. Crear `PUT /api/horarios`

### Sprint 3 — Disponibilidad del profesional (2 días)
10. Actualizar `app/profesional/horarios/page.tsx`
11. Crear `src/components/disponibilidad/CalendarioDisponibilidad.tsx`
12. Crear `src/components/disponibilidad/FormBloqueoHorario.tsx`
13. Crear `GET /api/disponibilidad`

### Sprint 4 — Crear y gestionar reservas + fichas (4 días)
14. Completar `src/components/reservas/ModalReserva.tsx`
15. Crear `POST /api/reservas`
16. Crear `PATCH /api/reservas/[id]/estado` (incluye crear ficha al confirmar)
17. Crear `GET /api/reservas`
18. Crear `src/components/reservas/BadgeEstadoReserva.tsx`
19. Crear `src/components/reservas/AccionesReserva.tsx`
20. Crear `src/components/reservas/DetalleReserva.tsx`
21. Completar `src/components/reservas/ModalFicha.tsx` (ver/editar nota de la ficha)
22. Crear vista de ficha en panel de cliente: primeras 3 + carga a demanda

### Sprint 5 — Vistas de agenda y reservas (3 días)
21. Completar `app/admin/gestion-reservas/page.tsx`
22. Completar `app/admin/agenda/page.tsx` (con reservas reales)
23. Crear `app/profesional/reservas/page.tsx`
24. Crear `app/profesional/reservas/[id]/page.tsx`
25. Completar `app/profesional/agenda/page.tsx`

### Sprint 6 — Notificaciones, cron y cierre del día (2 días)
26. Crear `vercel.json` con cron config
27. Crear `app/api/cron/recordatorios/route.ts`
28. Integrar links wa.me en `AccionesReserva` (todos los eventos de la tabla de notificaciones)
29. Crear `POST /api/admin/cierre-dia`
30. Ampliar `ModalCierreCaja.tsx`: ejecutar batch DELETE + resumen de resultados

---

## 9. Variables de Entorno a Agregar

```bash
# .env.local
CRON_SECRET=<secret-para-proteger-el-endpoint-cron>

# Ya deben existir:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MENSANA_DOMAIN=mensana.com.ar
```

---

*Generado con BMAD Architect — Mensana/TusTurnos Fase 1*
