# Revui Setup Guide

This guide will help you set up the Revui application for local development using Coolify for infrastructure.

## Architecture Overview

**Recommended Setup:**
- **PostgreSQL**: Hosted on Coolify server (containerized, managed)
- **Backend**: Optionally hosted on Coolify OR run locally
- **Frontend**: Run locally for rapid development

This separates infrastructure concerns and provides a production-like environment.

---

## Quick Start Guide

**Choose your setup approach:**

### 🚀 Option 1: SSH Tunnel (Most Secure - Recommended)
```bash
# Terminal 1: SSH tunnel to Coolify
ssh -L 5432:localhost:5432 user@coolify-server

# Terminal 2: Set DATABASE_URL to localhost
DATABASE_URL="postgresql://revui:password@localhost:5432/revui"

# Terminal 3: Start dev servers
npm run dev
```
**Security:** ✅ PostgreSQL never exposed, even to LAN

---

### ⚡ Option 2: LAN Exposure (Fast, Acceptable Security)
```bash
# 1. Expose PostgreSQL to LAN in Coolify (192.168.1.0/24 only)
# 2. Set DATABASE_URL to Coolify LAN IP
DATABASE_URL="postgresql://revui:password@192.168.1.100:54320/revui"

# 3. Start dev servers
npm run dev
```
**Security:** ⚠️ PostgreSQL accessible on LAN - use firewall rules

---

### 🏗️ Option 3: Full Coolify Deploy (Production-like)
```bash
# 1. Deploy PostgreSQL + Backend to Coolify
# 2. Backend uses internal network: revui-postgres:5432
# 3. Frontend runs locally, points to Coolify backend
```
**Security:** ✅ PostgreSQL only accessible within Docker network

---

### 🌐 Option 4: Cloudflare Tunnel (Your Current Setup)

You have `coolify-backend.revui.app` working via Cloudflare Tunnel. Here's how to set up PostgreSQL access:

#### Setup 1: Backend on Coolify (Recommended - Internal Network)

**Your backend uses internal Docker network (NO tunnel needed for PostgreSQL):**

```bash
# In Coolify backend environment variables:
DATABASE_URL="postgresql://revui:password@revui-postgres:5432/revui?schema=public"
```

✅ PostgreSQL never exposed externally - most secure
✅ Backend and PostgreSQL communicate via Docker internal network
✅ No additional tunnel configuration needed

**This is your best option** since your backend is already on Coolify via `coolify-backend.revui.app`.

---

#### Setup 2: Dev Machine → PostgreSQL (For Local Development)

If you want to run backend locally AND access PostgreSQL on Coolify:

**Step 1: Create PostgreSQL Cloudflare Tunnel (on Coolify server)**

```bash
# SSH into Coolify server
ssh user@your-coolify-server

# Create tunnel config for PostgreSQL
sudo nano /etc/cloudflared/config.yml
```

**Add PostgreSQL to your Cloudflare Tunnel config:**
```yaml
tunnel: <your-tunnel-id>
credentials-file: /path/to/<tunnel-id>.json

ingress:
  # Backend HTTP traffic
  - hostname: coolify-backend.revui.app
    service: http://localhost:3000

  # PostgreSQL TCP traffic
  - hostname: postgres.revui.app
    service: tcp://localhost:5432

  # Catch-all
  - service: http_status:404
```

**Route the PostgreSQL hostname:**
```bash
cloudflared tunnel route dns <your-tunnel-id> postgres.revui.app
```

**Restart cloudflared:**
```bash
sudo systemctl restart cloudflared
```

**Step 2: Access PostgreSQL from Dev Machine**

```bash
# On your dev machine (install cloudflared first if needed)
# macOS: brew install cloudflare/cloudflare/cloudflared
# Linux: curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

# Start TCP proxy to PostgreSQL
cloudflared access tcp --hostname postgres.revui.app --url localhost:5432
```

**In your local backend .env:**
```env
DATABASE_URL="postgresql://revui:password@localhost:5432/revui?schema=public"
```

**Start local dev servers:**
```bash
npm run dev
```

---

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Development Machine                                         │
│                                                              │
│  ┌────────────────────┐         ┌────────────────────┐     │
│  │  Frontend (React)  │────────▶│  Browser           │     │
│  │  :5173            │         │  localhost:5173    │     │
│  └────────────────────┘         └────────────────────┘     │
│           │                                                  │
│           │ HTTP API Calls                                   │
│           ▼                                                  │
│  ┌────────────────────┐                                     │
│  │  Backend (NestJS)  │ ◀── Option A: Run locally          │
│  │  :3000            │                                      │
│  └────────────────────┘                                     │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            │ PostgreSQL Connection
            │ (192.168.1.100:54320)
            ▼
┌─────────────────────────────────────────────────────────────┐
│  Coolify Server (192.168.1.100)                             │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  Docker Network                                │         │
│  │                                                │         │
│  │  ┌─────────────────────┐                      │         │
│  │  │  revui-postgres     │ ◀── Option B:        │         │
│  │  │  PostgreSQL 14      │     Backend also     │         │
│  │  │  :5432              │     on Coolify       │         │
│  │  └─────────────────────┘                      │         │
│  │           ▲                                    │         │
│  │           │                                    │         │
│  │  ┌─────────────────────┐                      │         │
│  │  │  revui-backend      │ (Optional)           │         │
│  │  │  NestJS API         │                      │         │
│  │  │  :3000              │                      │         │
│  │  └─────────────────────┘                      │         │
│  │                                                │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘

Option A (Fastest Development):
- Frontend: localhost:5173
- Backend: localhost:3000
- Database: Coolify PostgreSQL

Option B (Production-like):
- Frontend: localhost:5173
- Backend: Coolify (http://192.168.1.100:3000)
- Database: Coolify PostgreSQL
```

## Prerequisites

### On Your Development Machine
- **Node.js** 20+ and **npm** 10+
- **Git**

### On Your Coolify Server
- **Coolify** installed and accessible
- Access to deploy services via Coolify dashboard

---

## Setup Option A: Coolify-Hosted Infrastructure (Recommended)

This is the recommended approach for development as it provides better separation and infrastructure management.

### 1. Deploy PostgreSQL on Coolify

**Via Coolify Dashboard:**

1. Navigate to your Coolify instance
2. Create a new **PostgreSQL** service:
   - **Service Name**: `revui-postgres`
   - **PostgreSQL Version**: 14 or higher
   - **Database Name**: `revui`
   - **Username**: `revui`
   - **Password**: Generate a secure password or use: `revui_dev_password`
   - **Port**: Default 5432 (Coolify will map this internally)

3. Note the connection details:
   - **Internal Host**: Usually `revui-postgres` (Docker network)
   - **Local Network Host**: Your Coolify server LAN IP (e.g., `192.168.1.100`)
   - **Port**: Check Coolify for the mapped external port (e.g., `54320`)

4. **Security Configuration (IMPORTANT):**

   **⚠️ DO NOT expose PostgreSQL to the public internet!**

   Choose based on your backend location:

   **Option A - Backend runs locally (your dev machine):**
   - PostgreSQL needs to be accessible on your **local network only**
   - In Coolify, expose PostgreSQL port to LAN (e.g., `0.0.0.0:54320` or bind to LAN IP)
   - Use firewall rules to restrict access to local network: `192.168.1.0/24`
   - **Never** open port 5432/54320 to `0.0.0.0` on public internet
   - Consider using SSH tunnel instead (see "SSH Tunnel Setup" below)

   **Option B - Backend runs on Coolify:**
   - PostgreSQL should **NOT** be exposed externally at all
   - Use internal Docker network hostname only: `revui-postgres:5432`
   - More secure - no external access needed
   - This is the **recommended approach** for production-like development

### SSH Tunnel Setup (Most Secure for Option A)

Instead of exposing PostgreSQL to your LAN, use a tunnel. Choose based on your setup:

#### Option A: Standard SSH Tunnel (Direct Connection)

Direct SSH connection from your dev machine to Coolify server:

```bash
# On your dev machine, create SSH tunnel to Coolify server
ssh -L 5432:localhost:5432 user@coolify-server-ip

# In another terminal, connect via localhost
# Update .env to use: DATABASE_URL="postgresql://revui:password@localhost:5432/revui"
```

**Connection Flow:**
```
Your Dev Machine → SSH (port 22) → Coolify Server → PostgreSQL
```

**Requirements:**
- SSH access to Coolify server
- Port 22 accessible from your dev machine
- Does NOT go through Cloudflare

---

#### Option B: Cloudflare Tunnel (If You Use Cloudflare)

If your Coolify server uses Cloudflare Tunnel (cloudflared), you can tunnel through Cloudflare:

**1. On Coolify Server (if not already set up):**
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel for PostgreSQL
cloudflared tunnel create revui-postgres-tunnel

# Route PostgreSQL through tunnel
cloudflared tunnel route dns revui-postgres-tunnel postgres.yourdomain.com
```

**2. On Your Dev Machine:**
```bash
# Install cloudflared locally
# macOS: brew install cloudflare/cloudflare/cloudflared
# Windows: Download from GitHub releases

# Connect via Cloudflare Access (if configured)
cloudflared access tcp --hostname postgres.yourdomain.com --url localhost:5432

# Or use cloudflared tunnel for direct connection
# Update .env: DATABASE_URL="postgresql://revui:password@localhost:5432/revui"
```

**Connection Flow:**
```
Your Dev Machine → Cloudflare Network → Coolify Server → PostgreSQL
```

**Advantages:**
- ✅ PostgreSQL never exposed publicly
- ✅ Works even if Coolify server behind NAT/firewall
- ✅ Can use Cloudflare Access for authentication
- ✅ Encrypted through Cloudflare network
- ✅ No need to open SSH port 22

**Requirements:**
- Cloudflare account with Tunnel access
- cloudflared installed on both machines
- Domain managed by Cloudflare

---

### Which Tunnel Should You Use?

**Use Standard SSH Tunnel if:**
- ✅ You have direct SSH access to Coolify server
- ✅ Simple setup, no additional tools needed
- ✅ Coolify server on same LAN or accessible IP

**Use Cloudflare Tunnel if:**
- ✅ Already using Cloudflare for your domain
- ✅ Coolify server behind NAT/firewall without port forwarding
- ✅ Want Zero Trust security with Cloudflare Access
- ✅ Need to access from multiple locations/networks

---

This way PostgreSQL never leaves the Coolify server, even on LAN.

### 2. Install Dependencies

```bash
cd revui-app
npm install
```

### 3. Configure Environment Variables

Create environment file for the backend:

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env` with your Coolify PostgreSQL connection:

```env
# Use your Coolify server IP and PostgreSQL port
DATABASE_URL="postgresql://revui:revui_dev_password@192.168.1.100:54320/revui?schema=public"

JWT_SECRET="your-secure-jwt-secret-change-this"
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```

**Replace:**
- `192.168.1.100` with your Coolify server IP
- `54320` with the PostgreSQL external port from Coolify
- `revui_dev_password` with the password you set in Coolify

### 4. Run Database Migrations

Apply the database schema with RLS policies:

```bash
# From the backend directory
cd apps/backend

# Generate Prisma client
npm run db:generate

# Option A: Use psql command (if you have PostgreSQL client installed)
psql "postgresql://revui:revui_dev_password@192.168.1.100:54320/revui" \
  -f prisma/migrations/001_init_multi_tenant.sql

# Option B: Use Coolify's PostgreSQL terminal (from Coolify dashboard)
# 1. Open Coolify dashboard
# 2. Navigate to revui-postgres service
# 3. Open Terminal
# 4. Run: psql -U revui -d revui
# 5. Copy/paste contents of 001_init_multi_tenant.sql
```

### 5a. Run Backend Locally (Quick Development)

```bash
# Terminal 1 - Backend (runs on http://localhost:3000)
cd apps/backend
npm run dev

# Terminal 2 - Frontend (runs on http://localhost:5173)
cd apps/frontend
npm run dev
```

**Advantages:**
- Fast hot-reload during development
- Easy debugging with local logs
- Instant code changes

### 5b. Deploy Backend to Coolify (Production-like)

**Via Coolify Dashboard:**

1. Create a new **Node.js** service:
   - **Service Name**: `revui-backend`
   - **Repository**: Link your Git repository
   - **Branch**: `main` or your development branch
   - **Build Command**: `npm install && npm run build --workspace=apps/backend`
   - **Start Command**: `npm run start:prod --workspace=apps/backend`
   - **Port**: 3000
   - **Working Directory**: `/`

2. Set environment variables in Coolify:
   ```env
   DATABASE_URL=postgresql://revui:revui_dev_password@revui-postgres:5432/revui?schema=public
   JWT_SECRET=your-secure-jwt-secret-change-this
   CORS_ORIGIN=http://localhost:5173
   NODE_ENV=production
   ```

   **Note:** Use internal Docker network hostname `revui-postgres` when backend is on Coolify

3. Deploy and note the backend URL (e.g., `http://192.168.1.100:3000`)

4. Update frontend API configuration:
   ```bash
   # apps/frontend/src/services/api.ts
   # Change API_BASE_URL to your Coolify backend URL
   const API_BASE_URL = 'http://192.168.1.100:3000';
   ```

5. Run frontend locally:
   ```bash
   cd apps/frontend
   npm run dev
   ```

**Advantages:**
- Production-like environment
- Tests containerized deployment
- Backend independent of dev machine

---

## Setup Option B: Fully Local (Fallback)

If you prefer to run everything locally without Coolify:

### 1. Install PostgreSQL Locally

```bash
# macOS with Homebrew
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-14
sudo systemctl start postgresql

# Windows
# Download and install from postgresql.org
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE revui;
CREATE USER revui WITH PASSWORD 'revui';
GRANT ALL PRIVILEGES ON DATABASE revui TO revui;
\q
```

### 3. Configure Environment

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://revui:revui@localhost:5432/revui?schema=public"
JWT_SECRET="your-secure-jwt-secret-change-this"
CORS_ORIGIN="http://localhost:5173"
```

### 4. Run Migrations and Start Services

```bash
# Generate Prisma client
cd apps/backend
npm run db:generate

# Run migration
psql -U revui -d revui -f prisma/migrations/001_init_multi_tenant.sql

# Start both services (from root)
cd ../..
npm run dev
```

---

## Testing the Application

### 1. Register an Organization

Navigate to http://localhost:5173/register and fill out the registration form:

- **Organization Name**: Your Company Name
- **Admin Name**: Your Name
- **Admin Email**: your.email@example.com
- **Industry**: (optional)
- **Company Size**: (optional)

Click "Register Organization"

### 2. Verify Email

Since email sending is not configured in development, check the backend console logs for the verification link:

```
📧 Email would be sent:
To: your.email@example.com
Subject: Welcome to Revui - Verify your email
Verification Link: http://localhost:5173/verify-email?token=xxx
```

Copy the verification link and open it in your browser.

### 3. Complete Onboarding

After email verification, you'll be redirected to the onboarding checklist where you can:

- Mark tasks as complete
- Track your setup progress
- Dismiss the checklist when ready

## Database Management

### Open Prisma Studio

Visual database browser:

```bash
npm run db:studio
```

### Reset Database

```bash
cd apps/backend
npx prisma migrate reset
```

### Create New Migration

```bash
cd apps/backend
npx prisma migrate dev --name migration_name
```

## Testing Multi-Tenant Isolation

To verify RLS is working:

1. Register two different organizations
2. Use a database client to check that data is isolated:

```sql
-- Set tenant context
SET app.current_tenant_id = 'tenant-uuid-here';

-- Now queries will only return data for this tenant
SELECT * FROM users;
```

## Troubleshooting

### Coolify-Specific Issues

**Cannot connect to PostgreSQL from dev machine:**
- Check Coolify PostgreSQL service is running (green status)
- Verify PostgreSQL port is exposed externally in Coolify settings
- Test connection: `psql "postgresql://revui:password@COOLIFY_IP:PORT/revui" -c "SELECT 1"`
- Check firewall rules on Coolify server
- Ensure Docker network allows external connections

**Backend on Coolify cannot connect to PostgreSQL:**
- Use internal Docker network hostname (e.g., `revui-postgres:5432`)
- Verify both services are in the same Coolify project/network
- Check Coolify logs for connection errors
- Test from backend container: `nc -zv revui-postgres 5432`

**Frontend cannot reach Coolify backend:**
- Update `apps/frontend/src/services/api.ts` with correct backend URL
- Check CORS settings in backend (`CORS_ORIGIN` environment variable)
- Verify backend is accessible: `curl http://COOLIFY_IP:3000/health`
- Check Coolify backend service logs for errors

### Database Connection Errors

**For Coolify-hosted PostgreSQL:**
- Verify PostgreSQL service is running in Coolify dashboard
- Check connection string in `.env` matches Coolify settings
- Test connection: `psql "postgresql://user:pass@host:port/db" -c "SELECT version()"`
- Check Coolify logs for PostgreSQL errors

**For local PostgreSQL:**
- Verify PostgreSQL is running: `pg_isready`
- Check connection string in `.env`
- Ensure database user has proper permissions

### Port Already in Use

- Backend (3000): Check if another service is using port 3000
  - Find process: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
- Frontend (5173): Check if another Vite server is running
  - Find process: `lsof -i :5173` (macOS/Linux)

### RLS Errors

If you see "no tenant context" errors:

- Ensure the tenant context middleware is applied
- Check that JWT tokens include `tenantId` claim
- Verify RLS policies are applied: Connect to database and run `\d+ users`
- Test RLS: `SET app.current_tenant_id = 'some-uuid'; SELECT * FROM users;`

### Migration Issues

**Prisma migration fails:**
- Ensure database connection is working
- Check if migration was already applied: `SELECT * FROM _prisma_migrations;`
- Try manual migration: `psql "connection-string" -f prisma/migrations/001_init_multi_tenant.sql`
- If using Coolify, can run migrations via Coolify PostgreSQL terminal

**RLS policies not working:**
- Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'users';`
- Check session variable is set: `SHOW app.current_tenant_id;`
- Ensure tenant context middleware is running before database queries

## Project Structure

```
revui-app/
├── apps/
│   ├── backend/           # NestJS API server
│   │   ├── src/
│   │   │   ├── common/    # Shared services, middleware, filters
│   │   │   ├── modules/   # Feature modules (auth, organizations, etc.)
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── frontend/          # React + Vite application
│       ├── src/
│       │   ├── pages/     # Page components
│       │   ├── components/# Reusable components
│       │   ├── services/  # API client
│       │   └── App.tsx
│       └── package.json
│
├── packages/              # Shared packages (future)
├── package.json           # Root package.json with workspaces
└── turbo.json            # Turborepo configuration
```

## API Endpoints

### Organizations

- `POST /api/v1/organizations/register` - Register new organization
- `GET /api/v1/organizations/verify-email?token=xxx` - Verify email
- `GET /api/v1/organizations/:tenantId` - Get organization details

## Next Steps

After completing the setup:

1. **Story 1.2**: Implement magic link token generation for task invitations
2. **Story 1.3**: Add user invitation and role assignment
3. **Story 1.4**: Set up recording storage infrastructure
4. **Story 2.1+**: Begin implementing core recording experience

## Security Notes

⚠️ **Important Security Considerations:**

### Database Security

**PostgreSQL Exposure:**
- ✅ **SECURE**: Use SSH tunnel from dev machine to Coolify server
- ✅ **SECURE**: Backend on Coolify → PostgreSQL internal network only
- ⚠️ **ACCEPTABLE**: PostgreSQL exposed to LAN only (192.168.1.0/24) with firewall
- ❌ **NEVER**: PostgreSQL exposed to public internet (0.0.0.0:5432)

**Quick Security Check:**
```bash
# Check if PostgreSQL is publicly accessible (SHOULD TIMEOUT)
timeout 5 psql "postgresql://revui:password@YOUR_PUBLIC_IP:5432/revui" -c "SELECT 1"
# Expected: Connection timeout or refused

# Check if PostgreSQL is accessible from LAN (SHOULD WORK if needed)
psql "postgresql://revui:password@192.168.1.100:54320/revui" -c "SELECT 1"
# Expected: Returns (1 row) if intentionally exposed to LAN
```

**Recommended Approaches by Priority:**
1. **Most Secure**: SSH tunnel + internal PostgreSQL
2. **Secure**: Backend on Coolify + internal PostgreSQL (no external exposure)
3. **Acceptable**: LAN-only exposure with firewall rules
4. **Never**: Public internet exposure

### Application Security

1. **RLS Policies**: All multi-tenant tables MUST have RLS enabled with tenant_id policies
2. **Magic Links**: Always use SHA-256 hashing for token storage
3. **JWT Secrets**: Use strong, unique secrets in production
4. **Email Verification**: Enforce email verification before full platform access
5. **Audit Logs**: Review audit logs regularly for suspicious activity
6. **Environment Variables**: Never commit `.env` files to git
7. **CORS**: Restrict CORS_ORIGIN to specific domains, never use `*`

## Support

For issues or questions:

- Check documentation in `docs/` directory
- Review technical specifications in `docs/tech-spec-epic-1.md`
- See solution architecture in `docs/solution-architecture.md`
