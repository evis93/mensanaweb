# MENSANA Web — Funcionalidades Pendientes

> Este documento lista las features que faltan en la versión web (Next.js), organizadas por prioridad y origen.
> Para ver el estado actual de lo implementado, ver la sección "Versión web" en `FUNCIONALIDADES.md`.

---

## Tabla de contenidos

1. [P1 — Features del mobile no portadas a web](#p1--features-del-mobile-no-portadas-a-web)
2. [P2 — En construcción en ambas plataformas](#p2--en-construcción-en-ambas-plataformas)
3. [P3 — Features web-exclusivas pendientes](#p3--features-web-exclusivas-pendientes)
4. [Deuda técnica y pendientes documentados](#deuda-técnica-y-pendientes-documentados)

---

## P1 — Features del mobile no portadas a web

Estas funcionalidades están completamente implementadas en la app mobile y tienen **controladores listos** en el proyecto web. Solo falta crear las páginas y conectarlas.

---

### 1.1 Gestión de Consultantes/Clientes — Admin

**Ruta propuesta:** `/admin/clientes`
**Controlador disponible:** `src/controllers/ConsultanteController.js`

| Operación | Método del controlador |
|-----------|----------------------|
| Listar clientes | `obtenerConsultantes(profile)` |
| Buscar por nombre/email | `buscarConsultantes(query, profile)` |
| Ver detalle | `obtenerConsultantePorId(id, profile)` |
| Crear cliente | `crearConsultante(data, profile)` |
| Editar cliente | `actualizarConsultante(id, data, profile)` |
| Desactivar (soft delete) | `eliminarConsultante(id, profile)` |

**Permisos requeridos:** `consultantes:read` (admin, profesional) / `consultantes:write` (admin, profesional)

**Notas:**
- El campo `autorizar_acceso_app` permite habilitar login en la app al cliente.
- El componente `ModalAccesoCliente.tsx` ya existe para habilitar acceso a clientes existentes.
- Si el email ya existe en el sistema, `crearConsultante` reutiliza el usuario y solo agrega el rol.

---

### 1.2 Gestión de Consultantes/Clientes — Profesional

**Ruta propuesta:** `/profesional/clientes`
**Controlador disponible:** `src/controllers/ConsultanteController.js`

Mismas operaciones que admin pero el profesional también puede crear y editar clientes (`consultantes:write`).
Ver matriz de permisos en `FUNCIONALIDADES.md`.

---

### 1.3 Ficha del Cliente

**Ruta propuesta:** `/admin/ficha-cliente?id=[usrEmpresaId]`
**Controladores disponibles:**
- `src/controllers/FichaController.js`
- `src/controllers/FichaConsultanteController.js`
**Componente disponible:** `src/components/reservas/ModalFicha.tsx`

| Operación | Controlador |
|-----------|-------------|
| Ver fichas de un cliente | `FichaConsultanteController.obtenerFichasPorCliente(usrEmpresaId, profile)` |
| Crear ficha manual | `FichaController.crearFicha({ usr_empresa_id, nota, fecha, profesional_id }, profile)` |

**Notas:**
- `usr_empresa_id` es el `id` de `usuario_empresa`, **no** el `usuario_id`.
- Las fichas también se crean automáticamente al cerrar un turno (`ReservaController.cerrarSesion`).
- Esta pantalla es accesible desde el listado de clientes (botón "Ver ficha").

---

### 1.4 Servicios del Profesional

**Ruta propuesta:** `/profesional/servicios`
**Controlador disponible:** `src/controllers/ServiciosController.js`

| Operación | Método |
|-----------|--------|
| Ver servicios de la empresa | `obtenerServicios(profile)` |
| Ver servicios asignados al profesional | `obtenerServiciosProfesional(profesionalId, profile)` |
| Actualizar servicios del profesional | `guardarServiciosProfesional(profesionalId, servicioIds[], profile)` |

**Notas:**
- El profesional no puede crear/eliminar servicios del catálogo (eso es admin).
- Solo puede marcar cuáles de los servicios de la empresa ofrece él.
- Esta pantalla también debería estar accesible desde `/admin/profesionales` al editar un profesional.

---

### 1.5 Historial de Citas — Cliente

**Ruta propuesta:** `/cliente/historial`
**Controlador disponible:** `src/controllers/ReservaController.js`

| Operación | Método |
|-----------|--------|
| Ver historial del cliente logueado | `obtenerReservasPorCliente(clienteId, profile)` |
| Cancelar reserva propia | `ReservaClienteController.cancelarReserva(reservaId, clienteId)` |

**Notas:**
- El cliente solo puede cancelar con al menos 2 horas de anticipación.
- La pantalla home (`/cliente`) ya muestra la **próxima cita**; esta pantalla mostraría el historial completo.

---

### 1.6 Generación de QR de Empresa

**Ruta propuesta:** `/admin/qr`
**Librería sugerida:** `qrcode.react` (npm)

El QR debe encodear una URL del tipo:
```
https://empresa.mensana.com.ar
```
o para dominio propio:
```
https://custom-domain.com
```

Al escanearlo desde mobile, el cliente llega a la landing pública del tenant.

---

## P2 — En construcción en ambas plataformas

Estas features están identificadas en el diseño pero no implementadas en ninguna plataforma.

---

### 2.1 Favoritos

**Permisos documentados:** `favoritos:read`, `favoritos:write`
**Descripción:** El cliente puede marcar centros o profesionales como favoritos para acceso rápido.
**Ruta sugerida:** `/cliente/favoritos`
**Requiere:** Nueva tabla en Supabase (`favoritos` con `usuario_id`, `empresa_id`, `profesional_id`)

---

### 2.2 Notificaciones y Recordatorios

**Campo relacionado:** `reservas.recordatorio_enviado` (ya existe en la tabla)
**Descripción:** Enviar recordatorio al cliente antes de su turno (email o push).
**Opciones de implementación:**
- Email: Resend / SendGrid vía Supabase Edge Functions
- Push web: Web Push API + tabla `push_subscriptions`
- Push mobile: Expo Notifications

**Notas:**
- El campo `recordatorio_enviado` en `reservas` ya existe para evitar duplicados.
- Un cron job de Supabase (pg_cron) podría disparar el envío X horas antes del turno.

---

### 2.3 Pagos Online

**Campo relacionado:** `reservas.seña_pagada`, `reservas.monto_seña`
**Descripción:** Integración con pasarela de pagos para cobrar la seña online al confirmar la reserva.
**Opciones:**
- MercadoPago Checkout Pro (Argentina)
- Stripe (internacional)

**Notas:**
- La tabla `reservas` ya tiene los campos `seña_pagada` y `monto_seña` preparados.
- El flujo de reserva del cliente (`ReservaClienteController.solicitarReserva`) ya crea la reserva en estado `pendiente`; el pago confirmado cambiaría el estado a `confirmada`.

---

### 2.4 Reportes Mensuales Avanzados

**Ruta existente:** `/admin/reportes` (básico implementado)
**Lo que falta:**
- Gráficos de evolución mensual (Chart.js o Recharts)
- Desglose por profesional
- Exportación a CSV/PDF
- Comparativa mes a mes

---

## P3 — Features web-exclusivas pendientes

Estas features no existen en el mobile y son exclusivas del backoffice web.

---

### 3.1 Panel Superadmin Completo

**Ruta existente:** `/mensana` (lista empresas, básico)
**Lo que falta:**
- Crear nueva empresa desde el panel
- Editar datos de una empresa (nombre, branding, plan)
- Ver estadísticas globales (reservas, usuarios, ingresos por empresa)
- Suspender/reactivar una empresa

**Controlador sugerido:** Crear `EmpresaController.ts` (no existe aún)
**Tabla:** `empresas`

---

### 3.2 Planes de Suscripción / Billing

**Descripción:** Gestión de los planes Free y Pro para cada empresa.
**Lo que falta:**
- Tabla `suscripciones` o campo `plan` en `empresas`
- Pantalla de selección de plan en el onboarding
- Restricción de features según plan (e.g., custom domain solo Pro)
- Integración con pasarela de pagos para la suscripción mensual

---

### 3.3 Perfil Público del Profesional

**Ruta sugerida:** `/mensana/[empresa]/profesional/[id]`
**Descripción:** Página pública del profesional dentro de la landing de la empresa, con:
- Foto, nombre, descripción
- Servicios que ofrece
- Horarios disponibles
- Botón "Reservar"

---

### 3.4 Moderación de Reseñas

**Descripción:** El admin puede ver y moderar las reseñas dejadas por los clientes.
**Ruta sugerida:** `/admin/resenas`
**Requiere:** Tabla `resenas` en Supabase (si no existe)
**Componente:** `ModalResena.tsx` ya existe en el cliente.

---

### 3.5 Publicar Material de Prácticas / Feed de Bienestar

**Descripción:** El profesional puede publicar artículos, ejercicios o recursos para sus clientes.
**Visto en los diseños:** `feed_de_bienestar_mensana`, `publicar_material_de_practicas`
**Ruta sugerida:** `/profesional/contenido`, `/cliente/feed`

---

## Deuda técnica y pendientes documentados

### De INSTRUCCIONES_ADMIN.md

- [ ] **Pantalla `Profesionales` en admin:** el botón "Crear" ya funciona con `ProfesionalController.crearProfesional`, pero falta mostrar mejor la contraseña temporal generada (actualmente solo en modal).
- [ ] **`ProfesionalController.crearProfesional`** debe crear el usuario en `auth.users` vía API route `/api/admin/usuarios`. Verificar que el flujo web esté completo end-to-end.

### Otros

- [ ] **Tests (Jest):** La sección de testing de `FUNCIONALIDADES.md` describe los tests del mobile. Adaptar a Vitest o Jest para Next.js y crear tests para los controllers compartidos.
- [ ] **`app/mensana/[empresa]/page.tsx`** actualmente solo redirige al login. Podría mostrar una landing de bienvenida antes de redirigir, usando el branding del tenant.
- [ ] **Flujo de onboarding** para nuevas empresas (registro → crear empresa → configurar profesionales → configurar servicios).

---

*Generado: 2026-03-25 | Rama: desarrollo*
