# VetPax Web Frontend

Aplicación web **Angular 21** de VetPax. Incluye únicamente los formularios visuales de **inicio de sesión**, **registro** y un **dashboard vacío** después de autenticarse; el resto de los módulos del prototipo fueron retirados.

## Requisitos

- Node.js compatible con Angular 21 (por ejemplo Node.js 22.12 o superior) y npm.
- API VetPax disponible en `https://localhost:7175` (perfil `https`).
- Keycloak disponible en `http://localhost:8080`, realm `vetpax`.

## Configurar el cliente Keycloak

En el realm `vetpax`, cliente público **`vetpax-dev`**:

- **Standard flow**: habilitado.
- **Valid redirect URIs**: agregar `http://localhost:4200/auth/callback`.
- **Web origins**: agregar `http://localhost:4200` (es obligatorio para canjear el código desde el navegador).
- **PKCE**: permitir `S256`.
- **Client authentication**: deshabilitada (cliente público, no agregar client secrets al frontend).

No elimines las otras URIs usadas por el proyecto móvil o Swagger.

## Instalar y ejecutar

```powershell
npm ci
npm start
```

Abrir **http://localhost:4200**. El servidor de desarrollo Angular hace proxy de `/api` hacia **`https://localhost:7175`** (`proxy.conf.json`), por lo que **no requiere habilitar CORS** en la API para el registro durante desarrollo local. El proxy permite el certificado HTTPS de desarrollo de ASP.NET Core (solo en local).

## Flujo de autenticación

1. **Login** (`/sign-in`): ingresar correo y pulsar **Continuar con Keycloak**. El navegador abre Keycloak para introducir la contraseña. Angular **no recopila ni almacena** la contraseña del inicio de sesión. Se usa **Authorization Code + PKCE (S256)**.
2. **Registro** (`/sign-up`): envía `firstName`, `lastName`, `email` y `password` a `POST /api/v1/auth/register`. **Este endpoint registra cuentas de propietarios**. Tras un `201`, se inicia el login con Keycloak para obtener una sesión válida; no se inventa un token.
3. **Callback** (`/auth/callback`): valida `state`, canjea el código OAuth por el token en Keycloak y redirige al **dashboard vacío** (`/dashboard`).
4. **Dashboard**: pantalla blanca sin datos, protegida por guard de sesión. El token se guarda en `sessionStorage` del navegador hasta su caducidad; no hay renovación automática todavía.

> La interfaz web no dispone de registro público de cuentas de veterinario o administrador; ese flujo no está implementado en el backend indicado. Un usuario de esos roles ya existente en Keycloak puede iniciar sesión.

## Configuración de conexión

- `src/environments/environment.ts`: `apiBaseUrl`, `keycloakUrl`, `keycloakRealm`, `keycloakClientId`.
- `proxy.conf.json`: destino de la API para `npm start`.
- La URI de retorno usa automáticamente el origen de la página (`http://localhost:4200/auth/callback`).

Si cambias el puerto de Angular, actualiza las **Valid redirect URIs** y **Web origins** del cliente en Keycloak.

## Comandos útiles

```powershell
npm start
npm run build
```

## Errores frecuentes

- **`invalid_redirect_uri`**: falta `http://localhost:4200/auth/callback` en Keycloak.
- **CORS en `/token`**: falta `http://localhost:4200` en **Web origins** de Keycloak.
- **`502` o `ECONNREFUSED` en `/api/v1/auth/register`**: confirma que la API esté escuchando en `https://localhost:7175`.
- **`409 Conflict`**: el correo ya está registrado.
- **`400 Bad Request`**: verifica los datos del registro (contraseña de 8 caracteres mínimo).
- **`invalid_grant`**: el código OAuth expiró, se reutilizó o se modificó el origen/puerto; vuelve a iniciar sesión.

**Nota:** el proxy y los endpoints de `localhost` están configurados solo para desarrollo. Un despliegue público requiere HTTPS, configuración de URLs, CORS/origen y un proxy adecuados, sin omitir la validación de certificados.
