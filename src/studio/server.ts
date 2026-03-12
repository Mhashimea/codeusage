import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import open from 'open';

interface Session {
  id: string;
  date: string;
  time: string;
  filename: string;
  filepath: string;
}

interface SessionData {
  markdown: string;
  html: string;
  metadata: {
    project: string;
    author: string;
    generated: string;
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
    commits: number;
    errors: number;
    warnings: number;
    infos: number;
    hallucinated: number;
    verified: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    model: string;
    actionsCount: number;
  };
}

interface SessionWithMetadata extends Session {
  metadata: SessionData['metadata'];
}

export async function startStudio(projectPath: string, port: number = 3333): Promise<void> {
  const app = express();
  const afterburnDir = path.join(projectPath, '.afterburn');

  if (!fs.existsSync(afterburnDir)) {
    console.error('No .afterburn directory found. Run "afterburn analyze" first.');
    process.exit(1);
  }

  app.get('/', (_req, res) => {
    res.send(getIndexHtml());
  });

  app.get('/api/sessions', (_req, res) => {
    const sessions = getSessions(afterburnDir);
    res.json(sessions);
  });

  app.get('/api/sessions/:date/:filename', (req, res) => {
    const { date, filename } = req.params;
    const filepath = path.join(afterburnDir, date, filename);
    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const data = getSessionData(filepath);
    res.json(data);
  });

  app.get('/api/stats', (_req, res) => {
    const stats = getStats(afterburnDir);
    res.json(stats);
  });

  app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n⚡ Afterburn Studio running at ${url}\n`);
    open(url);
  });
}

function getSessions(afterburnDir: string): SessionWithMetadata[] {
  const sessions: SessionWithMetadata[] = [];
  const dates = fs.readdirSync(afterburnDir)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  for (const date of dates) {
    const dateDir = path.join(afterburnDir, date);
    const files = fs.readdirSync(dateDir)
      .filter(f => f.startsWith('session-') && f.endsWith('.md'))
      .sort()
      .reverse();

    for (const file of files) {
      const timeMatch = file.match(/session-(\d{2})-(\d{2})-(\d{2})\.md/);
      const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}` : 'unknown';
      const filepath = path.join(dateDir, file);
      const data = getSessionData(filepath);
      sessions.push({
        id: `${date}/${file}`,
        date,
        time,
        filename: file,
        filepath,
        metadata: data.metadata,
      });
    }
  }
  return sessions;
}

function getSessionData(filepath: string): SessionData {
  const markdown = fs.readFileSync(filepath, 'utf-8');
  const html = marked(markdown) as string;
  const metadata = parseMetadata(markdown);
  return { markdown, html, metadata };
}

function parseMetadata(markdown: string): SessionData['metadata'] {
  const metadata: SessionData['metadata'] = {
    project: 'Unknown',
    author: 'Unknown',
    generated: '',
    filesChanged: 0,
    linesAdded: 0,
    linesRemoved: 0,
    commits: 0,
    errors: 0,
    warnings: 0,
    infos: 0,
    hallucinated: 0,
    verified: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    model: '',
    actionsCount: 0,
  };

  const projectMatch = markdown.match(/Project:\s*([^\s|]+)/i);
  if (projectMatch) metadata.project = projectMatch[1];

  const authorMatch = markdown.match(/Author:\s*([^\s|]+)/i);
  if (authorMatch) metadata.author = authorMatch[1];

  const genMatch = markdown.match(/Generated:\s*([^|]+)/i);
  if (genMatch) metadata.generated = genMatch[1].trim();

  const filesMatch = markdown.match(/Files Changed\s*\|\s*(\d+)/i);
  if (filesMatch) metadata.filesChanged = parseInt(filesMatch[1]);

  const addMatch = markdown.match(/Lines Added\s*\|\s*\+(\d+)/i);
  if (addMatch) metadata.linesAdded = parseInt(addMatch[1]);

  const remMatch = markdown.match(/Lines Removed\s*\|\s*-(\d+)/i);
  if (remMatch) metadata.linesRemoved = parseInt(remMatch[1]);

  const commitMatch = markdown.match(/Commits\s*\|\s*(\d+)/i);
  if (commitMatch) metadata.commits = parseInt(commitMatch[1]);

  const modelMatch = markdown.match(/Model\s*\|\s*([^\s|]+)/i);
  if (modelMatch) metadata.model = modelMatch[1];

  const totalTokensMatch = markdown.match(/Total Tokens\s*\|\s*([\d,]+)/i);
  if (totalTokensMatch) metadata.totalTokens = parseInt(totalTokensMatch[1].replace(/,/g, ''));

  const inputTokensMatch = markdown.match(/Input Tokens\s*\|\s*([\d,]+)/i);
  if (inputTokensMatch) metadata.inputTokens = parseInt(inputTokensMatch[1].replace(/,/g, ''));

  const outputTokensMatch = markdown.match(/Output Tokens\s*\|\s*([\d,]+)/i);
  if (outputTokensMatch) metadata.outputTokens = parseInt(outputTokensMatch[1].replace(/,/g, ''));

  const costMatch = markdown.match(/Estimated Cost\s*\|\s*\$([\d.]+)/i);
  if (costMatch) metadata.estimatedCost = parseFloat(costMatch[1]);

  const actionsMatch = markdown.match(/(\d+) actions logged/i);
  if (actionsMatch) metadata.actionsCount = parseInt(actionsMatch[1]);

  return metadata;
}

function getStats(afterburnDir: string): {
  totalSessions: number;
  totalTokens: number;
  totalCost: number;
  totalFiles: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
  projects: string[];
  models: string[];
  authors: string[];
  recentSessions: SessionWithMetadata[];
} {
  const sessions = getSessions(afterburnDir);
  let totalTokens = 0;
  let totalCost = 0;
  let totalFiles = 0;
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  const projects = new Set<string>();
  const models = new Set<string>();
  const authors = new Set<string>();

  for (const session of sessions) {
    totalTokens += session.metadata.totalTokens || 0;
    totalCost += session.metadata.estimatedCost || 0;
    totalFiles += session.metadata.filesChanged || 0;
    totalLinesAdded += session.metadata.linesAdded || 0;
    totalLinesRemoved += session.metadata.linesRemoved || 0;
    if (session.metadata.project && session.metadata.project !== 'Unknown') {
      projects.add(session.metadata.project);
    }
    if (session.metadata.model) {
      models.add(session.metadata.model);
    }
    if (session.metadata.author && session.metadata.author !== 'Unknown') {
      authors.add(session.metadata.author);
    }
  }

  return {
    totalSessions: sessions.length,
    totalTokens,
    totalCost,
    totalFiles,
    totalLinesAdded,
    totalLinesRemoved,
    projects: Array.from(projects),
    models: Array.from(models),
    authors: Array.from(authors),
    recentSessions: sessions.slice(0, 10),
  };
}

function getIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Afterburn Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #121212;
      --bg-sidebar: #0a0a0a;
      --bg-card: #1a1a1a;
      --bg-elevated: #242424;
      --bg-hover: #2a2a2a;
      --border: #2a2a2a;
      --border-light: #333333;
      --text: #f5f5f5;
      --text-secondary: #a0a0a0;
      --text-muted: #666666;
      --primary: #3b82f6;
      --primary-light: #60a5fa;
      --primary-dark: #2563eb;
      --accent: #8b5cf6;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --sidebar-width: 300px;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    code, pre { font-family: 'JetBrains Mono', monospace; }

    .app { display: flex; height: 100vh; }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-width);
      height: 100vh;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
      height: 65px;
      display: flex;
      align-items: center;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 17px;
      font-weight: 700;
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    /* Navigation Tabs */
    .nav-tabs {
      display: flex;
      padding: 12px;
      gap: 6px;
      border-bottom: 1px solid var(--border);
    }

    .nav-tab {
      flex: 1;
      padding: 10px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .nav-tab:hover { background: var(--bg-card); color: var(--text); }
    .nav-tab.active { background: var(--primary); color: white; }

    /* Filters */
    .filters {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filters-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .filter-row {
      display: flex;
      gap: 8px;
    }

    .filter-select {
      flex: 1;
      padding: 8px 10px;
      font-size: 12px;
      color: var(--text);
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      outline: none;
    }

    .filter-select:focus { border-color: var(--primary); }
    .filter-select option { background: var(--bg-card); }

    /* Stats Grid */
    .sidebar-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid var(--border);
    }

    .stat-box {
      padding: 12px;
      background: var(--bg-card);
      border-radius: 8px;
      text-align: center;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary-light);
    }

    .stat-label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    /* Sessions List */
    .sessions-header {
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sessions-list {
      flex: 1;
      overflow-y: auto;
      padding: 0 8px 8px;
    }

    .session-item {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 4px;
      transition: background 0.15s;
      border: 1px solid transparent;
    }

    .session-item:hover { background: var(--bg-card); }
    .session-item.active {
      background: var(--bg-card);
      border-color: var(--primary);
    }

    .session-time {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .session-model {
      font-size: 11px;
      color: var(--primary-light);
      font-weight: 400;
    }

    .session-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .session-cost { color: var(--warning); }
    .session-tokens { color: var(--primary-light); }

    .date-group { margin-bottom: 12px; }
    .date-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      padding: 8px 12px 4px;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      overflow-y: auto;
      background: var(--bg);
    }

    .content-header {
      padding: 0 28px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-sidebar);
      height: 65px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .header-filters {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .header-filters .filter-select {
      min-width: 120px;
    }

    .content-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .content-subtitle {
      font-size: 13px;
      color: var(--text-muted);
    }

    .content-body { padding: 24px 28px; }

    /* Session Info Bar */
    .session-info {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
      padding: 14px 18px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
    }

    .info-item {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .info-item strong {
      color: var(--text-muted);
      font-weight: 500;
      margin-right: 6px;
    }

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
      text-align: center;
    }

    .summary-value {
      font-size: 26px;
      font-weight: 800;
      color: var(--text);
    }

    .summary-label {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .summary-card.primary .summary-value { color: var(--primary-light); }
    .summary-card.warning .summary-value { color: var(--warning); }
    .summary-card.success .summary-value { color: var(--success); }

    /* Cards */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 16px;
      overflow: hidden;
    }

    .card-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-badge {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 12px;
      background: var(--bg-elevated);
      color: var(--text-muted);
    }

    .card-content { padding: 16px 18px; }

    /* Tools List */
    .tools-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .tool-row {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      background: var(--bg-elevated);
      border-radius: 6px;
    }

    .tool-icon {
      font-size: 15px;
      margin-right: 12px;
    }

    .tool-name {
      font-size: 13px;
      font-weight: 500;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tool-count {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary-light);
      margin-left: 12px;
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .data-table th,
    .data-table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .data-table th {
      font-weight: 600;
      color: var(--text-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .data-table td code {
      background: var(--bg-elevated);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      word-break: break-all;
    }

    .file-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--primary-light);
    }

    .changes-add { color: var(--success); }
    .changes-del { color: var(--danger); }

    /* AI Summary */
    .ai-summary {
      font-size: 14px;
      line-height: 1.8;
      color: var(--text-secondary);
    }

    .ai-summary strong { color: var(--text); }

    /* Reports Page */
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .report-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
    }

    .report-card.full { grid-column: span 2; }

    .report-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .report-value {
      font-size: 36px;
      font-weight: 800;
    }

    .report-label {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .report-stat-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }

    .report-stat-row:last-child { border-bottom: none; }

    .report-stat-label { color: var(--text-secondary); }
    .report-stat-value { font-weight: 600; }

    /* Model breakdown */
    .model-item {
      display: flex;
      align-items: center;
      padding: 12px;
      background: var(--bg-elevated);
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .model-name {
      flex: 1;
      font-weight: 500;
    }

    .model-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .model-stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .model-stat-value {
      color: var(--text);
      font-weight: 600;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      text-align: center;
    }

    .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .empty-text { color: var(--text-secondary); font-size: 13px; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--border-light); }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">⚡</div>
          <span>Afterburn</span>
        </div>
      </div>

      <div class="nav-tabs">
        <button class="nav-tab active" onclick="showPage('sessions')">Sessions</button>
        <button class="nav-tab" onclick="showPage('reports')">Reports</button>
      </div>

      <!-- Sessions Filters (always in sidebar) -->
      <div class="filters">
        <div class="filter-row">
          <select class="filter-select" id="filter-project" onchange="applySessionFilters()">
            <option value="">All Projects</option>
          </select>
          <select class="filter-select" id="filter-author" onchange="applySessionFilters()">
            <option value="">All Authors</option>
          </select>
        </div>
        <div class="filter-row">
          <select class="filter-select" id="filter-model" onchange="applySessionFilters()">
            <option value="">All Models</option>
          </select>
          <select class="filter-select" id="filter-sort" onchange="applySessionFilters()">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="cost-high">Highest Cost</option>
            <option value="cost-low">Lowest Cost</option>
            <option value="tokens-high">Most Tokens</option>
          </select>
        </div>
      </div>

      <div class="sidebar-stats" id="sidebar-stats"></div>

      <div class="sessions-header">Sessions</div>
      <div class="sessions-list" id="sessions-list"></div>
    </aside>

    <main class="main-content">
      <div class="content-header" id="content-header">
        <div class="header-left">
          <div class="content-title" id="content-title">Select a Session</div>
          <div class="content-subtitle" id="content-subtitle">Choose a session from the sidebar</div>
        </div>
        <div class="header-filters" id="header-filters" style="display: none;">
          <select class="filter-select" id="report-filter-project" onchange="applyReportFilters()">
            <option value="">All Projects</option>
          </select>
          <select class="filter-select" id="report-filter-author" onchange="applyReportFilters()">
            <option value="">All Authors</option>
          </select>
          <select class="filter-select" id="report-filter-model" onchange="applyReportFilters()">
            <option value="">All Models</option>
          </select>
        </div>
      </div>
      <div class="content-body" id="content-body">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">No Session Selected</div>
          <div class="empty-text">Click a session from the sidebar to view details</div>
        </div>
      </div>
    </main>
  </div>

  <script>
    let allSessions = [];
    let filteredSessions = [];
    let reportFilteredSessions = [];
    let currentSession = null;
    let sessionData = null;
    let stats = null;
    let currentPage = 'sessions';

    async function init() {
      const [statsRes, sessionsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/sessions')
      ]);
      stats = await statsRes.json();
      allSessions = await sessionsRes.json();
      filteredSessions = [...allSessions];
      reportFilteredSessions = [...allSessions];

      populateFilters();
      updateSessionStats();
      renderSessionsList();

      if (allSessions.length > 0) {
        selectSession(allSessions[0]);
      }
    }

    function populateFilters() {
      // Session filters
      const projectSelect = document.getElementById('filter-project');
      const authorSelect = document.getElementById('filter-author');
      const modelSelect = document.getElementById('filter-model');

      // Report filters
      const reportProjectSelect = document.getElementById('report-filter-project');
      const reportAuthorSelect = document.getElementById('report-filter-author');
      const reportModelSelect = document.getElementById('report-filter-model');

      stats.projects.forEach(p => {
        const opt1 = document.createElement('option');
        opt1.value = p;
        opt1.textContent = p;
        projectSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = p;
        opt2.textContent = p;
        reportProjectSelect.appendChild(opt2);
      });

      stats.authors.forEach(a => {
        const opt1 = document.createElement('option');
        opt1.value = a;
        opt1.textContent = a;
        authorSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = a;
        opt2.textContent = a;
        reportAuthorSelect.appendChild(opt2);
      });

      stats.models.forEach(m => {
        const opt1 = document.createElement('option');
        opt1.value = m;
        opt1.textContent = getShortModel(m);
        modelSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = m;
        opt2.textContent = getShortModel(m);
        reportModelSelect.appendChild(opt2);
      });
    }

    // Sessions filter function
    function applySessionFilters() {
      const project = document.getElementById('filter-project').value;
      const author = document.getElementById('filter-author').value;
      const model = document.getElementById('filter-model').value;
      const sort = document.getElementById('filter-sort').value;

      filteredSessions = allSessions.filter(s => {
        if (project && s.metadata.project !== project) return false;
        if (author && s.metadata.author !== author) return false;
        if (model && s.metadata.model !== model) return false;
        return true;
      });

      // Sort
      filteredSessions.sort((a, b) => {
        switch (sort) {
          case 'oldest':
            return (a.date + a.time).localeCompare(b.date + b.time);
          case 'cost-high':
            return (b.metadata.estimatedCost || 0) - (a.metadata.estimatedCost || 0);
          case 'cost-low':
            return (a.metadata.estimatedCost || 0) - (b.metadata.estimatedCost || 0);
          case 'tokens-high':
            return (b.metadata.totalTokens || 0) - (a.metadata.totalTokens || 0);
          default: // newest
            return (b.date + b.time).localeCompare(a.date + a.time);
        }
      });

      renderSessionsList();
      updateSessionStats();
    }

    // Reports filter function
    function applyReportFilters() {
      const project = document.getElementById('report-filter-project').value;
      const author = document.getElementById('report-filter-author').value;
      const model = document.getElementById('report-filter-model').value;

      reportFilteredSessions = allSessions.filter(s => {
        if (project && s.metadata.project !== project) return false;
        if (author && s.metadata.author !== author) return false;
        if (model && s.metadata.model !== model) return false;
        return true;
      });

      renderReportsPage();
    }

    function updateSessionStats() {
      let totalTokens = 0;
      let totalCost = 0;
      for (const s of filteredSessions) {
        totalTokens += s.metadata.totalTokens || 0;
        totalCost += s.metadata.estimatedCost || 0;
      }
      document.getElementById('sidebar-stats').innerHTML = \`
        <div class="stat-box">
          <div class="stat-value">\${filteredSessions.length}</div>
          <div class="stat-label">Sessions</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">$\${totalCost.toFixed(2)}</div>
          <div class="stat-label">Total Cost</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">\${formatTokens(totalTokens)}</div>
          <div class="stat-label">Tokens</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">\${filteredSessions.reduce((a, s) => a + (s.metadata.filesChanged || 0), 0)}</div>
          <div class="stat-label">Files</div>
        </div>
      \`;
    }



    function renderSessionsList() {
      const container = document.getElementById('sessions-list');
      const byDate = {};

      for (const s of filteredSessions) {
        if (!byDate[s.date]) byDate[s.date] = [];
        byDate[s.date].push(s);
      }

      let html = '';
      for (const [date, sessions] of Object.entries(byDate)) {
        const relDate = getRelativeDate(date);
        html += \`<div class="date-group"><div class="date-label">\${relDate}</div>\`;

        for (const s of sessions) {
          const isActive = currentSession && currentSession.id === s.id;
          const cost = s.metadata.estimatedCost ? \`$\${s.metadata.estimatedCost.toFixed(2)}\` : '';
          const tokens = s.metadata.totalTokens ? formatTokens(s.metadata.totalTokens) : '';
          const model = s.metadata.model ? getShortModel(s.metadata.model) : '';

          html += \`
            <div class="session-item \${isActive ? 'active' : ''}" onclick="selectSessionById('\${s.id}')">
              <div class="session-time">
                \${s.time}
                \${model ? \`<span class="session-model">• \${model}</span>\` : ''}
              </div>
              <div class="session-meta">
                \${cost ? \`<span class="session-cost">\${cost}</span>\` : ''}
                \${tokens ? \`<span class="session-tokens">\${tokens}</span>\` : ''}
                <span>\${s.metadata.filesChanged || 0} files</span>
              </div>
            </div>
          \`;
        }
        html += '</div>';
      }

      container.innerHTML = html || '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No sessions</div></div>';
    }

    function showPage(page) {
      currentPage = page;
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelector(\`.nav-tab:nth-child(\${page === 'sessions' ? 1 : 2})\`).classList.add('active');

      const headerFilters = document.getElementById('header-filters');

      if (page === 'reports') {
        headerFilters.style.display = 'flex';
        renderReportsPage();
      } else {
        headerFilters.style.display = 'none';
        if (currentSession) {
          renderSessionContent();
        }
      }
    }

    function renderReportsPage() {
      document.getElementById('content-title').textContent = 'Reports';
      document.getElementById('content-subtitle').textContent = 'Usage analytics and insights';

      // Use report-specific filtered sessions
      const sessions = reportFilteredSessions;

      // Calculate totals from filtered sessions
      let totalTokens = 0;
      let totalCost = 0;
      let totalFiles = 0;
      let totalLinesAdded = 0;
      let totalLinesRemoved = 0;

      for (const s of sessions) {
        totalTokens += s.metadata.totalTokens || 0;
        totalCost += s.metadata.estimatedCost || 0;
        totalFiles += s.metadata.filesChanged || 0;
        totalLinesAdded += s.metadata.linesAdded || 0;
        totalLinesRemoved += s.metadata.linesRemoved || 0;
      }

      // Calculate stats by model from filtered sessions
      const byModel = {};
      for (const s of sessions) {
        const model = s.metadata.model || 'Unknown';
        if (!byModel[model]) {
          byModel[model] = { sessions: 0, tokens: 0, cost: 0, linesAdded: 0, linesRemoved: 0 };
        }
        byModel[model].sessions++;
        byModel[model].tokens += s.metadata.totalTokens || 0;
        byModel[model].cost += s.metadata.estimatedCost || 0;
        byModel[model].linesAdded += s.metadata.linesAdded || 0;
        byModel[model].linesRemoved += s.metadata.linesRemoved || 0;
      }

      // Calculate stats by project from filtered sessions
      const byProject = {};
      for (const s of sessions) {
        const project = s.metadata.project || 'Unknown';
        if (!byProject[project]) {
          byProject[project] = { sessions: 0, tokens: 0, cost: 0 };
        }
        byProject[project].sessions++;
        byProject[project].tokens += s.metadata.totalTokens || 0;
        byProject[project].cost += s.metadata.estimatedCost || 0;
      }

      const avgCost = sessions.length > 0 ? totalCost / sessions.length : 0;
      const avgTokens = sessions.length > 0 ? Math.round(totalTokens / sessions.length) : 0;

      document.getElementById('content-body').innerHTML = \`
        <div class="reports-grid">
          <div class="report-card">
            <div class="report-title">Total Cost</div>
            <div class="report-value" style="color: var(--warning)">$\${totalCost.toFixed(2)}</div>
            <div class="report-label">Across \${sessions.length} sessions</div>
          </div>
          <div class="report-card">
            <div class="report-title">Total Tokens</div>
            <div class="report-value" style="color: var(--primary-light)">\${formatTokens(totalTokens)}</div>
            <div class="report-label">Input + Output tokens</div>
          </div>
          <div class="report-card">
            <div class="report-title">Code Changes</div>
            <div class="report-value" style="color: var(--success)">+\${totalLinesAdded.toLocaleString()}</div>
            <div class="report-label" style="color: var(--danger)">-\${totalLinesRemoved.toLocaleString()} lines removed</div>
          </div>
          <div class="report-card">
            <div class="report-title">Files Modified</div>
            <div class="report-value">\${totalFiles}</div>
            <div class="report-label">Total files changed</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 Usage by Model</div>
          </div>
          <div class="card-content">
            \${Object.keys(byModel).length > 0 ? Object.entries(byModel)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([model, data]) => \`
                <div class="model-item">
                  <div class="model-name">\${getShortModel(model)}</div>
                  <div class="model-stats">
                    <div class="model-stat">
                      <span class="model-stat-value">\${data.sessions}</span>
                      <span>sessions</span>
                    </div>
                    <div class="model-stat">
                      <span class="model-stat-value">\${formatTokens(data.tokens)}</span>
                      <span>tokens</span>
                    </div>
                    <div class="model-stat">
                      <span class="model-stat-value" style="color: var(--success)">+\${data.linesAdded}</span>
                      <span style="color: var(--danger)">-\${data.linesRemoved}</span>
                    </div>
                    <div class="model-stat" style="color: var(--warning)">
                      <span>$\${data.cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              \`).join('') : '<div class="empty-state"><div class="empty-text">No data</div></div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">📁 Usage by Project</div>
          </div>
          <div class="card-content">
            \${Object.keys(byProject).length > 0 ? Object.entries(byProject)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([project, data]) => \`
                <div class="model-item">
                  <div class="model-name">\${project}</div>
                  <div class="model-stats">
                    <div class="model-stat">
                      <span class="model-stat-value">\${data.sessions}</span>
                      <span>sessions</span>
                    </div>
                    <div class="model-stat">
                      <span class="model-stat-value">\${formatTokens(data.tokens)}</span>
                      <span>tokens</span>
                    </div>
                    <div class="model-stat" style="color: var(--warning)">
                      <span>$\${data.cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              \`).join('') : '<div class="empty-state"><div class="empty-text">No data</div></div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">📈 Summary</div>
          </div>
          <div class="card-content">
            <div class="report-stat-row">
              <span class="report-stat-label">Total Sessions</span>
              <span class="report-stat-value">\${sessions.length}</span>
            </div>
            <div class="report-stat-row">
              <span class="report-stat-label">Projects</span>
              <span class="report-stat-value">\${Object.keys(byProject).length}</span>
            </div>
            <div class="report-stat-row">
              <span class="report-stat-label">Models Used</span>
              <span class="report-stat-value">\${Object.keys(byModel).length}</span>
            </div>
            <div class="report-stat-row">
              <span class="report-stat-label">Average Cost per Session</span>
              <span class="report-stat-value">$\${avgCost.toFixed(3)}</span>
            </div>
            <div class="report-stat-row">
              <span class="report-stat-label">Average Tokens per Session</span>
              <span class="report-stat-value">\${formatTokens(avgTokens)}</span>
            </div>
          </div>
        </div>
      \`;
    }

    function selectSessionById(id) {
      const session = filteredSessions.find(s => s.id === id) || allSessions.find(s => s.id === id);
      if (session) selectSession(session);
    }

    async function selectSession(session) {
      currentSession = session;
      currentPage = 'sessions';
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.nav-tab:nth-child(1)').classList.add('active');

      // Hide report filters when selecting a session
      document.getElementById('header-filters').style.display = 'none';

      const res = await fetch(\`/api/sessions/\${session.id}\`);
      sessionData = await res.json();

      renderSessionsList();
      renderSessionContent();
    }

    function renderSessionContent() {
      const m = sessionData.metadata;
      const model = m.model ? getShortModel(m.model) : 'Unknown';

      document.getElementById('content-title').textContent = \`Session \${currentSession.time}\`;
      document.getElementById('content-subtitle').textContent = \`\${currentSession.date}\`;

      // Parse tools
      const toolsMatch = sessionData.markdown.match(/### Tool Usage Summary([\\s\\S]*?)(?=###|##|$)/);
      const tools = [];
      if (toolsMatch) {
        const toolRows = toolsMatch[1].matchAll(/\\|\\s*([^|]+)\\s*\\|\\s*(\\d+)\\s*\\|/g);
        for (const row of toolRows) {
          const name = row[1].trim();
          if (name && !name.includes('---') && name !== 'Tool') {
            tools.push({ name: name.replace(/[🔧💻📖✏️📝🔍🔎🌐📋✅🎭]/g, '').trim(), count: parseInt(row[2]) });
          }
        }
      }

      // Parse actions
      const actionsMatch = sessionData.markdown.match(/### All Actions([\\s\\S]*?)(?=##|$)/);
      const actions = [];
      if (actionsMatch) {
        const actionRows = actionsMatch[1].matchAll(/\\|\\s*([^|]+)\\s*\\|\\s*([^|]*)\\s*\\|/g);
        for (const row of actionRows) {
          const tool = row[1].trim();
          const action = row[2].trim();
          if (tool && !tool.includes('---') && tool !== 'Tool') {
            actions.push({ tool: tool.replace(/[🔧💻📖✏️📝🔍🔎🌐📋✅🎭]/g, '').trim(), action });
          }
        }
      }

      // Parse files
      const filesMatch = sessionData.markdown.match(/## Files Changed([\\s\\S]*?)(?=##|$)/);
      const files = [];
      if (filesMatch) {
        const fileRows = filesMatch[1].matchAll(/\\|\\s*([^|]+)\\s*\\|\\s*\`([^\`]+)\`\\s*\\|\\s*([^|]*)\\s*\\|/g);
        for (const row of fileRows) {
          const category = row[1].trim();
          const path = row[2].trim();
          const changes = row[3].trim();
          if (path && !category.includes('---') && category !== 'Category') {
            files.push({ category, path, changes });
          }
        }
      }

      // Parse AI Summary
      const aiMatch = sessionData.markdown.match(/## (?:🤖 )?AI Summary([\\s\\S]*?)(?=##|$)/);
      const aiSummary = aiMatch ? aiMatch[1].trim() : '';

      let html = \`
        <div class="session-info">
          <span class="info-item"><strong>Project:</strong> \${m.project}</span>
          <span class="info-item"><strong>Author:</strong> \${m.author}</span>
          <span class="info-item"><strong>Model:</strong> \${model}</span>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value">\${formatTokens(m.totalTokens || 0)}</div>
            <div class="summary-label">Tokens</div>
          </div>
          <div class="summary-card warning">
            <div class="summary-value">$\${(m.estimatedCost || 0).toFixed(2)}</div>
            <div class="summary-label">Cost</div>
          </div>
          <div class="summary-card success">
            <div class="summary-value">\${m.filesChanged || 0}</div>
            <div class="summary-label">Files</div>
          </div>
          <div class="summary-card">
            <div class="summary-value"><span class="changes-add">+\${m.linesAdded || 0}</span>/<span class="changes-del">-\${m.linesRemoved || 0}</span></div>
            <div class="summary-label">Lines</div>
          </div>
        </div>
      \`;

      if (aiSummary) {
        html += \`
          <div class="card">
            <div class="card-header">
              <div class="card-title">🤖 AI Summary</div>
            </div>
            <div class="card-content">
              <div class="ai-summary">\${aiSummary.replace(/\\n/g, '<br>').replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')}</div>
            </div>
          </div>
        \`;
      }

      if (tools.length > 0) {
        const totalCalls = tools.reduce((a, t) => a + t.count, 0);
        const sortedTools = [...tools].sort((a, b) => b.count - a.count);
        html += \`
          <div class="card">
            <div class="card-header">
              <div class="card-title">🛠️ Tools Used</div>
              <div class="card-badge">\${totalCalls} calls</div>
            </div>
            <div class="card-content">
              <div class="tools-list">
                \${sortedTools.map(t => \`
                  <div class="tool-row">
                    <span class="tool-icon">\${getToolIcon(t.name)}</span>
                    <span class="tool-name">\${t.name}</span>
                    <span class="tool-count">\${t.count}</span>
                  </div>
                \`).join('')}
              </div>
            </div>
          </div>
        \`;
      }

      if (actions.length > 0) {
        html += \`
          <div class="card">
            <div class="card-header">
              <div class="card-title">⚡ Actions</div>
              <div class="card-badge">\${actions.length}</div>
            </div>
            <div class="card-content">
              <table class="data-table">
                <thead><tr><th>Tool</th><th>Action</th></tr></thead>
                <tbody>
                  \${actions.map(a => \`
                    <tr>
                      <td>\${a.tool}</td>
                      <td>\${a.action !== '-' ? \`<code>\${a.action}</code>\` : '<span style="color:var(--text-muted)">-</span>'}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        \`;
      }

      if (files.length > 0) {
        html += \`
          <div class="card">
            <div class="card-header">
              <div class="card-title">📁 Files Changed</div>
              <div class="card-badge">\${files.length}</div>
            </div>
            <div class="card-content">
              <table class="data-table">
                <thead><tr><th>Category</th><th>File</th><th>Changes</th></tr></thead>
                <tbody>
                  \${files.map(f => \`
                    <tr>
                      <td>\${f.category}</td>
                      <td class="file-path">\${f.path}</td>
                      <td>\${formatChanges(f.changes)}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        \`;
      }

      document.getElementById('content-body').innerHTML = html;
    }

    // Helpers
    function formatTokens(n) {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return n.toString();
    }

    function getShortModel(model) {
      return model.replace('claude-', '').replace('-20251101', '').replace('-20250514', '');
    }

    function getRelativeDate(dateStr) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (dateStr === today) return 'Today';
      if (dateStr === yesterday) return 'Yesterday';
      return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function getToolIcon(name) {
      if (name.includes('Bash')) return '💻';
      if (name.includes('Read')) return '📖';
      if (name.includes('Edit')) return '✏️';
      if (name.includes('Write')) return '📝';
      if (name.includes('Glob')) return '🔍';
      if (name.includes('Grep')) return '🔎';
      if (name.includes('WebFetch')) return '🌐';
      if (name.includes('WebSearch')) return '🔎';
      if (name.includes('Task')) return '📋';
      if (name.includes('Todo')) return '✅';
      if (name.includes('playwright')) return '🎭';
      if (name.includes('mcp_')) return '🔌';
      return '🔧';
    }

    function formatChanges(changes) {
      if (!changes || changes === '-') return '-';
      const match = changes.match(/\\+?(\\d+)\\/-?(\\d+)/);
      if (match) {
        return \`<span class="changes-add">+\${match[1]}</span>/<span class="changes-del">-\${match[2]}</span>\`;
      }
      return changes;
    }

    init();
  </script>
</body>
</html>`;
}
