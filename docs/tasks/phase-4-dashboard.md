# Phase 4: Afterburn Studio (Local Dashboard)

**Duration:** Sprints 13-16
**Goal:** Local `afterburn studio` command, session comparison, GitHub Action, v1.0 launch.

**Architecture Decision:** Instead of a cloud-based dashboard requiring PostgreSQL, authentication, and deployment, we chose a local-first approach with `afterburn studio` that reads directly from the `.afterburn` folder. This provides instant value without setup complexity.

---

## Sprint 13: Studio Foundation

### 13.1 Core Studio Server ✅
- [x] **13.1.1** Create Express server in `/src/studio/server.ts`
- [x] **13.1.2** Read sessions from `.afterburn` folder
- [x] **13.1.3** Parse markdown reports into structured data
- [x] **13.1.4** Convert markdown to HTML using `marked`
- [x] **13.1.5** Auto-open browser on studio launch

### 13.2 Studio API Endpoints ✅
- [x] **13.2.1** `/api/sessions` - List all sessions with dates
- [x] **13.2.2** `/api/sessions/:date/:filename` - Get session details (markdown + HTML + metadata)
- [x] **13.2.3** `/api/stats` - Aggregate stats (total sessions, errors, warnings, hallucinated)

### 13.3 Studio CLI Command ✅
- [x] **13.3.1** Add `afterburn studio` command to CLI
- [x] **13.3.2** Add `--port` option (default: 3333)
- [x] **13.3.3** Add `--path` option for project directory
- [x] **13.3.4** Verify `.afterburn` folder exists before starting
- [x] **13.3.5** Display helpful message if no sessions found

### 13.4 Studio UI Foundation ✅
- [x] **13.4.1** Single-file HTML dashboard (embedded CSS/JS)
- [x] **13.4.2** Sidebar with session list grouped by date
- [x] **13.4.3** Stats cards (sessions, errors, warnings, hallucinated)
- [x] **13.4.4** Main content area for selected session
- [x] **13.4.5** Rendered/Markdown view toggle
- [x] **13.4.6** Summary cards for selected session (files, lines added/removed, commits)
- [x] **13.4.7** Dark theme matching Afterburn branding

### 13.5 Local Build & Test
- [x] **13.5.1** Run `npm run build` — verify TypeScript compiles
- [x] **13.5.2** Test `afterburn studio` with existing sessions
- [ ] **13.5.3** Test session navigation and view switching
- [ ] **13.5.4** Test with no sessions (empty state)
- [ ] **13.5.5** Test on different ports

**Sprint 13 Deliverable:** `afterburn studio` command working with basic session browser.

---

## Sprint 13.5: UI Redesign & Reports Section

### 13.5.1 Typography & Design System
- [ ] **13.5.1.1** Add Fira Sans from Google Fonts (regular, medium, semibold, bold)
- [ ] **13.5.1.2** Define type scale (headings, body, captions, code)
- [ ] **13.5.1.3** Define spacing system (4px base unit)
- [ ] **13.5.1.4** Define color palette with semantic colors:
  - Primary: Orange (#f97316)
  - Success: Green (#22c55e)
  - Warning: Yellow (#f59e0b)
  - Error: Red (#ef4444)
  - Background: Dark grays (#0a0a0a, #141414, #1a1a1a)
- [ ] **13.5.1.5** Add subtle gradients and shadows for depth

### 13.5.2 Navigation & Layout
- [ ] **13.5.2.1** Add top navigation bar with:
  - Logo + Afterburn Studio branding
  - Navigation tabs: **Sessions** | **Reports** | **Settings**
  - Search icon (global search)
- [ ] **13.5.2.2** Collapsible sidebar (toggle with icon)
- [ ] **13.5.2.3** Breadcrumb navigation
- [ ] **13.5.2.4** Responsive layout (mobile-friendly)

### 13.5.3 Interactive Elements
- [ ] **13.5.3.1** Smooth page transitions (fade/slide)
- [ ] **13.5.3.2** Hover effects on cards and buttons
- [ ] **13.5.3.3** Loading skeletons instead of spinners
- [ ] **13.5.3.4** Toast notifications for actions
- [ ] **13.5.3.5** Keyboard navigation support (arrows, enter, escape)
- [ ] **13.5.3.6** Click-to-copy on code blocks and hashes
- [ ] **13.5.3.7** Expandable/collapsible sections with animation

### 13.5.4 Sessions View (Redesigned)
- [ ] **13.5.4.1** Card-based session list (not just text)
- [ ] **13.5.4.2** Session card shows:
  - Date/time with relative time ("2 hours ago")
  - Mini stats bar (files, errors, warnings)
  - AI provider badge
  - Status indicator (clean/has issues)
- [ ] **13.5.4.3** Grid or list view toggle
- [ ] **13.5.4.4** Quick actions on hover (view, compare, export)
- [ ] **13.5.4.5** Session detail panel with tabbed sections:
  - Overview (summary cards)
  - Risk Report (findings with severity badges)
  - Dependencies (verified/hallucinated badges)
  - Files (diff stats, file tree)
  - AI Summary (if available)

### 13.5.5 Reports Page (New)
- [ ] **13.5.5.1** Reports overview dashboard at `/reports`
- [ ] **13.5.5.2** Summary cards row:
  - Total Sessions
  - Total Errors Found
  - Total Warnings
  - Hallucinated Packages
  - Code Quality Score (computed)
- [ ] **13.5.5.3** Charts section:
  - **Errors Over Time** (line chart, last 30 days)
  - **Issues by Severity** (donut chart)
  - **Top 5 Rule Violations** (horizontal bar chart)
  - **Code Velocity** (area chart: lines added/removed)
- [ ] **13.5.5.4** Recent Activity feed:
  - List of recent sessions with quick links
  - Timeline view with dots and connectors
- [ ] **13.5.5.5** Hotspots section:
  - Files with most issues
  - Directories with most activity
- [ ] **13.5.5.6** Trends section:
  - Week over week comparison
  - Improvement/degradation indicators

### 13.5.6 API Enhancements
- [ ] **13.5.6.1** `/api/reports/summary` - Aggregated stats for reports page
- [ ] **13.5.6.2** `/api/reports/trends` - Time-series data for charts
- [ ] **13.5.6.3** `/api/reports/top-rules` - Most triggered rules
- [ ] **13.5.6.4** `/api/reports/hotspots` - Files/dirs with most issues

### 13.5.7 Charting
- [ ] **13.5.7.1** Use lightweight Chart.js (embedded, no build step)
- [ ] **13.5.7.2** Consistent chart styling (dark theme, orange accent)
- [ ] **13.5.7.3** Interactive tooltips on hover
- [ ] **13.5.7.4** Responsive charts (resize with container)

### 13.5.8 Polish & Details
- [ ] **13.5.8.1** Empty states with helpful illustrations
- [ ] **13.5.8.2** Error states with retry buttons
- [ ] **13.5.8.3** Favicon (flame icon)
- [ ] **13.5.8.4** Page title updates based on view
- [ ] **13.5.8.5** Subtle animations on data updates

**Sprint 13.5 Deliverable:** Polished, interactive Studio with Sessions and Reports views.

---

## Sprint 14: Enhanced Session Viewer ✅

### 14.1 Session Detail Improvements ✅
- [x] **14.1.1** Syntax highlighting for code blocks (Prism.js)
- [x] **14.1.2** Collapsible sections CSS ready
- [x] **14.1.3** Quick navigation to sections (Summary, Risks, Dependencies)
- [x] **14.1.4** Copy code button for code blocks
- [ ] **14.1.5** Link to file paths in IDE (VSCode URL scheme) — deferred

### 14.2 Session Metadata Display — deferred to v1.1
- [ ] **14.2.1** Show AI provider badge (Claude Code, Cursor, etc.)
- [ ] **14.2.2** Show LLM summary prominently if available
- [ ] **14.2.3** Show session time range
- [ ] **14.2.4** Show commit hashes with links to git

### 14.3 Filtering & Search ✅
- [x] **14.3.1** Filter sessions by date (Today filter)
- [x] **14.3.2** Filter sessions by error count (has errors, clean)
- [x] **14.3.3** Search sessions by content (date, time, project)
- [x] **14.3.4** Quick filter chips (All, Today, Has Errors, Clean)

### 14.4 Export Features ✅
- [ ] **14.4.1** Export session as PDF — deferred
- [x] **14.4.2** Export session as HTML (standalone)
- [x] **14.4.3** Copy session link (localhost URL)
- [x] **14.4.4** Download original markdown

### 14.5 Local Build & Test ✅
- [x] **14.5.1** Run `npm run build` — verify TypeScript compiles
- [x] **14.5.2** Test syntax highlighting
- [x] **14.5.3** Test filtering and search
- [x] **14.5.4** Test export features

**Sprint 14 Deliverable:** Enhanced session viewer with search, filtering, and export. ✅ COMPLETE

---

## Sprint 15: Session Comparison & Analytics ✅

### 15.1 Session Comparison ✅
- [x] **15.1.1** Add "Compare" mode to UI
- [x] **15.1.2** Select two sessions to compare
- [x] **15.1.3** Side-by-side comparison view
- [x] **15.1.4** Highlight differences in metrics
- [ ] **15.1.5** Show new/resolved issues between sessions — deferred
- [x] **15.1.6** Show trend indicators (improved/degraded)

### 15.2 Local Analytics Dashboard ✅ (in Reports page)
- [x] **15.2.1** Reports page with analytics dashboard
- [x] **15.2.2** Error count over time (line chart)
- [x] **15.2.3** Warning count over time (line chart)
- [x] **15.2.4** Code velocity chart (lines changed)
- [x] **15.2.5** Most common rule violations (bar chart)
- [ ] **15.2.6** Quality score trend — deferred
- [x] **15.2.7** Use lightweight charting (Chart.js)

### 15.3 Project-Level Insights ✅
- [x] **15.3.1** Detect project from session reports
- [ ] **15.3.2** Group sessions by project (if multiple) — deferred
- [x] **15.3.3** Show project-level aggregates in stats
- [x] **15.3.4** Identify hotspot files (most issues)
- [x] **15.3.5** Identify hotspot directories

### 15.4 Rule Analytics ✅
- [x] **15.4.1** Most frequently triggered rules (bar chart)
- [ ] **15.4.2** Rules by severity distribution — deferred
- [ ] **15.4.3** Rule trends over time — deferred
- [ ] **15.4.4** Auto-suggest configuration changes — deferred

### 15.5 Local Build & Test ✅
- [x] **15.5.1** Run `npm run build` — verify TypeScript compiles
- [x] **15.5.2** Test comparison feature
- [x] **15.5.3** Test analytics charts with real data
- [ ] **15.5.4** Test with large session history (50+ sessions) — needs more data

**Sprint 15 Deliverable:** Session comparison and local analytics working. ✅ COMPLETE

---

## Sprint 16: GitHub Action & v1.0 Launch

### 16.1 GitHub Action Development
- [ ] **16.1.1** Create GitHub Action repository (`afterburn-action`)
- [ ] **16.1.2** Define action.yml with inputs:
  - `path`: directory to analyze
  - `fail-on-errors`: boolean
  - `license-key`: secret (optional, for LLM)
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
- [ ] **16.2.5** Support monorepo (multiple paths)

### 16.3 CI/CD Documentation
- [ ] **16.3.1** Write GitHub Actions setup guide
- [ ] **16.3.2** Write GitLab CI setup guide
- [ ] **16.3.3** Write CircleCI setup guide
- [ ] **16.3.4** Add examples to repository

### 16.4 Final Polish
- [ ] **16.4.1** Full UI/UX review of Studio
- [ ] **16.4.2** Test on Windows, Mac, Linux
- [ ] **16.4.3** Performance optimization (fast startup)
- [ ] **16.4.4** Error handling and helpful messages
- [ ] **16.4.5** Keyboard shortcuts in Studio

### 16.5 Documentation & Marketing
- [ ] **16.5.1** Update README with Studio feature
- [ ] **16.5.2** Write getting started guide
- [ ] **16.5.3** Write configuration reference
- [ ] **16.5.4** Write rule reference (all 10 rules)
- [ ] **16.5.5** Create demo video / GIF
- [ ] **16.5.6** Prepare Product Hunt launch
- [ ] **16.5.7** Prepare social media announcements

### 16.6 v1.0.0 Release
- [ ] **16.6.1** Update version to 1.0.0
- [ ] **16.6.2** Final regression test
- [ ] **16.6.3** Publish CLI to npm
- [ ] **16.6.4** Publish GitHub Action to Marketplace
- [ ] **16.6.5** Create GitHub release with changelog
- [ ] **16.6.6** Launch on Product Hunt
- [ ] **16.6.7** Announce on Twitter/X, LinkedIn, dev communities
- [ ] **16.6.8** Monitor for launch issues

**Sprint 16 Deliverable:** v1.0.0 launched with GitHub Action and complete Studio.

---

## Phase 4 Completion Checklist

- [x] `afterburn studio` command working
- [x] Session browser with rendered markdown
- [x] Syntax highlighting for code blocks (Prism.js)
- [x] Session filtering and search
- [x] Session comparison feature
- [x] Local analytics charts (Chart.js)
- [x] File and directory hotspots
- [ ] GitHub Action published to Marketplace
- [ ] CI/CD documentation complete
- [ ] v1.0.0 published to npm
- [ ] All documentation complete

---

## Why Local-First (Studio) vs Cloud Dashboard?

| Aspect | Cloud Dashboard | Afterburn Studio |
|--------|-----------------|------------------|
| Setup | PostgreSQL, auth, deploy | `npx afterburn studio` |
| Works offline | No | Yes |
| Data storage | Cloud database | Local `.afterburn` folder |
| Privacy | Data on server | Data stays local |
| Cost | Hosting, database | Free |
| Time to value | Hours/days | Seconds |
| Maintenance | Ongoing | Zero |

The Studio approach provides **immediate value** with **zero friction**. Users can view their session reports in a beautiful dashboard without any setup, accounts, or deployment.

---

## Post-v1.0 Roadmap Items

### Near-term (v1.1)
- [ ] VS Code extension (view sessions in editor)
- [ ] Custom rule authoring
- [ ] More LLM providers (Google Gemini, Azure OpenAI)
- [ ] Real-time watch mode integration

### Medium-term (v1.2+)
- [ ] More languages (Go, Rust, Java, C#)
- [ ] IDE inline annotations
- [ ] Slack/Discord integrations
- [ ] Team sharing (optional cloud sync)

### Experimental
- [ ] MCP Server implementation
- [ ] AI agent integration
- [ ] Auto-fix suggestions

---

## Success Criteria for v1.0

| Metric | Target |
|--------|--------|
| npm installs | 500+ in first month |
| GitHub stars | 200+ |
| GitHub Action installs | 50+ |
| Critical bugs | 0 |
| User satisfaction | 4+ star average |
