# RC Leadership 360 — Vercel + PostgreSQL/Neon

Plataforma para desarrollo de supervisores con:

- Autoevaluación de 48 ítems.
- Perfil conductual D/I/S/C de uso formativo (no DISC oficial).
- 10 competencias de liderazgo.
- Encuesta 360° de 24 conductas observables.
- Confidencialidad: resultados del equipo solo visibles con 3 o más respuestas.
- RUT del trabajador transformado mediante HMAC SHA-256 para impedir duplicidad sin guardar el RUT en texto visible.
- Acceso separado para Administrador, Psicóloga Laboral y Empresa.
- Empresa aislada por `company_id` en todas las consultas del servidor.
- Dashboard integrado y análisis de brechas supervisor/equipo.
- Creación desde la interfaz de empresas, supervisores y ciclos de evaluación.
- Informe imprimible/guardable como PDF desde el navegador.

## Arquitectura

Next.js (Vercel) -> Route Handlers privados -> PostgreSQL (recomendado Neon en Vercel Marketplace).

No utiliza Supabase.

## 1. Crear proyecto en Vercel

Importa esta carpeta como un proyecto Next.js.

## 2. Crear la base de datos

Desde el proyecto Vercel instala Neon desde Marketplace y crea una base en plan adecuado. Vercel inyectará `DATABASE_URL` al proyecto.

También puedes utilizar cualquier PostgreSQL compatible.

## 3. Ejecutar esquema

Ejecuta `database/schema.sql` en la base PostgreSQL.

## 4. Variables de entorno

Configura:

- `DATABASE_URL`
- `SESSION_SECRET` (cadena aleatoria larga)
- `RUT_HASH_SECRET` (cadena aleatoria distinta)
- `BOOTSTRAP_ADMIN_RUT`
- `BOOTSTRAP_ADMIN_PASSWORD`

Nunca expongas estos secretos con prefijo `NEXT_PUBLIC_`.

## 5. Crear primer administrador

En un entorno con las variables cargadas:

```bash
npm run bootstrap:admin
```

Después elimina `BOOTSTRAP_ADMIN_PASSWORD` de Vercel si ya no lo necesitas.

## 6. Flujo de operación

1. Administrador ingresa.
2. Crea una empresa con RUT y contrasña inicial.
3. Crea supervisor con RUT, nombre, cargo y área.
4. Abre un ciclo de evaluación.
5. Supervisor entra desde portada con su RUT y completa 48 ítems.
6. Trabajadores entran con el RUT del supervisor y completan 24 ítems.
7. Con al menos 3 trabajadores, se habilita el análisis agregado 360°.
8. Empresa/Psicóloga revisan autopercepción, percepción del equipo y brechas.

## Seguridad aplicada

- Contraseñas con bcrypt (cost 12).
- Sesión firmada HS256 en cookie HttpOnly, SameSite=Lax y Secure en producción.
- RUT del trabajador no se guarda en texto: se transforma mediante HMAC SHA-256 con secreto del servidor.
- Consultas de empresa filtradas por `company_id` desde el servidor.
- Las respuestas individuales del equipo no tienen endpoint de lectura para empresa/supervisor.
- El análisis del equipo solo se entrega con `n >= 3`.
- Consultas SQL parametrizadas.

## Consideración metodológica

RC Leadership 360 es una herramienta de desarrollo organizacional inspirada en dimensiones conductuales D/I/S/C y competencias de liderazgoõ. No es el DISC oficial, no es el LPI oficial y no constituye diagnóstico psicológico clínico. Su uso recomendado es acompañado por psicología laboral y contextualizado con antecedentes del cargo y la organización.

## Desarrollo local

```bash
npm install
npm run dev
```

Para probar el frontend sin base de datos, escribe `demo` como RUT en la portada. Los accesos de administración sí requieren base de datos.
