# CanchaYa Frontend

Web de CanchaYa. Next.js 15 (App Router) + TypeScript. Es un BFF: las rutas de `app/` llaman al backend NestJS a través de `data/`. Es un repositorio git independiente.

## Idioma

- Responde en español.
- La UI, los mensajes de error para el usuario y la documentación van en español.
- El código, los nombres y los commits van en inglés (`feat:`, `fix:`, `chore:`).

## Comandos

```bash
npm install
cp .env.example .env.local   # solo la primera vez
npm run dev                  # puerto 3001, con Turbopack
npm test                     # tsx --test sobre src/domain/*.test.ts
npm run typecheck
npm run lint
npm run build
```

Requiere el backend en `http://localhost:3000` y `CORS_ORIGINS` con `http://localhost:3001`.

## Variables de entorno

Definidas en `.env.example`. Todas van en `.env.local`, que no se versiona.

- `BACKEND_URL`: origen de la API NestJS.
- `SESSION_SECRET`: firma HMAC de la cookie. Mínimo 32 caracteres en producción.
- `SESSION_COOKIE_NAME`: nombre de la cookie de sesión.
- `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`: solo para el cliente.

Nunca pongas `SESSION_SECRET` ni otras claves en código, en `NEXT_PUBLIC_*` ni en commits.

## Capas (`src/`)

- `domain/`: modelos, esquemas Zod y reglas de reserva. No usa `fetch`, cookies ni Next.js.
- `application/`: casos de uso. Carga en paralelo con `Promise.all` y `Map`. No hagas N+1.
- `data/`: único lugar que habla con NestJS. Traduce snake_case/camelCase y elimina `passwordHash`.
- `core/`: cliente HTTP con timeout, `AppError`, sesión firmada y roles.
- `app/`: rutas, layouts y Route Handlers (adaptadores HTTP).
- `features/`: UI de cada caso de uso.
- `widgets/`: header, footer y providers.
- `shared/`: design system y helpers.
- `middleware.ts`: protección de rutas.

## Reglas de seguridad

- La sesión vive en una cookie `httpOnly` con HMAC-SHA256, comparada en tiempo constante. No la leas desde el cliente.
- El `userId` de una reserva **siempre** sale de la sesión, nunca del body ni de la URL.
- Las mutaciones de administración llaman a `requireStaff()` antes de hacer nada.
- Cancelar una reserva requiere ser dueño o staff (`canManageReservation`). Evita IDOR.
- Las imágenes remotas solo admiten `http` y `https`.
- Valida toda entrada con Zod en el servidor, aunque el formulario ya valide.

## Roles

- Jugador: registro, login, reservas.
- Staff (`admin`, `establishment_owner`, `manager`): CRUD de sedes y canchas, y confirmación de reservas.

## Reglas de código

- Las llamadas al backend pasan solo por `data/`. Las páginas y componentes no usan `fetch` directo.
- La lógica de disponibilidad y reserva vive en `domain/`, con tests en `src/domain/*.test.ts`. Si cambias esas reglas, agrega o actualiza el test.
- Un test nuevo de dominio debe agregarse al script `test` de `package.json`, porque la lista de archivos es explícita.

## Antes de cerrar un cambio

1. `npm run typecheck` y `npm run lint`.
2. `npm test`.
3. `npm run build` si tocaste rutas, configuración de Next o imports del servidor.
4. Si cambiaste llamadas al backend, verifica que el contrato sigue coincidiendo con `canchaya_backend`.

## Documentación

- `docs/ARCHITECTURE.md`: capas, seguridad y contrato con el backend.
- `README.md`: arranque y flujos de jugador y staff.
