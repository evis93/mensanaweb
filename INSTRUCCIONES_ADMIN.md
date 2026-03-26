# Configuración de Administrador

## Pasos para configurar el sistema

### 1. Ejecutar el script SQL
Abre el editor SQL de Supabase y ejecuta el archivo `configurar_admin.sql`. Este script hará lo siguiente:

- **Eliminar** completamente al usuario `paraquecarajolaqueres@gmail.com` de todas las tablas
- **Dar rol de administrador** a `eva.caballero.93@gmail.com`
- **Verificar** que los cambios se aplicaron correctamente

### 2. Resultado esperado
Después de ejecutar el script, `eva.caballero.93@gmail.com` tendrá:
- ✅ Perfil de **profesional** (ya lo tiene)
- ✅ Perfil de **administrador** (nuevo)
- ✅ Acceso a la pantalla de administración
- ✅ `profile.esAdmin = true`
- ✅ `profile.esProfesional = true`
- ✅ `profile.profesionalId` disponible para crear reservas

### 3. Funcionalidades actuales

#### Como Profesional:
- Ver y gestionar su agenda de reservas
- Crear, editar y cancelar reservas
- Ver totales del día y del mes en la pantalla Admin

#### Como Administrador:
- Acceso a la pantalla de Profesionales (botón en Admin)
- **Pendiente de implementar**: Crear nuevos profesionales con cuentas completas (usuarios + auth)

### 4. Próximos pasos (pendientes de implementación)

Para que los administradores puedan crear profesionales completos, necesitamos:

1. **Actualizar `ProfesionalController.crearProfesional`** para que:
   - Cree un usuario en `auth.users` con email y contraseña temporal
   - Cree el registro en `usuarios`
   - Cree el perfil en `perfiles`
   - Cree el perfil específico en `perfiles_profesionales`

2. **Actualizar `ProfesionalesScreen`** para que:
   - Solicite email además de nombre
   - Genere una contraseña temporal
   - Muestre la contraseña temporal al administrador para que se la dé al nuevo profesional

### 5. Verificación
Para verificar que todo funciona:
1. Ejecuta el script SQL
2. Cierra sesión en la app
3. Vuelve a iniciar sesión con `eva.caballero.93@gmail.com`
4. Deberías ver tus reservas (como profesional)
5. El botón "Admin" debería funcionar
6. Dentro de Admin, el botón "Profesionales" debería funcionar

## Archivos modificados en este proceso

### Controllers
- `src/controllers/ProfesionalController.js` - Actualizado para usar `perfiles_profesionales` con join a `usuarios`
- `src/controllers/ReservaController.js` - Actualizado para usar `profesional_id` en lugar de `terapeuta_id`

### Contexts
- `src/context/AuthContext.js` - Actualizado para manejar múltiples perfiles (admin + profesional)

### Screens
- `src/views/screens/AdminScreen.js` - Actualizado para usar `profile.profesionalId`
- `src/views/screens/AgendaScreen.js` - Actualizado para pasar `profesionalId` a las queries
- `src/views/screens/auth/LoginScreen.js` - Agregada funcionalidad de cambio de contraseña

### Scripts SQL
- `configurar_admin.sql` - Script principal para eliminar usuario y configurar admin
- `limpiar_usuario.sql` - Script alternativo solo para limpiar (no usado)
- `migracion_usuario.sql` - Script de migración (ya no necesario)
