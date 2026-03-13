# Phase 5: Cloud Platform & API Authentication

## Overview

Transform Afterburn from a local-only CLI tool into a cloud-enabled platform with:
- Marketing website (product info, installation guide)
- User authentication & dashboard
- API key management
- Cloud report storage & sync
- Team collaboration features

**Reference Architecture**: Similar to LangFuse, PostHog, Sentry

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AFTERBURN CLOUD                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Website    │    │  Dashboard   │    │   API        │      │
│  │  (Marketing) │    │  (App)       │    │   Server     │      │
│  │              │    │              │    │              │      │
│  │ - Landing    │    │ - Sessions   │    │ - Auth       │      │
│  │ - Docs       │    │ - Reports    │    │ - Reports    │      │
│  │ - Pricing    │    │ - Analytics  │    │ - API Keys   │      │
│  │ - Install    │    │ - Settings   │    │ - Sync       │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                   │              │
│                              └───────┬───────────┘              │
│                                      │                          │
│                            ┌─────────▼─────────┐                │
│                            │     Database      │                │
│                            │   (PostgreSQL)    │                │
│                            │                   │                │
│                            │ - users           │                │
│                            │ - api_keys        │                │
│                            │ - projects        │                │
│                            │ - sessions        │                │
│                            │ - reports         │                │
│                            └───────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS API
                                    │
┌───────────────────────────────────▼─────────────────────────────┐
│                      LOCAL CLI (afterburn)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Config     │    │   Reporter   │    │   Sync       │      │
│  │              │    │              │    │   Client     │      │
│  │ - API Key    │    │ - Local      │    │              │      │
│  │ - Project ID │    │ - Cloud      │    │ - Upload     │      │
│  │ - Mode       │    │   (optional) │    │ - Validate   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
│  Mode: LOCAL (default) | CLOUD | HYBRID                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## User Flow

### 1. Discovery & Signup
```
User visits afterburn.dev
    → Reads about features
    → Clicks "Get Started"
    → Signs up (email/GitHub)
    → Creates organization
    → Gets API key
```

### 2. Installation & Setup
```
User installs CLI:
    $ npm install -g afterburn

User configures API key:
    $ afterburn login
    → Prompts for API key
    → Validates with server
    → Stores in ~/.afterburnrc or env

Or via environment:
    $ export AFTERBURN_API_KEY=ab_xxxxx
```

### 3. Usage (Cloud Mode)
```
User runs afterburn:
    $ afterburn --explain

Flow:
    1. CLI checks for API key
    2. Validates API key with server (cached for 24h)
    3. If valid → generates report
    4. Uploads report to cloud (async)
    5. Saves local copy (optional)

If API key invalid/expired:
    → Shows error with link to dashboard
    → Falls back to local-only mode (if configured)
```

### 4. Dashboard Usage
```
User logs into dashboard:
    → Sees all sessions across projects
    → Views AI summaries, trends
    → Manages API keys
    → Invites team members
    → Configures notifications
```

## Database Schema

```sql
-- Users & Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'free', -- free, pro, team, enterprise
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL, -- bcrypt hash of key
    key_prefix VARCHAR(10) NOT NULL, -- ab_xxxx for display
    scopes TEXT[] DEFAULT '{}', -- permissions
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    repo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Sessions & Reports
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    api_key_id UUID REFERENCES api_keys(id),

    -- Session metadata
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,

    -- Git info
    branch VARCHAR(255),
    commit_hash VARCHAR(40),
    author VARCHAR(255),

    -- Stats
    files_changed INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    commits INTEGER DEFAULT 0,

    -- Claude stats
    total_tokens INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10, 4),
    model VARCHAR(100),

    -- Actions
    actions_count INTEGER DEFAULT 0,

    -- AI Summary
    ai_summary TEXT,
    ai_type VARCHAR(50), -- Feature, Bug Fix, Refactor, etc.

    -- Raw data
    report_markdown TEXT,
    actions_json JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_project ON sessions(project_id);
CREATE INDEX idx_sessions_started ON sessions(started_at);

-- Usage tracking (for billing)
CREATE TABLE usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    month DATE NOT NULL, -- First day of month
    sessions_count INTEGER DEFAULT 0,
    ai_tokens_used INTEGER DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    UNIQUE(organization_id, month)
);
```

## API Endpoints

### Authentication
```
POST /api/v1/auth/validate
  Headers: Authorization: Bearer ab_xxxxx
  Response: { valid: true, organization: {...}, project: {...} }

POST /api/v1/auth/refresh
  Refresh cached validation
```

### Sessions
```
POST /api/v1/sessions
  Upload a new session report
  Body: { report, actions, stats, aiSummary }

GET /api/v1/sessions
  List sessions for project
  Query: ?project=xxx&limit=50&offset=0

GET /api/v1/sessions/:id
  Get session details
```

### Projects
```
GET /api/v1/projects
  List projects for organization

POST /api/v1/projects
  Create new project

GET /api/v1/projects/:id/stats
  Get project statistics
```

### API Keys
```
GET /api/v1/api-keys
  List API keys (masked)

POST /api/v1/api-keys
  Create new API key
  Response: { key: "ab_xxxxx...", id: "..." } // Full key shown once

DELETE /api/v1/api-keys/:id
  Revoke API key
```

## Sprint Breakdown

### Sprint 16: API Server Foundation
**Goal**: Basic API server with authentication

Tasks:
- [ ] Set up API server (Node.js + Hono/Express)
- [ ] Database setup (PostgreSQL + Drizzle ORM)
- [ ] User authentication (email + OAuth)
- [ ] API key generation & validation
- [ ] Basic rate limiting

Deliverables:
- API server running on cloud
- `/auth/validate` endpoint working
- API keys can be created via direct DB

### Sprint 17: CLI Cloud Integration
**Goal**: CLI validates API key and uploads reports

Tasks:
- [ ] Add `--api-key` flag and env var support
- [ ] API key validation with caching
- [ ] Session upload to cloud
- [ ] Graceful fallback to local mode
- [ ] `afterburn login` command

Deliverables:
- CLI works with cloud API
- Reports uploaded automatically
- Local mode still works without API key

### Sprint 18: Dashboard MVP
**Goal**: Basic web dashboard for viewing sessions

Tasks:
- [ ] Dashboard app (Next.js)
- [ ] Authentication UI (login/signup)
- [ ] Sessions list view
- [ ] Session detail view
- [ ] Basic filtering & search

Deliverables:
- Users can sign up and log in
- View sessions in dashboard
- Search and filter sessions

### Sprint 19: API Key Management
**Goal**: Full API key management in dashboard

Tasks:
- [ ] API keys page in dashboard
- [ ] Create new API key (with copy once)
- [ ] Revoke API key
- [ ] View API key usage
- [ ] Key naming & organization

Deliverables:
- Users can manage API keys in dashboard
- Full self-service key management

### Sprint 20: Marketing Website
**Goal**: Public website for Afterburn

Tasks:
- [ ] Landing page with product info
- [ ] Features page
- [ ] Documentation / Getting Started
- [ ] Pricing page (free tier + paid plans)
- [ ] Blog setup

Deliverables:
- afterburn.dev live
- Clear installation instructions
- Pricing visible

### Sprint 21: Team Features
**Goal**: Multi-user organizations

Tasks:
- [ ] Organization management
- [ ] Invite team members
- [ ] Role-based permissions
- [ ] Shared projects
- [ ] Activity feed

Deliverables:
- Teams can collaborate
- Proper access control

### Sprint 22: Analytics & Insights
**Goal**: Usage analytics and insights

Tasks:
- [ ] Usage charts (sessions over time)
- [ ] Cost tracking
- [ ] Productivity metrics
- [ ] Export reports
- [ ] Email digests

Deliverables:
- Rich analytics dashboard
- Actionable insights

## Tech Stack

### Full-Stack Application
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **API**: Next.js API Routes
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle
- **Auth**: NextAuth.js (Auth.js v5)
- **State**: TanStack Query
- **Hosting**: Vercel

### Infrastructure
- Database: Neon (serverless Postgres)
- File Storage: S3/R2 (for large reports, if needed)
- CDN: Vercel Edge
- Monitoring: Vercel Analytics
- Error Tracking: Sentry

## Configuration

### CLI Config (`.afterburnrc`)
```json
{
  "cloud": {
    "enabled": true,
    "apiKey": "env:AFTERBURN_API_KEY",
    "projectId": "auto", // auto-detect from git remote
    "syncMode": "async", // async | sync | off
    "fallbackToLocal": true
  },
  "local": {
    "enabled": true,
    "outputDir": ".afterburn"
  }
}
```

### Environment Variables
```bash
# Required for cloud mode
AFTERBURN_API_KEY=ab_xxxxxxxxxxxxxxxx

# Optional
AFTERBURN_PROJECT_ID=proj_xxxxx
AFTERBURN_ORG_ID=org_xxxxx
AFTERBURN_API_URL=https://api.afterburn.dev # default
```

## Pricing Model (Draft)

### Free Tier
- 100 sessions/month
- 1 project
- 7-day retention
- Community support

### Pro ($19/month)
- Unlimited sessions
- 10 projects
- 90-day retention
- Email support
- Team features (5 members)

### Team ($49/month)
- Everything in Pro
- Unlimited projects
- 1-year retention
- Priority support
- Unlimited team members
- SSO (SAML)
- API access

### Enterprise (Custom)
- Self-hosted option
- Custom retention
- SLA
- Dedicated support

## Security Considerations

1. **API Key Security**
   - Keys are hashed (bcrypt) in database
   - Only shown once on creation
   - Prefix visible for identification (ab_xxxx)
   - Scoped permissions

2. **Data Privacy**
   - Code diffs NOT stored by default
   - Only summaries and metadata
   - Optional: full report storage (encrypted)
   - GDPR compliant

3. **Rate Limiting**
   - Per API key limits
   - Burst protection
   - DDoS mitigation (Cloudflare)

4. **Audit Logging**
   - All API key usage logged
   - Admin actions tracked
   - Exportable audit trail

## Success Metrics

1. **Adoption**
   - Signups per week
   - Active API keys
   - Sessions uploaded

2. **Engagement**
   - Dashboard DAU/WAU
   - Session views
   - Feature usage

3. **Retention**
   - Week 1 retention
   - Month 1 retention
   - Churn rate

4. **Revenue** (post-launch)
   - MRR
   - Conversion rate (free → paid)
   - ARPU
