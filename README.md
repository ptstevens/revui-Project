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
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **Infrastructure**: Coolify (self-hosted PaaS) with Cloudflare Tunnel

## Production Deployment

- **Frontend**: https://revui.app
- **API**: https://api.revui.app
- **Platform**: Self-hosted on Coolify via Cloudflare Tunnel

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
- [Cloudflare R2 Setup](docs/CLOUDFLARE_R2_SETUP.md) - Recording storage configuration
- [Story 1.1 Completion Report](STORY-1.1-COMPLETION-REPORT.md) - Multi-tenant organization registration
- [Story 1.2 Completion Report](STORY-1.2-COMPLETION.md) - Enhanced magic link authentication
- [Authentication Refactor](AUTHENTICATION-REFACTOR.md) - Dual authentication system (password + magic link)

## Current Status

✅ **Story 1.1 Complete**: Multi-Tenant Organization Registration
- Organization registration with email verification
- PostgreSQL RLS for tenant isolation
- Magic link authentication (SHA-256)
- 15/15 unit tests passing

✅ **Story 1.2 Complete**: Enhanced Magic Link Authentication
- Cryptographically secure token generation (256-bit)
- One-time use enforcement
- Time-based expiration (configurable per organization)
- Comprehensive audit trail
- 21/21 unit tests passing

✅ **Story 1.4 Complete**: Recording Storage with Cloudflare R2
- Pre-signed URL upload/download
- Multi-tenant file isolation
- Zero egress costs

✅ **Authentication Refactor Complete**: Dual Authentication System
- **Platform Users**: Email/password signup and login with bcrypt (12 rounds)
- **Task Recipients**: Magic link authentication (unchanged)
- Password strength validation and change password functionality
- Frontend login/register pages with user header and logout
- Full backward compatibility with existing magic link flow
- See [AUTHENTICATION-REFACTOR.md](AUTHENTICATION-REFACTOR.md) for complete details

## License

Proprietary - All rights reserved
