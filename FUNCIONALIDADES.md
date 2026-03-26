# MENSANA - Documentación de Funcionalidades

> Documento de referencia para tests Jest (GitHub Actions) y desarrollo de la versión web.

---

## Tabla de contenidos

1. [Stack tecnológico](#stack-tecnológico)
2. [Arquitectura](#arquitectura)
3. [Base de datos (Supabase)](#base-de-datos-supabase)
4. [Sistema de roles y permisos](#sistema-de-roles-y-permisos)
5. [Flujos principales](#flujos-principales)
6. [Controladores](#controladores)
7. [Contextos (State Management)](#contextos-state-management)
8. [Navegación](#navegación)
9. [Pantallas](#pantallas)
10. [Guía de testing con Jest](#guía-de-testing-con-jest)
11. [Notas para la versión web](#notas-para-la-versión-web)

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Expo / React Native 0.81.5 |
| Router | Expo Router v6 (file-based) |
| Backend | Supabase (PostgreSQL + RLS) |
| Estado global | React Context (Auth, Business, Theme) |
| Testing | Jest + jest-expo + @testing-library/react-native |
| Lenguaje | JavaScript (TypeScript parcial) |

---

## Arquitectura

```
Views (app/ + src/views/)
        ↓
Controllers (src/controllers/)      ← lógica de negocio, testeable en aislamiento
        ↓
DatabaseService (src/services/)     ← abstracción sobre Supabase
        ↓
Supabase (PostgreSQL + RLS)
```

**Patrón de respuesta uniforme en todos los controllers:**
```js
// Éxito
{ success: true, data: ... }

// Error
{ success: false, error: 'mensaje descriptivo', code?: 'ERROR_CODE' }
```

---

## Base de datos (Supabase)

### Tablas principales

#### `usuarios`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| auth_user_id | uuid FK → auth.users | puede ser null (clientes sin acceso) |
| nombre_completo | text | |
| email | text | |
| telefono | text | |
| avatar_url | text | |
| activo | boolean | soft delete |

#### `usuario_empresa`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | Este es el `usr_empresa_id` |
| usuario_id | uuid FK | |
| empresa_id | uuid FK | |
| rol_id | uuid FK | |

> ⚠️ NO tiene columna `activo`. El estado activo viene de `usuarios.activo`.

#### `empresas`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| nombre | text | |
| logo_url | text | |
| color_primary | text | hex |
| color_secondary | text | hex |
| color_background | text | hex |

#### `roles`
| Columna | Tipo | Valores posibles |
|---------|------|-----------------|
| id | uuid PK | |
| nombre | text | `superadmin`, `admin`, `profesional`, `cliente` |

#### `reservas`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| empresa_id | uuid FK | |
| profesional_id | uuid FK → usuarios.id | |
| cliente_id | uuid FK → usuarios.id | |
| autor_id | uuid FK → usuarios.id | quien la creó |
| servicio_id | uuid FK | nullable |
| fecha | date | YYYY-MM-DD |
| hora_inicio | time | HH:MM |
| estado | text | ver estados abajo |
| precio_total | numeric | |
| monto_seña | numeric | |
| seña_pagada | boolean | |
| pagado | boolean | |
| metodo_pago | text | efectivo, tarjeta, transferencia, etc. |
| recordatorio_enviado | boolean | |
| created_at | timestamptz | |

**Estados de reserva:**
```
pendiente → confirmada → completada
          ↘ rechazada
cancelada (cliente puede cancelar hasta con 2 hs de anticipacion)

```
**Estados de reserva - roles :**
```
pendiente → confirmada → completada
          ↘ rechazada
cancelada (cliente puede cancelar hasta con 2 hs de anticipacion)

un profesional puede crear una reserva para cualquier profesional pero no puede confirmarlo a no ser que sea él el profesional que lo crea. Esta reserva va a pendiente si no es el profesional de la reserva

cual quiero profesional puede cobrar las reservas, pues las ve desde el mismo lugar que es agenda diaria

```

#### `servicios`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| empresa_id | uuid FK | |
| nombre | text | |
| descripcion | text | |
| duracion_minutos | integer | |
| precio | numeric | |
| activo | boolean | |

#### `horarios_atencion`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| profesional_id | uuid FK | |
| dia_semana | integer | 0=Domingo ... 6=Sábado |
| hora_inicio | text | HH:MM |
| hora_fin | text | HH:MM |
| activo | boolean | |

#### `fichas`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| usr_empresa_id | uuid FK → usuario_empresa.id | ⚠️ NO es usuario_id |
| profesional_id | uuid FK | |
| reserva_id | uuid FK | nullable |
| nota | text | |
| fecha | date | |

#### `profesional_servicio` (tabla de unión)
| Columna | Tipo |
|---------|------|
| profesional_id | uuid FK |
| servicio_id | uuid FK |

### Vistas

#### `v_sesion_contexto`
- Filtrada por `auth.uid()` (RLS automático)
- Columna de rol: **`rol_codigo`** (NO `rol`)
- Devuelve: `usuario_id`, `auth_user_id`, `nombre_completo`, `email`, `rol_codigo`, `empresa_id`, `empresa_nombre`, colores, `logo_url`
- Usada por AuthContext

#### `v_empresa_branding`
- Acceso público
- Devuelve: `id`, `nombre`, `color_primary`, `color_secondary`, `color_background`, `logo_url`
- Usada por BusinessContext

---

## Sistema de roles y permisos

### Jerarquía
```
superadmin > admin > profesional > cliente
```

### Matriz de permisos

| Permiso | superadmin | admin | profesional | cliente |
|---------|:---:|:---:|:---:|:---:|
| `agenda:read` | ✅ | ✅ | ✅ | ❌ |
| `agenda:write` | ✅ | ✅ | ✅ | ❌ |
| `reservas:read` | ✅ | ✅ | ✅ | ❌ |
| `reservas:write` | ✅ | ✅ | ✅ | ❌ |
| `reportes:read` | ✅ | ✅ | ❌ | ❌ |
| `profesionales:read` | ✅ | ✅ | ✅ | ❌ |
| `profesionales:write` | ✅ | ✅ | ❌ | ❌ |
| `horarios:read` | ✅ | ✅ | ✅ | ❌ |
| `horarios:write` | ✅ | ✅ | ✅ | ❌ |
| `consultantes:read` | ✅ | ✅ | ✅ | ❌ |
| `consultantes:write` | ✅ | ✅ | ✅ | ❌ |
| `servicios:read` | ✅ | ✅ | ✅ | ❌ |
| `servicios:write` | ✅ | ✅ | ✅ | ❌ |
| `admin:dashboard` | ✅ | ✅ | ❌ | ❌ |
| `explorar:read` | ✅ | ✅ | ✅ | ✅ |
| `citas:read` | ✅ | ✅ | ✅ | ✅ |
| `*` (todo) | ✅ | ❌ | ❌ | ❌ |

### Verificación en controllers
```js
// src/utils/permissions.js
import { requirePermission } from '../utils/permissions';

const permError = requirePermission(profile, 'reservas:write');
if (permError) return permError;
// permError = { success: false, error: '...', code: 'PERMISSION_DENIED' }
```

---

## Flujos principales

### 1. Login

```
Usuario ingresa email + password
        ↓
AuthContext.login(email, password)
        ↓
supabase.auth.signInWithPassword()
        ↓
onAuthStateChange dispara → fetchProfile()
        ↓
query v_sesion_contexto → profile con rol_codigo, empresa_id, colores
        ↓
useRoleRouter() navega a la pantalla home del rol
```

**Casos a testear:**
- Credenciales correctas → `{ success: true }`
- Email inexistente → `{ success: false, error: '...' }`
- Password incorrecta → `{ success: false, error: '...' }`
- Sin empresa asignada (sin `empresa_id`) → manejo de edge case

---

### 2. Reserva iniciada por cliente

```
Cliente ve listado de profesionales de la empresa (empresaId)
        ↓
Selecciona profesional + servicio + fecha
        ↓
ReservaClienteController.obtenerHorariosDelDia(profesionalId, diaSemana)
        ↓
ReservaClienteController.obtenerSlotsOcupados(profesionalId, fecha)
(excluye reservas con estado: cancelada | rechazada)
        ↓
ReservaClienteController.calcularSlotsDisponibles(horarios, ocupados)
→ Slots de 30 min divididos en { manana: [], tarde: [], todos: [] }
        ↓
Cliente elige horario → ReservaClienteController.solicitarReserva(data)
→ Crea reserva con estado: 'pendiente'
```

**Casos a testear:**
- `calcularSlotsDisponibles` → es función pura (sin DB), ideal para unit test
- Horario 9:00-13:00 con ocupados ['10:00', '11:30'] → debe devolver todos los demás
- Sin horarios disponibles en ese día → array vacío
- Slot ocupado no aparece como disponible

---

### 3. Reserva creada por profesional/admin

```
ReservaController.crearReserva(reservaData, profesionalId, profile)
        ↓
Si autor === profesional asignado → estado: 'confirmada'
Si no                            → estado: 'pendiente'
        ↓
Retorna reserva enriquecida (con datos del cliente, profesional y servicio)
```

**Casos a testear:**
- Admin crea reserva para otro profesional → estado pendiente
- Profesional se auto-asigna → estado confirmada
- Datos obligatorios faltantes → error descriptivo
- Permiso `reservas:write` requerido

---

### 4. Cierre de sesión (fin de turno)

```
CerrarSesionScreen → ReservaController.cerrarSesion(id, payload, profile)

payload depende de si el usuario ingresó un monto válido:
  - Con monto numérico → { precio_total, metodo_pago, nota }  ← marca pagado=true
  - Sin monto (solo nota) → { nota }                          ← NO marca como pagado

En el controller:
1. Si payload tiene precio_total → actualiza reserva: estado='completada', pagado=true
2. Ficha: UPDATE fichas WHERE reserva_id=id
          Si 0 filas actualizadas → INSERT con usr_empresa_id (lookup desde usuario_empresa)
```

**Importante:**
- La ficha se vincula a `usr_empresa_id` (id de `usuario_empresa`), no a `usuario_id`.
- Guardar solo la nota NO marca la reserva como pagada. El pago requiere un monto numérico explícito.
- **Cada reserva es una entidad independiente.** El estado de pago (`pagado`, `precio_total`, `metodo_pago`) pertenece exclusivamente a esa reserva. Pagar una reserva de un cliente no modifica ninguna otra reserva del mismo cliente. Esto evita el bug donde dos reservas del mismo cliente aparecían ambas como pagadas cuando solo se había cobrado una.

**Regla crítica — doble protección contra falsos pagos:**
- **Pantalla:** solo envía `precio_total` y `metodo_pago` si el usuario ingresó un monto numérico válido; de lo contrario el payload es solo `{ nota }`.
- **Controller:** `tienePago` solo es `true` si `precio_total` existe, no es vacío y es un número válido (`!isNaN(parseFloat(precio_total))`). Si solo llega `metodo_pago` sin precio, NO se marca como pagada.

**Casos a testear:**
- Cierre con monto numérico → reserva `pagado=true`, `estado='completada'`, ficha guardada
- Cierre sin monto (solo nota) → reserva queda en su estado anterior, `pagado` sin cambio
- Cliente con 2 reservas en el mismo día: pagar una → la otra permanece impaga y aparece en pendientes del reporte
- Guardar nota en reserva ya pagada → no modifica el pago, solo actualiza la nota en `fichas`
- Reserva inexistente → error
- Sin permiso `reservas:write` → error

---

### 5. Alta de profesional

```
ProfesionalController.crearProfesional(data, profile)
        ↓
1. Validar que el email no exista ya en auth
2. supabaseAdmin.createUser({ email, password: '123456', email_confirm: true })
3. Crear usuario con auth_user_id
4. Obtener rol_id de 'profesional'
5. Crear usuario_empresa vinculando usuario + empresa + rol
        ↓
Retorna: { success, data: profesional, passwordTemporal: '123456' }
```

**Requiere:** `profesionales:write`

---

### 6. Alta de consultante (cliente)

```
ConsultanteController.crearConsultante(data, profile)
        ↓
¿El email ya existe?
  SÍ → agregar rol 'cliente' en usuario_empresa (multi-empresa)
  NO → crear usuario + usuario_empresa con rol cliente
        ↓
¿autorizar_acceso_app = true?
  SÍ → crear auth user con password temporal
  NO → usuario sin acceso (solo registro interno)
```

**Casos a testear:**
- Email nuevo sin acceso app → usuario creado sin auth_user_id
- Email nuevo con acceso app → usuario con auth_user_id + password temporal
- Email existente → se reutiliza usuario, se agrega rol

---

### 7. Gestión de horarios

```
Un profesional configura hasta 7 entradas (una por día de la semana).
Cada entrada: { dia_semana: 0-6, hora_inicio: 'HH:MM', hora_fin: 'HH:MM', activo: bool }
```

**Operaciones:**
- `obtenerHorarios(profile)` → horarios del profesional logueado
- `crearHorario(data, profile)` → nuevo horario para un día
- `actualizarHorario(id, data, profile)` → modifica horario existente
- `toggleActivo(id, activoActual, profile)` → activa/desactiva sin borrar
- `eliminarHorario(id, profile)` → borra definitivo

---

### 8. Reportes de caja

```
ReservaController.obtenerResumenCajaDiario(fecha, profile)
        ↓
Filtra reservas de la empresa para esa fecha donde pagado=true
        ↓
Retorna:
{
  totalRecaudado: number,
  desglosePagos: { efectivo: X, tarjeta: Y, transferencia: Z, ... },
  transaccionesPendientes: [reservas sin pago],
  cantidadPagadas: number,
  cantidadPendientes: number
}
```

**Requiere:** `reportes:read` (solo admin/superadmin)

---

## Controladores

### ReservaController (`src/controllers/ReservaController.js`)

| Método | Parámetros | Descripción | Permiso |
|--------|-----------|-------------|---------|
| `obtenerReservasPorFecha` | `(fecha, profesionalId, profile)` | Reservas de un día para un profesional | `reservas:read` |
| `obtenerFechasConReservas` | `(mesInicio, mesFin, profesionalId, profile)` | Fechas con reservas en rango de meses | `reservas:read` |
| `crearReserva` | `(reservaData, profesionalId, profile)` | Crea reserva; estado auto-calculado | `reservas:write` |
| `actualizarReserva` | `(id, reservaData, profile)` | Actualización completa | `reservas:write` |
| `actualizarEstado` | `(id, nuevoEstado, profile)` | Cambia estado de reserva | `reservas:write` |
| `eliminarReserva` | `(id, profile)` | Borra reserva | `reservas:write` |
| `obtenerTodas` | `(profile)` | Todas las reservas de la empresa | `reservas:read` |
| `obtenerResumenCajaDiario` | `(fecha, profile)` | Reporte de caja diario | `reportes:read` |
| `registrarPago` | `(id, pagoData, profile)` | `pagoData = { precio_total, metodo_pago, pagado }` | `reservas:write` |
| `cerrarSesion` | `(id, { precio_total, metodo_pago, nota }, profile)` | Cierra turno y crea/actualiza ficha | `reservas:write` |
| `obtenerReservaPorId` | `(id, profile)` | Reserva con ficha asociada | `reservas:read` |
| `obtenerReservasPorCliente` | `(clienteId, profile)` | Historial de un cliente | `reservas:read` |
| `enriquecerReservas` | `(reservas)` | (privado) Añade datos de cliente/profesional/servicio | - |

---

### ReservaClienteController (`src/controllers/ReservaClienteController.js`)

> Sin guards de permisos (flujo público/cliente).

| Método | Parámetros | Descripción |
|--------|-----------|-------------|
| `obtenerProfesionalesEmpresa` | `(empresaId)` | Profesionales activos de la empresa |
| `obtenerServiciosEmpresa` | `(empresaId)` | Servicios activos de la empresa |
| `obtenerHorariosDelDia` | `(profesionalId, diaSemana)` | Horarios del profesional para ese día semana (0-6) |
| `obtenerSlotsOcupados` | `(profesionalId, fecha)` | Slots ocupados como `['HH:MM', ...]` |
| `calcularSlotsDisponibles` | `(horarios, ocupados)` | **Función pura** → `{ manana, tarde, todos }` con slots de 30 min |
| `solicitarReserva` | `({ empresaId, profesionalId, clienteId, servicioId, fecha, horaInicio })` | Crea reserva `pendiente` |
| `cancelarReserva` | `(reservaId, clienteId)` | Cliente cancela su propia reserva |

---

### ConsultanteController (`src/controllers/ConsultanteController.js`)

| Método | Parámetros | Descripción | Permiso |
|--------|-----------|-------------|---------|
| `obtenerConsultantes` | `(profile)` | Todos los clientes de la empresa | `consultantes:read` |
| `buscarConsultantes` | `(query, profile)` | Búsqueda por nombre o email | `consultantes:read` |
| `obtenerConsultantePorId` | `(id, profile)` | Cliente con `usr_empresa_id` y `ficha_id` | `consultantes:read` |
| `crearConsultante` | `(data, profile)` | Crea cliente; `data.autorizar_acceso_app` opcional | `consultantes:write` |
| `actualizarConsultante` | `(id, data, profile)` | Actualiza `nombre_completo`, `telefono`, `activo` | `consultantes:write` |
| `eliminarConsultante` | `(id, profile)` | Soft delete (`activo = false`) | `consultantes:write` |

---

### ProfesionalController (`src/controllers/ProfesionalController.js`)

| Método | Parámetros | Descripción | Permiso |
|--------|-----------|-------------|---------|
| `obtenerProfesionales` | `(profile)` | Profesionales/admins de la empresa | `profesionales:read` |
| `obtenerProfesionalPorId` | `(id, profile)` | Por `usuario_id` | `profesionales:read` |
| `crearProfesional` | `(data, profile)` | Crea usuario con auth + empresa | `profesionales:write` |
| `actualizarProfesional` | `(id, data, profile)` | Actualiza datos; puede reparar `auth_user_id` | `profesionales:write` |
| `desactivarProfesional` | `(id, profile)` | Remueve de `usuario_empresa` | `profesionales:write` |
| `obtenerProfesionalesDisponibles` | `(fecha, horaInicio, horaFin, profile)` | Filtra por `horarios_atencion` | `profesionales:read` |

> ⚠️ Devuelve objetos planos, usar `prof.nombre_completo` (no `prof.nombre`).

---

### FichaClienteController (`src/controllers/FichaClienteController.js`)

| Método | Parámetros | Descripción |
|--------|-----------|-------------|
| `obtenerFichasPorCliente` | `(usrEmpresaId, profile)` | Fichas ordenadas por fecha desc. Recibe `usuario_empresa.id` |
| `crearFicha` | `({ usr_empresa_id, nota, fecha, profesional_id }, profile)` | Crea registro de sesión |

---

### HorarioController (`src/controllers/HorarioController.js`)

| Método | Parámetros | Descripción |
|--------|-----------|-------------|
| `obtenerHorarios` | `(profile)` | Horarios del profesional logueado |
| `crearHorario` | `({ dia_semana, hora_inicio, hora_fin }, profile)` | Nuevo horario |
| `actualizarHorario` | `(id, { hora_inicio, hora_fin }, profile)` | Modifica horario |
| `toggleActivo` | `(id, activoActual, profile)` | Activa/desactiva |
| `eliminarHorario` | `(id, profile)` | Borra horario |

**Constante:**
```js
HorarioController.DIAS_SEMANA
// [{ id: 0, nombre: 'Domingo' }, { id: 1, nombre: 'Lunes' }, ...]
```

---

### ServiciosController (`src/controllers/ServiciosController.js`)

| Método | Parámetros | Descripción | Permiso |
|--------|-----------|-------------|---------|
| `obtenerServicios` | `(profile)` | Servicios de la empresa | `servicios:read` |
| `crearServicio` | `({ nombre, descripcion, duracion_minutos, precio }, profile)` | Nuevo servicio | `servicios:write` |
| `actualizarServicio` | `(id, data, profile)` | Actualiza servicio | `servicios:write` |
| `toggleActivo` | `(id, activo, profile)` | Activa/desactiva | `servicios:write` |
| `eliminarServicio` | `(id, profile)` | Borra servicio | `servicios:write` |
| `obtenerServiciosProfesional` | `(profesionalId, profile)` | IDs de servicios del profesional | `servicios:read` |
| `guardarServiciosProfesional` | `(profesionalId, servicioIds[], profile)` | Actualiza servicios del profesional | `servicios:write` |

---

## Contextos (State Management)

### AuthContext (`src/context/AuthContext.js`)

```js
const { session, user, profile, loading, rol, empresaId,
        isAdmin, isProfesional, isCliente, isMensana,
        login, logout, register, changePassword } = useAuth();
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `session` | object | Sesión Supabase activa |
| `profile` | object | Datos de `v_sesion_contexto` |
| `profile.rol_codigo` | string | Rol del usuario |
| `profile.empresa_id` | uuid | Empresa asociada |
| `rol` | string | Alias de `profile.rol_codigo` |
| `isAdmin` | bool | `rol === 'admin' \|\| 'superadmin'` |
| `isProfesional` | bool | `rol === 'profesional'` |
| `isCliente` | bool | `rol === 'cliente'` |
| `isMensana` | bool | `rol === 'superadmin'` |

**Métodos:**

```js
// Login
login(email: string, password: string): Promise<{ success: bool, data?, error? }>

// Registro
register(email: string, password: string, fullName: string): Promise<{ success: bool, data?, error? }>

// Logout (limpia estado y sesión)
logout(): void

// Cambio de contraseña
changePassword(email, currentPassword, newPassword): Promise<{ success: bool, data?, error? }>
```

---

### BusinessContext (`src/context/BusinessContext.js`)

```js
const { businessId, businessBranding, businessLoading,
        setBusiness, clearBusiness, setDevOverride } = useBusiness();
```

Resolución de `businessId` por prioridad:
1. DEV: `devOverride` → `EXPO_PUBLIC_DEV_BUSINESS_ID` (env) → AsyncStorage
2. PROD: AsyncStorage (seteado por QR o deep link)

---

### ThemeContext (`src/context/ThemeContext.js`)

```js
const { colors, logo, logoUrl, empresaNombre, themeId, loading } = useTheme();
```

`colors` incluye: `primary`, `secondary`, `background`, y derivados calculados.

---

## Navegación

### Grupos de rutas

| Grupo | Ruta | Rol requerido |
|-------|------|--------------|
| `(public)` | login, register, explorar, catalogo | Ninguno |
| `(cliente)` | home, reservar, explorar | `cliente` |
| `(profesional)` | home, agenda, reservas, horarios, servicios, clientes | `profesional` |
| `(admin)` | home, agenda, reservas, reportes, profesionales, horarios, servicios, clientes | `admin` o `superadmin` |
| `(mensana)` | home | `superadmin` |

### `useRoleRouter()`

```js
const router = useRoleRouter();

router.pushRole('/agenda')     // → /(admin)/agenda o /(profesional)/agenda según rol
router.replaceRole('/')        // Reemplaza la ruta actual
router.pushPublic('/login')    // Fuerza ruta pública
```

> ⚠️ Usar `router.pushRole('/')` en vez de `router.back()` para evitar navegación a ruta incorrecta.

---

## Pantallas

### Públicas (`app/(public)/`)
- **login** → Formulario email/password → `AuthContext.login()`
- **welcome** → Pantalla de bienvenida / onboarding
- **home-mensana** → Landing del proveedor white-label
- **explorar-profesionales** → Directorio público de profesionales
- **catalogo-servicios** → Catálogo público de servicios
- **auth/register** → Formulario de registro
- **auth/recuperar-contrasena** → Envío de email de recuperación
- **auth/cambio-contrasena** → Cambio de contraseña autenticado

### Admin (`app/(admin)/`)
- **index** → Dashboard con métricas y accesos rápidos
- **agenda** → Vista diaria de reservas con `ReservaController`
- **agenda-mensual** → Calendario mensual con días marcados
- **gestion-reservas** → Listado completo, cambio de estados
- **reportes** → Caja diaria/mensual con `obtenerResumenCajaDiario`
- **profesionales** → ABM de profesionales
- **horarios** → Gestión de disponibilidad
- **servicios** → Catálogo de servicios de la empresa
- **clientes** → Listado y búsqueda de consultantes
- **ficha-cliente** → Historial y notas del cliente
- **qr** → Generación de código QR de la empresa
- **cerrar-sesion** → Logout

### Profesional (`app/(profesional)/`)
Mismas pantallas que admin excepto: sin **reportes**, sin ABM de **profesionales**.

### Cliente (`app/(cliente)/`)
- **index** → Home con próximas citas
- **reservar** → Flujo completo de reserva (profesional → servicio → fecha → hora)
- **explorar-profesionales** → Búsqueda de profesionales
- **en-construccion** → Placeholder

---

## Guía de testing con Jest

### Configuración existente

```json
// package.json
"jest": {
  "preset": "jest-expo"
}
```

```
__tests__/
  setup.test.ts
  permisos.test.ts      ← 18 tests de permisos por rol
  turnos.test.ts        ← 30+ tests de validación de reservas
  validaciones.test.ts
  ejemplo.test.ts

__mocks__/
  emptyMock.js          ← Mock de expo/src/winter
```

### Cómo mockear Supabase

```js
// __mocks__/supabase.js
jest.mock('../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));
```

### Casos prioritarios para testear

#### 1. `calcularSlotsDisponibles` (función pura — sin mock)
```js
import { ReservaClienteController } from '../src/controllers/ReservaClienteController';

test('excluye slots ocupados', () => {
  const horarios = [{ hora_inicio: '09:00', hora_fin: '12:00' }];
  const ocupados = ['10:00', '10:30'];
  const result = ReservaClienteController.calcularSlotsDisponibles(horarios, ocupados);
  expect(result.todos).not.toContain('10:00');
  expect(result.todos).not.toContain('10:30');
  expect(result.todos).toContain('09:00');
});

test('separa mañana y tarde correctamente', () => {
  const horarios = [{ hora_inicio: '08:00', hora_fin: '18:00' }];
  const result = ReservaClienteController.calcularSlotsDisponibles(horarios, []);
  result.manana.forEach(s => expect(parseInt(s.split(':')[0])) .toBeLessThan(13));
  result.tarde.forEach(s => expect(parseInt(s.split(':')[0])).toBeGreaterThanOrEqual(13));
});

test('sin horarios devuelve arrays vacíos', () => {
  const result = ReservaClienteController.calcularSlotsDisponibles([], []);
  expect(result.todos).toHaveLength(0);
});
```

#### 2. Sistema de permisos
```js
import { requirePermission } from '../src/utils/permissions';

const makeProfile = (rol) => ({ rol_codigo: rol, empresa_id: 'emp-1' });

test('admin puede leer reportes', () => {
  const result = requirePermission(makeProfile('admin'), 'reportes:read');
  expect(result).toBeNull(); // null = sin error = tiene permiso
});

test('profesional NO puede leer reportes', () => {
  const result = requirePermission(makeProfile('profesional'), 'reportes:read');
  expect(result.success).toBe(false);
});

test('superadmin tiene todos los permisos', () => {
  const permisos = ['reportes:read', 'admin:dashboard', 'profesionales:write'];
  permisos.forEach(p => {
    expect(requirePermission(makeProfile('superadmin'), p)).toBeNull();
  });
});
```

#### 3. ReservaController con mocks
```js
// Mock de supabase
jest.mock('../src/config/supabase');

test('crearReserva retorna estado confirmada si autor es el profesional', async () => {
  // setup mock para devolver reserva guardada
  const mockInsert = jest.fn().mockResolvedValue({ data: [{ id: '1' }], error: null });
  require('../src/config/supabase').supabase.from.mockReturnValue({ insert: mockInsert });

  const profile = { rol_codigo: 'profesional', empresa_id: 'emp-1', usuario_id: 'prof-1' };
  const result = await ReservaController.crearReserva(
    { cliente_id: 'cli-1', fecha: '2025-01-15', hora_inicio: '10:00' },
    'prof-1', // mismo que profile.usuario_id
    profile
  );
  expect(result.success).toBe(true);
});

test('crearReserva falla sin permiso', async () => {
  const profile = { rol_codigo: 'cliente', empresa_id: 'emp-1' };
  const result = await ReservaController.crearReserva({}, 'prof-1', profile);
  expect(result.success).toBe(false);
  expect(result.code).toBe('PERMISSION_DENIED');
});
```

#### 4. AuthContext
```js
// Usar @testing-library/react-native
import { renderHook } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

test('login exitoso setea profile y rol', async () => {
  // mockear supabase.auth.signInWithPassword y v_sesion_contexto
  // ...
});
```

### Configuración de GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage --watchAll=false
```

### Comandos

```bash
npm test                          # Ejecuta todos los tests
npm test -- --coverage            # Con reporte de cobertura
npm test -- --testPathPattern=permisos  # Tests específicos
npm test -- --watch               # Modo watch
```

---

## Versión web (Next.js)

> La versión web es una aplicación **Next.js 15** con App Router que comparte los controllers y contextos con la app mobile. Esta sección documenta su arquitectura, rutas implementadas y diferencias respecto al mobile.

### Stack web

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + TypeScript + Tailwind CSS v4 |
| Backend | Supabase (`@supabase/ssr`) |
| Estado global | React Context (Auth, Business, Theme, Tenant) |
| Deploy | Vercel |
| DNS / CDN | Cloudflare (wildcard subdomains) |
| PWA | Service Worker dinámico + Web Manifest por tenant |

---

### Arquitectura multi-tenant web

```
Request (empresa.mensana.com.ar  ó  custom-domain.com)
        ↓
middleware.ts  ← lee Host header, resuelve slug
        ↓
Rewrite interno a /mensana/[slug]/...
        ↓
app/layout.tsx (async)  ← pasa initialSlug vía headers
        ↓
BusinessContext + ThemeContext  ← branding del tenant
        ↓
Rutas protegidas por rol  (AuthContext)
```

**Dos modalidades de tenant:**
- **Free/Beta:** subdominio `empresa.mensana.com.ar` — wildcard DNS en Cloudflare
- **Pro:** dominio propio con CNAME → `cname.vercel-dns.com` (configurado en `/admin/dominio`)

**Archivos clave del multi-tenant:**

| Archivo | Propósito |
|---------|-----------|
| `middleware.ts` | Detecta subdominio/custom domain, reescribe a `/mensana/[slug]` |
| `src/lib/tenant-server.ts` | Server-side: resolución de tenant por slug o dominio |
| `src/context/BusinessContext.tsx` | Carga branding por tenant (acepta `initialSlug` SSR) |
| `app/layout.tsx` | Root layout async: lee headers del middleware, pasa initialSlug |
| `app/mensana/layout.tsx` | Superadmin layout — bypasea auth para rutas públicas |

---

### Rutas web implementadas

#### Públicas (sin autenticación)
| Ruta | Descripción |
|------|-------------|
| `/mensana/[empresa]` | Landing pública del tenant → redirige al login |
| `/mensana/[empresa]/catalogo` | Catálogo de servicios público (white-label) |
| `/mensana/[empresa]/auth/login` | Login por tenant |
| `/mensana/[empresa]/auth/register` | Registro por tenant |
| `/mensana/[empresa]/auth/recuperar-contrasena` | Recuperación de contraseña |

#### Autenticadas — Cliente
| Ruta | Descripción | Controladores |
|------|-------------|--------------|
| `/cliente` | Home: próximas citas + botón de reseña | `ReservaController` |
| `/cliente/reservar` | Flujo completo: profesional → servicio → fecha → hora | `ReservaClienteController` |
| `/cliente/explorar-profesionales` | Directorio de profesionales de la empresa | `ReservaClienteController` |

#### Autenticadas — Profesional
| Ruta | Descripción | Controladores |
|------|-------------|--------------|
| `/profesional` | Dashboard con resumen de caja | `ReservaController` |
| `/profesional/agenda` | Agenda diaria con modales de reserva, pago y cierre | `ReservaController` |
| `/profesional/agenda-mensual` | Calendario mensual con días marcados | `ReservaController` |
| `/profesional/gestion-reservas` | Listado y cambio de estados de reservas | `ReservaController` |
| `/profesional/horarios` | Gestión de disponibilidad semanal | `HorarioController` |

#### Autenticadas — Admin
| Ruta | Descripción | Controladores |
|------|-------------|--------------|
| `/admin` | Dashboard con caja diaria y accesos rápidos | `ReservaController` |
| `/admin/agenda` | Agenda diaria (todas las reservas de la empresa) | `ReservaController` |
| `/admin/agenda-mensual` | Calendario mensual | `ReservaController` |
| `/admin/gestion-reservas` | Listado completo, filtros, cambio de estados | `ReservaController` |
| `/admin/profesionales` | ABM de profesionales con password temporal | `ProfesionalController` |
| `/admin/servicios` | ABM del catálogo de servicios | `ServiciosController` |
| `/admin/horarios` | Gestión de horarios de profesionales | `HorarioController` |
| `/admin/reportes` | Reporte de caja mensual y diario | `ReservaController` |
| `/admin/dominio` | Onboarding Pro: configurar custom domain | — |

#### Autenticadas — Superadmin
| Ruta | Descripción |
|------|-------------|
| `/mensana` | Portal: lista todas las empresas del sistema |

#### Cuenta
| Ruta | Descripción |
|------|-------------|
| `/cuenta/cambiar-contrasena` | Cambio de contraseña autenticado |

---

### API Routes

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/usuarios` | POST | Crea usuario en auth.users (admin server-side) |
| `/api/admin/cliente-acceso` | POST | Crea/habilita acceso app para un cliente |
| `/api/admin/domain/verify` | POST | Verifica CNAME del custom domain por DNS |
| `/api/auth/register-profile` | POST | Crea perfil en `usuarios` tras registro |
| `/api/manifest` | GET | Web Manifest PWA dinámico por tenant |
| `/api/sw` | GET | Service Worker con cache aislado por tenant |

---

### Componentes modales web

| Componente | Ubicación | Uso |
|-----------|-----------|-----|
| `ModalReserva.tsx` | `src/components/reservas/` | Crear/editar reserva desde agenda |
| `ModalFicha.tsx` | `src/components/reservas/` | Ver/editar ficha clínica del cliente |
| `ModalPago.tsx` | `src/components/reservas/` | Registrar pago de una reserva |
| `ModalCierreCaja.tsx` | `src/components/agenda/` | Cerrar turno: nota + monto + método pago |
| `ModalAccesoCliente.tsx` | `src/components/reservas/` | Habilitar acceso app a un cliente existente |
| `ModalResena.tsx` | `src/components/` | Cliente carga reseña post-atención |

---

### PWA

- Service Worker dinámico: cache name `mensana-{slug}-v1` (aislado por tenant)
- Manifest con nombre, colores e iconos del branding del tenant
- Scope desde `/` (header `Service-Worker-Allowed: /`)
- Página offline en `/offline`
- Rewrites en `next.config.ts`: `/sw.js` → `/api/sw`, `/manifest.webmanifest` → `/api/manifest`

---

### Contextos — diferencias web vs mobile

| Contexto | Mobile | Web |
|----------|--------|-----|
| `AuthContext` | AsyncStorage para persistencia | Supabase SSR cookies (`@supabase/ssr`) |
| `BusinessContext` | AsyncStorage + QR deep link | `initialSlug` del middleware vía headers |
| `ThemeContext` | Mismo, platform-agnostic | Mismo |
| `TenantContext` | No existe | Server-side en `src/lib/tenant-server.ts` |

---

### Diferencias de plataforma

| Funcionalidad | Mobile (Expo) | Web (Next.js) | Estado |
|--------------|--------------|---------------|--------|
| Confirmaciones | `Alert.alert()` | `window.confirm()` / modales | ✅ Implementado |
| Login biométrico | `expo-local-authentication` | No aplica | ❌ No portado |
| Almacenamiento seguro | `expo-secure-store` | Cookies httpOnly (Supabase SSR) | ✅ Equivalente |
| QR scan | Cámara nativa | Web API Camera | ❌ No implementado |
| QR generación | `expo-barcode` | Pendiente de librería web | ❌ Pendiente |
| Notificaciones push | Expo Notifications | Web Push API | ❌ Pendiente |
| Multi-tenant resolución | AsyncStorage / deep link | Subdominio / DNS (middleware) | ✅ Implementado |

---

### Variables de entorno web

```
NEXT_PUBLIC_SUPABASE_URL        # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Clave pública Supabase
SUPABASE_SERVICE_ROLE_KEY       # Solo server-side (API routes admin)
```

---

### Features pendientes para web

Ver archivo `PENDIENTES_WEB.md` en la raíz del proyecto para el detalle completo con prioridades.

**Resumen:**
- Features del mobile no portadas: clientes/consultantes, ficha-cliente, QR, historial cliente, servicios profesional
- En construcción en ambas plataformas: favoritos, notificaciones, pagos online
- Web-exclusivas pendientes: panel superadmin completo, planes de suscripción

---

*Actualizado: 2026-03-25 | Rama: desarrollo*
