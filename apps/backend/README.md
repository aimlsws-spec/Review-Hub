# ReviewHub — Backend API

NestJS backend for the ReviewHub platform.

## Stack

- **Framework**: NestJS (TypeScript)
- **Database**: MySQL via Prisma ORM
- **Cache**: Redis
- **Auth**: JWT (access + refresh tokens)
- **Docs**: Swagger / OpenAPI

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Fill in required values in .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Environment Variables

See `.env.example` for all required variables.

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string (`mysql://user:pass@host:3306/db`) |
| `JWT_ACCESS_SECRET` | Secret for access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars) |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |

## Project Structure

```
src/
├── common/           # Shared utilities, decorators, guards, pipes
│   ├── constants/    # App-wide constants & error codes
│   ├── decorators/   # Custom decorators
│   ├── dto/          # Shared DTOs
│   ├── enums/        # Platform enums
│   ├── exceptions/   # Custom exception classes
│   ├── filters/      # Exception filters
│   ├── guards/       # Auth & roles guards
│   ├── helpers/      # Pagination & utility helpers
│   ├── interceptors/ # Response transform & logging
│   ├── interfaces/   # Shared interfaces
│   ├── middleware/   # Request middleware
│   ├── pipes/        # Validation pipe
│   ├── types/        # Shared types
│   └── utils/        # Utility functions
├── config/           # Configuration modules
│   └── envs/         # Per-service config factories
├── database/
│   └── prisma/       # Prisma service & module
├── modules/          # Feature modules (auth, users, campaigns, etc.)
├── shared/
│   ├── base/         # Base entity, repository, service
│   ├── health/       # Health check endpoint
│   └── logger/       # App logger service
├── app.module.ts     # Root application module
└── main.ts           # Bootstrap entry point
```

## API Documentation

Swagger UI is available at `http://localhost:3000/api/docs` in non-production environments.

## Scripts

```bash
npm run dev             # Development with hot reload
npm run build           # Production build
npm run start            # Start production build
npm run lint             # ESLint
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npx prisma studio         # Prisma database GUI
npx prisma migrate dev    # Run migrations
```
