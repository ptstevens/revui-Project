# Revui - Competency Verification Platform

Multi-tenant SaaS platform for competency verification through screen recording with voice narration.

## Project Structure

```
revui-app/
├── apps/
│   ├── backend/          # NestJS API server
│   └── frontend/         # React application
├── packages/
│   ├── shared/           # Shared utilities and helpers
│   └── types/            # Shared TypeScript types
└── turbo.json           # Turborepo configuration
```

## Technology Stack

- **Backend**: NestJS (Node.js 20 LTS, Express 4.18+)
- **Frontend**: React 18.3+ with Vite and Tailwind CSS
- **Database**: PostgreSQL 14+ with Prisma 5.x ORM
- **Caching**: Redis 7+
- **Storage**: AWS S3 + CloudFront CDN

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 14+
- Redis 7+ (optional for development)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Database Setup

```bash
# Run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

## Multi-Tenancy

Revui uses PostgreSQL Row-Level Security (RLS) for multi-tenant data isolation. Every database table includes a `tenant_id` column with RLS policies enforcing data segregation at the database level.

## Documentation

- [Setup Guide](SETUP.md) - Comprehensive setup instructions for Coolify deployment
- [Story 1.1 Completion Report](STORY-1.1-COMPLETION-REPORT.md) - Implementation details and validation

## Current Status

✅ **Story 1.1 Complete**: Multi-Tenant Organization Registration
- Organization registration with email verification
- PostgreSQL RLS for tenant isolation
- Magic link authentication (SHA-256)
- 15/15 unit tests passing

## License

Proprietary - All rights reserved
