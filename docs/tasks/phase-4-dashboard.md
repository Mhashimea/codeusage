# Phase 4: Teams & Dashboard

**Duration:** Sprints 13-16
**Goal:** Web dashboard, team features, historical trending, GitHub Action, v1.0 launch.

---

## Sprint 13: Dashboard Foundation

### 13.1 Technology Selection
- [ ] **13.1.1** Choose frontend framework: Next.js (recommended for Vercel deploy)
- [ ] **13.1.2** Choose database: PostgreSQL (Supabase or Neon for managed)
- [ ] **13.1.3** Choose authentication: NextAuth.js or Clerk
- [ ] **13.1.4** Choose hosting: Vercel
- [ ] **13.1.5** Choose styling: Tailwind CSS
- [ ] **13.1.6** Set up monorepo structure (CLI + Dashboard)

### 13.2 Project Setup
- [ ] **13.2.1** Initialize Next.js project in `/dashboard` directory
- [ ] **13.2.2** Configure TypeScript, ESLint, Prettier
- [ ] **13.2.3** Set up Tailwind CSS
- [ ] **13.2.4** Configure database connection
- [ ] **13.2.5** Set up authentication provider
- [ ] **13.2.6** Create basic layout (header, sidebar, main content)
- [ ] **13.2.7** Deploy initial version to Vercel

### 13.3 Database Schema Design
- [ ] **13.3.1** Design `users` table:
  - id, email, name, created_at, license_key, subscription_status
- [ ] **13.3.2** Design `reports` table:
  - id, user_id, project_name, created_at, session_duration
  - files_changed, lines_added, lines_removed
  - error_count, warning_count, info_count
  - llm_summary (text), full_report (JSON)
- [ ] **13.3.3** Design `projects` table:
  - id, user_id, name, repo_url, created_at
- [ ] **13.3.4** Design `teams` table:
  - id, name, owner_id, created_at
- [ ] **13.3.5** Design `team_members` table:
  - team_id, user_id, role, joined_at
- [ ] **13.3.6** Create migrations
- [ ] **13.3.7** Seed development data

### 13.4 Authentication Flow
- [ ] **13.4.1** Implement sign up with email
- [ ] **13.4.2** Implement sign in with email
- [ ] **13.4.3** Implement GitHub OAuth (optional)
- [ ] **13.4.4** Implement password reset
- [ ] **13.4.5** Implement email verification
- [ ] **13.4.6** Link authentication to license key
- [ ] **13.4.7** Redirect to dashboard after auth

### 13.5 CLI-to-Dashboard Sync
- [ ] **13.5.1** Add `--sync` flag to CLI (upload report to dashboard)
- [ ] **13.5.2** Implement `/api/reports` endpoint (receive report)
- [ ] **13.5.3** Authenticate CLI requests with license key
- [ ] **13.5.4** Store report in database
- [ ] **13.5.5** Handle offline mode (queue for later sync)
- [ ] **13.5.6** Add `afterburn sync` command (manual sync)

### 13.6 Local Build & Test
- [ ] **13.6.1** Run `npm run build` (CLI) — verify TypeScript compiles
- [ ] **13.6.2** Run `npm run build` (Dashboard) — verify Next.js builds
- [ ] **13.6.3** Run `npm link` — update local CLI installation
- [ ] **13.6.4** Run dashboard locally (`npm run dev` in dashboard dir)
- [ ] **13.6.5** Test sign up / sign in flow locally
- [ ] **13.6.6** Test `afterburn ./ --sync` — verify report uploads to local dashboard
- [ ] **13.6.7** Verify report appears in dashboard UI
- [ ] **13.6.8** Deploy to Vercel staging and test end-to-end

**Sprint 13 Deliverable:** Dashboard deployed with auth, database, and CLI sync working.

---

## Sprint 14: Report Dashboard & Visualization

### 14.1 Reports List View
- [ ] **14.1.1** Build reports list page (`/dashboard/reports`)
- [ ] **14.1.2** Display: project name, date, file count, error/warning counts
- [ ] **14.1.3** Add sorting: by date, by errors, by project
- [ ] **14.1.4** Add filtering: by project, by date range, by severity
- [ ] **14.1.5** Add pagination (20 reports per page)
- [ ] **14.1.6** Add search by project name

### 14.2 Report Detail View
- [ ] **14.2.1** Build report detail page (`/dashboard/reports/[id]`)
- [ ] **14.2.2** Display session summary section
- [ ] **14.2.3** Display risk report with expandable findings
- [ ] **14.2.4** Display dependency audit section
- [ ] **14.2.5** Display file changes table
- [ ] **14.2.6** Display LLM summary (if present)
- [ ] **14.2.7** Add "Download as Markdown" button
- [ ] **14.2.8** Add "Share Report" button (generate link)

### 14.3 Statistics Dashboard
- [ ] **14.3.1** Build overview dashboard (`/dashboard`)
- [ ] **14.3.2** Show total reports this week/month
- [ ] **14.3.3** Show total errors/warnings trend
- [ ] **14.3.4** Show most common rule violations (pie chart)
- [ ] **14.3.5** Show lines of code analyzed (running total)
- [ ] **14.3.6** Show projects by activity level

### 14.4 Visualization Components
- [ ] **14.4.1** Choose charting library: Recharts or Chart.js
- [ ] **14.4.2** Build line chart component (trends over time)
- [ ] **14.4.3** Build pie chart component (rule distribution)
- [ ] **14.4.4** Build bar chart component (errors by project)
- [ ] **14.4.5** Build heatmap component (activity calendar)
- [ ] **14.4.6** Make all charts responsive

### 14.5 Report Comparison
- [ ] **14.5.1** Build compare view (`/dashboard/compare`)
- [ ] **14.5.2** Select two reports to compare
- [ ] **14.5.3** Show diff in metrics (errors increased/decreased)
- [ ] **14.5.4** Highlight new vs resolved issues
- [ ] **14.5.5** Show trend direction indicators

### 14.6 Local Build & Test
- [ ] **14.6.1** Run `npm run build` (Dashboard) — verify Next.js builds
- [ ] **14.6.2** Run dashboard locally (`npm run dev`)
- [ ] **14.6.3** Sync 10+ reports from CLI to local dashboard
- [ ] **14.6.4** Test reports list view: sorting, filtering, pagination
- [ ] **14.6.5** Test report detail view with all sections
- [ ] **14.6.6** Test statistics dashboard with real data
- [ ] **14.6.7** Test charts render correctly with various data sizes
- [ ] **14.6.8** Test report comparison feature
- [ ] **14.6.9** Deploy to Vercel staging and verify

**Sprint 14 Deliverable:** Full report dashboard with visualizations.

---

## Sprint 15: Historical Trends & Team Features

### 15.1 Historical Trend Analysis
- [ ] **15.1.1** Build trends page (`/dashboard/trends`)
- [ ] **15.1.2** Show error count over time (line chart)
- [ ] **15.1.3** Show warning count over time (line chart)
- [ ] **15.1.4** Show code velocity (lines changed per week)
- [ ] **15.1.5** Show dependency growth over time
- [ ] **15.1.6** Calculate "AI reliance score" (heuristic based on patterns)
- [ ] **15.1.7** Show quality score trend (composite metric)
- [ ] **15.1.8** Add date range selector (7d, 30d, 90d, 1y)

### 15.2 Rule Analytics
- [ ] **15.2.1** Build rules analytics page (`/dashboard/rules`)
- [ ] **15.2.2** Show most frequently triggered rules
- [ ] **15.2.3** Show rules by severity distribution
- [ ] **15.2.4** Show rule trends over time (improving or worsening)
- [ ] **15.2.5** Identify recurring issues by file/directory
- [ ] **15.2.6** Suggest focus areas based on patterns

### 15.3 Team Management
- [ ] **15.3.1** Build team creation flow (`/dashboard/teams/new`)
- [ ] **15.3.2** Build team settings page (`/dashboard/teams/[id]/settings`)
- [ ] **15.3.3** Implement invite team members (email invite)
- [ ] **15.3.4** Implement accept team invite flow
- [ ] **15.3.5** Implement team roles: owner, admin, member
- [ ] **15.3.6** Implement remove team member
- [ ] **15.3.7** Implement transfer team ownership
- [ ] **15.3.8** Implement delete team

### 15.4 Team Dashboard
- [ ] **15.4.1** Build team overview page (`/dashboard/teams/[id]`)
- [ ] **15.4.2** Show aggregated team statistics
- [ ] **15.4.3** Show reports from all team members
- [ ] **15.4.4** Show team activity feed
- [ ] **15.4.5** Show leaderboard (optional, gamification)
- [ ] **15.4.6** Filter reports by team member

### 15.5 Shared Projects
- [ ] **15.5.1** Allow projects to be shared within team
- [ ] **15.5.2** Aggregate reports by project across team members
- [ ] **15.5.3** Show project-level trends
- [ ] **15.5.4** Configure project-level rule settings
- [ ] **15.5.5** Set up notifications for project issues

### 15.6 Notifications
- [ ] **15.6.1** Implement in-app notifications
- [ ] **15.6.2** Notify on: new team invite, report with errors
- [ ] **15.6.3** Implement email notifications (configurable)
- [ ] **15.6.4** Build notification preferences page
- [ ] **15.6.5** Add notification bell in header

### 15.7 Local Build & Test
- [ ] **15.7.1** Run `npm run build` (Dashboard) — verify Next.js builds
- [ ] **15.7.2** Run dashboard locally (`npm run dev`)
- [ ] **15.7.3** Test trends page with 30+ days of report history
- [ ] **15.7.4** Test rule analytics with real data
- [ ] **15.7.5** Test team creation and invite flow
- [ ] **15.7.6** Test team member acceptance flow (use second account)
- [ ] **15.7.7** Test team dashboard with multiple members' reports
- [ ] **15.7.8** Test shared project functionality
- [ ] **15.7.9** Test notification system (in-app and email)
- [ ] **15.7.10** Deploy to Vercel staging and verify team features

**Sprint 15 Deliverable:** Historical trends and team collaboration features complete.

---

## Sprint 16: GitHub Action & v1.0 Launch

### 16.1 GitHub Action Development
- [ ] **16.1.1** Create GitHub Action repository (`afterburn-action`)
- [ ] **16.1.2** Define action.yml with inputs:
  - `path`: directory to analyze
  - `fail-on-errors`: boolean
  - `license-key`: secret
  - `explain`: boolean
- [ ] **16.1.3** Implement action logic (run afterburn CLI)
- [ ] **16.1.4** Output results as GitHub Action output
- [ ] **16.1.5** Post summary to PR as comment
- [ ] **16.1.6** Add status check integration
- [ ] **16.1.7** Publish to GitHub Marketplace

### 16.2 GitHub Action Features
- [ ] **16.2.1** Auto-detect base branch for diff comparison
- [ ] **16.2.2** Only analyze changed files in PR
- [ ] **16.2.3** Show inline annotations on PR files
- [ ] **16.2.4** Create collapsible summary comment
- [ ] **16.2.5** Link to full report in dashboard (if synced)
- [ ] **16.2.6** Support monorepo (multiple paths)

### 16.3 CI/CD Documentation
- [ ] **16.3.1** Write GitHub Actions setup guide
- [ ] **16.3.2** Write GitLab CI setup guide
- [ ] **16.3.3** Write CircleCI setup guide
- [ ] **16.3.4** Write Jenkins setup guide
- [ ] **16.3.5** Add examples to repository

### 16.4 Enterprise Features (Preparation)
- [ ] **16.4.1** Design org-wide compliance report format
- [ ] **16.4.2** Design audit trail schema
- [ ] **16.4.3** Research SSO/SAML integration options
- [ ] **16.4.4** Create enterprise tier pricing structure
- [ ] **16.4.5** Build "Contact Sales" flow on website

### 16.5 Local Build & Test (Final)
- [ ] **16.5.1** Run `npm run build` (CLI) — verify TypeScript compiles
- [ ] **16.5.2** Run `npm run build` (Dashboard) — verify Next.js builds
- [ ] **16.5.3** Run `npm run test` — verify all unit tests pass
- [ ] **16.5.4** Run `npm link` — update local CLI installation
- [ ] **16.5.5** Test GitHub Action locally using `act` tool
- [ ] **16.5.6** Test GitHub Action on real PR in test repository
- [ ] **16.5.7** Full regression test: CLI on 5+ real projects
- [ ] **16.5.8** Full regression test: Dashboard all features
- [ ] **16.5.9** Test complete flow: install CLI → analyze → sync → view in dashboard
- [ ] **16.5.10** Test on fresh machine / new user simulation

### 16.6 Final Polish
- [ ] **16.6.1** Full UI/UX review and polish
- [ ] **16.6.2** Accessibility audit (a11y)
- [ ] **16.6.3** Performance audit (Lighthouse)
- [ ] **16.6.4** Security audit (OWASP basics)
- [ ] **16.6.5** Cross-browser testing
- [ ] **16.6.6** Mobile responsiveness check

### 16.7 Documentation & Marketing
- [ ] **16.7.1** Complete README with all features
- [ ] **16.7.2** Write getting started guide
- [ ] **16.7.3** Write configuration reference
- [ ] **16.7.4** Write rule reference (all 10 rules documented)
- [ ] **16.7.5** Write API reference (if applicable)
- [ ] **16.7.6** Create demo video
- [ ] **16.7.7** Prepare Product Hunt launch
- [ ] **16.7.8** Prepare social media announcements

### 16.8 v1.0.0 Release
- [ ] **16.8.1** Update version to 1.0.0
- [ ] **16.8.2** Final regression test
- [ ] **16.8.3** Publish CLI to npm
- [ ] **16.8.4** Publish GitHub Action to Marketplace
- [ ] **16.8.5** Deploy dashboard to production
- [ ] **16.8.6** Create GitHub release with changelog
- [ ] **16.8.7** Launch on Product Hunt
- [ ] **16.8.8** Announce on Twitter/X, LinkedIn, dev communities
- [ ] **16.8.9** Monitor for launch issues
- [ ] **16.8.10** Celebrate! 🎉

**Sprint 16 Deliverable:** v1.0.0 launched with GitHub Action and full dashboard.

---

## Phase 4 Completion Checklist

- [ ] Web dashboard deployed and functional
- [ ] User authentication working
- [ ] Reports synced from CLI to dashboard
- [ ] Historical trend analysis working
- [ ] Team creation and management working
- [ ] Team sharing and collaboration working
- [ ] GitHub Action published to Marketplace
- [ ] CI/CD documentation complete
- [ ] v1.0.0 published to npm
- [ ] Product Hunt launch completed
- [ ] All documentation complete

---

## Post-v1.0 Roadmap Items

### Near-term (v1.1)
- [ ] VS Code extension
- [ ] Cursor/Copilot plugin integration
- [ ] Custom rule authoring
- [ ] More LLM providers (Google Gemini, Azure OpenAI)

### Medium-term (v1.2+)
- [ ] More languages (Go, Rust, Java, C#)
- [ ] IDE inline annotations
- [ ] Slack/Discord integrations
- [ ] Jira/Linear integration

### Enterprise (v2.0)
- [ ] SSO/SAML authentication
- [ ] Org-wide compliance reporting
- [ ] Audit trails
- [ ] Policy enforcement
- [ ] Custom deployment options
- [ ] SLA support

### Experimental
- [ ] MCP Server implementation
- [ ] AI agent integration
- [ ] Auto-fix suggestions
- [ ] Real-time collaboration

---

## Success Criteria for v1.0

| Metric | Target |
|--------|--------|
| npm installs | 500+ in first month |
| GitHub stars | 200+ |
| Pro subscribers | 20+ |
| Dashboard users | 100+ |
| GitHub Action installs | 50+ |
| Critical bugs | 0 |
| User satisfaction | 4+ star average |
