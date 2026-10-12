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
- **Eventos y torneos** (módulo **Eventos**, lo habilita el super admin por tenant):
  - **Organizador:** en `/admin/eventos` crea el evento y elige el formato: liga, eliminación directa, grupos + eliminatoria o evento abierto. Configura cupos, jugadores por equipo, valor de inscripción, aprobación manual, puntos, ida y vuelta, grupos y tercer puesto.
  - **Ciclo de vida:** publicar → cerrar inscripciones → iniciar (el fixture se arma solo) → programar partidos en cancha (crea una reserva confirmada que bloquea el horario) → cargar resultados (tabla y llaves se actualizan y el ganador avanza) → finalizar. También se puede cancelar: se liberan las canchas y se avisa a los equipos.
  - **Capitán:** en `/eventos/[id]` inscribe uno de sus equipos. Si no hay cupo, queda en lista de espera y sube solo cuando se libera uno. Paga en `/eventos/[id]/inscripcion/[registro]` si la sede cobra en línea (Wompi); si no, la organización marca el pago. Puede retirarse antes del inicio y, si ya pagó, la devolución queda pendiente para el organizador.
