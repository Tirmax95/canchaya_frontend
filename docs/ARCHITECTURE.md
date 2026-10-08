# Arquitectura del frontend CanchaYa

El web replica la idea hexagonal del backend: el dominio no conoce Next.js, y los adaptadores (páginas + route handlers) empujan datos hacia adentro.

## Capas

1. **Domain** — Tipos, Zod y reglas de disponibilidad. Sin `fetch`, sin cookies.
2. **Application** — Orquesta repositorios en paralelo (`Promise.all` + `Map`) para no hacer N+1 al pintar catálogo o reservas.
3. **Data** — Únicos que hablan con NestJS. Traducen snake/camel y **eliminan `passwordHash`**.
4. **Core** — Cliente HTTP con timeout, `AppError` y sesión firmada.
5. **App / Features** — Adaptadores de UI y BFF.

## Seguridad

- Cookie `httpOnly`, `SameSite=Lax`, `Secure` en producción.
- Payload de sesión firmado con HMAC-SHA256 y comparado en tiempo constante.
- Mutaciones admin: `requireStaff()`.
- Cancelar reserva: dueño o staff (`canManageReservation`) para evitar IDOR.
- Crear reserva: `userId` sale de la sesión, no del body.
- Imágenes remotas: solo `http`/`https`.

## Contrato del backend usado

| Recurso | Rutas NestJS |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/user/:id`, `PUT /auth/user/:id`, `GET /auth/user/:id/roles`, `POST /auth/logout` |
| Sedes | `/establishment/create\|get\|get/:id\|update/:id\|delete/:id` |
| Canchas | `/field/create\|get\|get/:id\|update/:id\|delete/:id` |
| Reservas | `/reservations`, `/reservations/user/:userId`, `/reservations/field/:fieldId`, `PUT .../cancel\|confirm` |
