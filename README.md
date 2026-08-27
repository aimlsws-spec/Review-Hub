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
| `@reviewhub/shared-ui` | `packages/shared-ui` | Shared React UI components (Badge, Modal, PageHeader, etc.) used by both portals |

## Quick Start

```bash
# Install all dependencies
npm install

# Start backend
cd apps/backend && npm run dev
```

## Development

See `apps/backend/README.md` for backend-specific setup instructions.
