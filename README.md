# CanchaYa Frontend

Frontend web de **CanchaYa**. Next.js 15 (App Router), TypeScript y un BFF que habla con [`canchaya_backend`](https://github.com/Tirmax95/canchaya_backend).

## Cómo se organiza

```
src/
  app/            Rutas, layouts y Route Handlers (adaptadores HTTP)
  application/    Casos de uso: catálogo y agenda (sin N+1)
  core/           Config, errores, cliente HTTP, sesión firmada, roles
  data/           Repositorios que mapean el contrato de NestJS
  domain/         Modelos, Zod y reglas de reserva
  features/       UI de cada caso de uso
  shared/         Design system y helpers
  widgets/        Header, footer y providers
```

La sesión vive en una cookie **httpOnly + HMAC**. El `userId` de una reserva nunca lo manda el navegador: el BFF lo toma de la sesión.

## Requisitos

- Node.js 20.19+
- Backend NestJS en `http://localhost:3000` (repo hermano `canchaya_backend`)

## Arranque

```bash
cd canchaya_frontend
cp .env.example .env.local
npm install
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001).

Variables:

| Variable | Uso |
| --- | --- |
| `BACKEND_URL` | Origen del API NestJS |
| `SESSION_SECRET` | Firma HMAC de la cookie (mín. 32 chars en producción) |
| `SESSION_COOKIE_NAME` | Nombre de la cookie |

En el backend, `CORS_ORIGINS` debe incluir `http://localhost:3001`.

## Scripts

```bash
npm run dev        # http://localhost:3001
npm run lint
npm run typecheck
npm test
npm run build
```

## Flujos

- **Jugador:** registro / login → sedes → cancha → horario → reserva pending
- **Staff** (`admin`, `establishment_owner`, `manager`): panel para CRUD de sedes/canchas y confirmar reservas
