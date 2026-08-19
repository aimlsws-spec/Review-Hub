# ReviewHub — Monorepo

Full-stack platform for review & task-based reward campaigns.

## Apps

| App | Path | Stack |
|---|---|---|
| Backend API | `apps/backend` | NestJS, MySQL, Redis |
| Merchant Portal | `apps/merchant-portal` | React, TypeScript |
| Admin Portal | `apps/admin-portal` | React, TypeScript |
| Mobile App | `apps/mobile` | Flutter |
| AI Services | `apps/ai-services` | Python |

## Shared Packages

| Package | Path | Description |
|---|---|---|
| `@reviewhub/shared-types` | `packages/shared-types` | Shared TypeScript types |
| `@reviewhub/shared-constants` | `packages/shared-constants` | Shared constants |
| `@reviewhub/shared-utils` | `packages/shared-utils` | Shared utility functions |

## Quick Start

```bash
# Install all dependencies
npm install

# Start backend
cd apps/backend && npm run start:dev
```

## Development

See `apps/backend/README.md` for backend-specific setup instructions.
