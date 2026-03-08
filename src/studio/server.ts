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

  app.get('/api/trends', (_req, res) => {
    const trends = getTrends(afterburnDir);
    res.json(trends);
  });

  app.get('/api/compare/:date1/:file1/:date2/:file2', (req, res) => {
    const { date1, file1, date2, file2 } = req.params;
    const filepath1 = path.join(afterburnDir, date1, file1);
    const filepath2 = path.join(afterburnDir, date2, file2);
    if (!fs.existsSync(filepath1) || !fs.existsSync(filepath2)) {
      res.status(404).json({ error: 'One or both sessions not found' });
      return;
    }
    const session1 = getSessionData(filepath1);
    const session2 = getSessionData(filepath2);
    const comparison = {
      session1: { id: `${date1}/${file1}`, date: date1, ...session1 },
      session2: { id: `${date2}/${file2}`, date: date2, ...session2 },
      diff: {
        filesChanged: session2.metadata.filesChanged - session1.metadata.filesChanged,
        linesAdded: session2.metadata.linesAdded - session1.metadata.linesAdded,
        linesRemoved: session2.metadata.linesRemoved - session1.metadata.linesRemoved,
        errors: session2.metadata.errors - session1.metadata.errors,
        warnings: session2.metadata.warnings - session1.metadata.warnings,
        hallucinated: session2.metadata.hallucinated - session1.metadata.hallucinated,
      },
      trends: {
        errorsImproved: session2.metadata.errors < session1.metadata.errors,
        warningsImproved: session2.metadata.warnings < session1.metadata.warnings,
        codeVelocity: session2.metadata.linesAdded + session2.metadata.linesRemoved,
      },
    };
    res.json(comparison);
  });

  app.get('/api/hotspots', (_req, res) => {
    const hotspots = getHotspots(afterburnDir);
    res.json(hotspots);
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

  const hallMatch = markdown.match(/❌ Hallucinated\s*\|\s*(\d+)/i);
  if (hallMatch) metadata.hallucinated = parseInt(hallMatch[1]);

  const verMatch = markdown.match(/✅ Verified\s*\|\s*(\d+)/i);
  if (verMatch) metadata.verified = parseInt(verMatch[1]);

  const errorMatches = markdown.match(/### ❌/g);
  metadata.errors = errorMatches ? errorMatches.length : 0;

  const warnMatches = markdown.match(/### ⚠️/g);
  metadata.warnings = warnMatches ? warnMatches.length : 0;

  return metadata;
}

function getStats(afterburnDir: string): {
  totalSessions: number;
  totalErrors: number;
  totalWarnings: number;
  totalHallucinated: number;
  totalFilesChanged: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
  recentSessions: SessionWithMetadata[];
} {
  const sessions = getSessions(afterburnDir);
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalHallucinated = 0;
  let totalFilesChanged = 0;
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  const recentSessions: SessionWithMetadata[] = [];

  for (const session of sessions.slice(0, 50)) {
    const data = getSessionData(session.filepath);
    totalErrors += data.metadata.errors;
    totalWarnings += data.metadata.warnings;
    totalHallucinated += data.metadata.hallucinated;
    totalFilesChanged += data.metadata.filesChanged;
    totalLinesAdded += data.metadata.linesAdded;
    totalLinesRemoved += data.metadata.linesRemoved;

    if (recentSessions.length < 10) {
      recentSessions.push({ ...session, metadata: data.metadata });
    }
  }

  return {
    totalSessions: sessions.length,
    totalErrors,
    totalWarnings,
    totalHallucinated,
    totalFilesChanged,
    totalLinesAdded,
    totalLinesRemoved,
    recentSessions,
  };
}

function getTrends(afterburnDir: string): {
  daily: Array<{ date: string; errors: number; warnings: number; files: number; lines: number }>;
  topRules: Array<{ rule: string; count: number }>;
} {
  const sessions = getSessions(afterburnDir);
  const dailyMap: Record<string, { errors: number; warnings: number; files: number; lines: number }> = {};
  const ruleCount: Record<string, number> = {};

  for (const session of sessions) {
    const data = getSessionData(session.filepath);
    if (!dailyMap[session.date]) {
      dailyMap[session.date] = { errors: 0, warnings: 0, files: 0, lines: 0 };
    }
    dailyMap[session.date].errors += data.metadata.errors;
    dailyMap[session.date].warnings += data.metadata.warnings;
    dailyMap[session.date].files += data.metadata.filesChanged;
    dailyMap[session.date].lines += data.metadata.linesAdded + data.metadata.linesRemoved;

    const ruleMatches = data.markdown.matchAll(/\*\*Rule:\*\*\s*`([^`]+)`/g);
    for (const match of ruleMatches) {
      ruleCount[match[1]] = (ruleCount[match[1]] || 0) + 1;
    }
  }

  const daily = Object.entries(dailyMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const topRules = Object.entries(ruleCount)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { daily, topRules };
}

function getHotspots(afterburnDir: string): {
  files: Array<{ path: string; issues: number; lastSeen: string }>;
  directories: Array<{ path: string; issues: number }>;
} {
  const sessions = getSessions(afterburnDir);
  const fileIssues: Record<string, { issues: number; lastSeen: string }> = {};
  const dirIssues: Record<string, number> = {};

  for (const session of sessions.slice(0, 30)) {
    const data = getSessionData(session.filepath);
    const fileMatches = data.markdown.matchAll(/(?:src|lib|app|pages|components)\/[^\s:]+\.[a-z]+/gi);
    for (const match of fileMatches) {
      const filePath = match[0];
      if (!fileIssues[filePath]) {
        fileIssues[filePath] = { issues: 0, lastSeen: session.date };
      }
      fileIssues[filePath].issues++;
      const dir = filePath.split('/').slice(0, -1).join('/');
      if (dir) {
        dirIssues[dir] = (dirIssues[dir] || 0) + 1;
      }
    }
  }

  const files = Object.entries(fileIssues)
    .map(([path, data]) => ({ path, ...data }))
    .sort((a, b) => b.issues - a.issues)
    .slice(0, 10);

  const directories = Object.entries(dirIssues)
    .map(([path, issues]) => ({ path, issues }))
    .sort((a, b) => b.issues - a.issues)
    .slice(0, 5);

  return { files, directories };
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
  <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #000000;
      --bg-sidebar: #0a0a0a;
      --bg-card: #0d0d0d;
      --bg-elevated: #141414;
      --bg-hover: #1a1a1a;
      --border: #1f1f1f;
      --border-light: #2a2a2a;
      --text: #ffffff;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --primary: #6366f1;
      --primary-light: #818cf8;
      --primary-glow: rgba(99, 102, 241, 0.3);
      --accent: #a78bfa;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #06b6d4;
      --sidebar-width: 340px;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    code, pre { font-family: 'JetBrains Mono', monospace; }

    /* ===== APP LAYOUT ===== */
    .app {
      display: flex;
      height: 100vh;
    }

    /* ===== SIDEBAR ===== */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 700;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 24px var(--primary-glow);
    }

    .nav-tabs {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    .nav-tab {
      flex: 1;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-tab:hover { color: var(--text); background: var(--bg-hover); }
    .nav-tab.active { color: var(--primary-light); background: rgba(99, 102, 241, 0.1); }

    /* Mini Stats */
    .mini-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }

    .mini-stat {
      padding: 12px;
      background: var(--bg-elevated);
      border-radius: 10px;
      text-align: center;
    }

    .mini-stat-value {
      font-size: 20px;
      font-weight: 700;
    }

    .mini-stat-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-top: 2px;
    }

    .mini-stat.primary .mini-stat-value { color: var(--primary-light); }
    .mini-stat.danger .mini-stat-value { color: var(--danger); }
    .mini-stat.warning .mini-stat-value { color: var(--warning); }
    .mini-stat.success .mini-stat-value { color: var(--success); }

    /* Search */
    .search-box {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    .search-input {
      width: 100%;
      padding: 10px 14px;
      font-size: 13px;
      color: var(--text);
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .search-input::placeholder { color: var(--text-muted); }

    /* Sessions List */
    .sessions-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .sessions-list::-webkit-scrollbar { width: 6px; }
    .sessions-list::-webkit-scrollbar-track { background: transparent; }
    .sessions-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .date-group {
      margin-bottom: 16px;
    }

    .date-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
    }

    .session-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 4px;
    }

    .session-item:hover {
      background: var(--bg-hover);
      border-color: var(--border);
    }

    .session-item.active {
      background: rgba(99, 102, 241, 0.1);
      border-color: var(--primary);
    }

    .session-score {
      width: 44px;
      height: 44px;
      position: relative;
      flex-shrink: 0;
    }

    .session-score svg { transform: rotate(-90deg); }
    .session-score-bg { fill: none; stroke: var(--border); stroke-width: 3; }
    .session-score-ring { fill: none; stroke-width: 3; stroke-linecap: round; }
    .session-score-value {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
    }

    .session-info {
      flex: 1;
      min-width: 0;
    }

    .session-time {
      font-size: 15px;
      font-weight: 600;
    }

    .session-meta {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .session-badges {
      display: flex;
      gap: 6px;
    }

    .session-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .session-badge.errors { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
    .session-badge.warnings { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
    .session-badge.clean { background: rgba(34, 197, 94, 0.15); color: var(--success); }

    /* ===== MAIN CONTENT ===== */
    .main-content {
      flex: 1;
      overflow-y: auto;
      background: var(--bg);
    }

    .content-header {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 20px 32px;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .content-title {
      font-size: 20px;
      font-weight: 700;
    }

    .content-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .view-toggle {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: var(--bg-elevated);
      border-radius: 10px;
    }

    .view-btn {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .view-btn:hover { color: var(--text); }
    .view-btn.active { color: var(--text); background: var(--bg-card); }

    .content-body {
      padding: 24px 32px;
    }

    /* AI Summary - First and Prominent */
    .ai-summary-section {
      margin-bottom: 24px;
    }

    .ai-summary-card {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(167, 139, 250, 0.08) 100%);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 16px;
      padding: 24px;
    }

    .ai-summary-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .ai-summary-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .ai-summary-title {
      font-size: 16px;
      font-weight: 600;
    }

    .ai-summary-content {
      font-size: 15px;
      line-height: 1.8;
      color: var(--text-secondary);
    }

    .ai-summary-content strong { color: var(--text); }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      text-align: center;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -1px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    .stat-card.primary .stat-value { color: var(--primary-light); }
    .stat-card.success .stat-value { color: var(--success); }
    .stat-card.danger .stat-value { color: var(--danger); }
    .stat-card.warning .stat-value { color: var(--warning); }
    .stat-card.accent .stat-value { color: var(--accent); }

    /* Bento Grid */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .bento-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }

    .bento-card.span-2 { grid-column: span 2; }
    .bento-card.span-3 { grid-column: span 3; }

    .bento-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Dependencies */
    .dep-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .dep-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--bg-elevated);
      border-radius: 8px;
      font-size: 13px;
      font-family: 'JetBrains Mono', monospace;
    }

    .dep-badge.verified { border: 1px solid rgba(34, 197, 94, 0.3); }
    .dep-badge.hallucinated { border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }
    .dep-badge .icon { font-size: 12px; }
    .dep-badge.verified .icon { color: var(--success); }
    .dep-badge.hallucinated .icon { color: var(--danger); }

    /* Report Content */
    .report-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
    }

    .report-content h1 { font-size: 22px; margin: 20px 0 12px; color: var(--primary-light); }
    .report-content h2 { font-size: 17px; margin: 18px 0 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .report-content h3 { font-size: 15px; margin: 14px 0 8px; }
    .report-content p { color: var(--text-secondary); line-height: 1.7; margin-bottom: 12px; }
    .report-content code { background: var(--bg-elevated); padding: 2px 6px; border-radius: 4px; font-size: 13px; color: var(--primary-light); }
    .report-content pre { background: var(--bg-elevated); padding: 16px; border-radius: 10px; overflow-x: auto; margin: 14px 0; }
    .report-content pre code { background: none; padding: 0; color: var(--text); }
    .report-content table { width: 100%; border-collapse: collapse; margin: 14px 0; }
    .report-content th, .report-content td { padding: 10px 14px; text-align: left; border: 1px solid var(--border); font-size: 13px; }
    .report-content th { background: var(--bg-elevated); font-weight: 600; }
    .report-content ul, .report-content ol { margin: 12px 0; padding-left: 20px; }
    .report-content li { margin: 6px 0; color: var(--text-secondary); line-height: 1.6; }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 60px;
    }

    .empty-icon { font-size: 64px; margin-bottom: 20px; opacity: 0.6; }
    .empty-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .empty-text { color: var(--text-secondary); }

    /* Reports Page */
    .reports-page { padding: 32px; }
    .reports-title { font-size: 24px; font-weight: 800; margin-bottom: 24px; }

    .charts-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .chart-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }

    .chart-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
    .chart-container { height: 220px; }

    .hotspot-list { display: flex; flex-direction: column; gap: 8px; }

    .hotspot-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-elevated);
      border-radius: 10px;
    }

    .hotspot-rank {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }

    .hotspot-path {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hotspot-count { font-size: 13px; font-weight: 600; color: var(--danger); }

    /* Compare Page */
    .compare-page { padding: 32px; }

    .compare-selector {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      padding: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      margin-bottom: 24px;
    }

    .compare-select { display: flex; flex-direction: column; gap: 8px; }
    .compare-select label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; }

    .compare-select select {
      padding: 12px 16px;
      font-size: 14px;
      color: var(--text);
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 10px;
      min-width: 200px;
    }

    .compare-select select:focus { outline: none; border-color: var(--primary); }
    .compare-arrow { font-size: 24px; color: var(--primary); margin-top: 20px; }

    .compare-result { display: grid; grid-template-columns: 1fr auto 1fr; gap: 24px; }

    .compare-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }

    .compare-card-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }

    .compare-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }

    .compare-metric { text-align: center; padding: 14px; background: var(--bg-elevated); border-radius: 10px; }
    .compare-metric-value { font-size: 24px; font-weight: 800; }
    .compare-metric-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-top: 4px; }

    .diff-card { display: flex; flex-direction: column; justify-content: center; padding: 20px; background: var(--bg-elevated); border-radius: 14px; }
    .diff-card h3 { font-size: 13px; color: var(--text-muted); text-align: center; margin-bottom: 16px; }
    .diff-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .diff-row:last-child { border-bottom: none; }
    .diff-up { color: var(--danger); font-weight: 600; }
    .diff-down { color: var(--success); font-weight: 600; }
    .diff-same { color: var(--text-muted); }

    /* Page visibility */
    .page { display: none; height: 100%; }
    .page.active { display: flex; flex-direction: column; }

    /* Animations */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease-out; }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .bento-grid { grid-template-columns: 1fr; }
      .bento-card.span-2 { grid-column: span 1; }
      .charts-row { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .sidebar { display: none; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">⚡</div>
          <span>Afterburn</span>
        </div>
      </div>

      <div class="nav-tabs">
        <button class="nav-tab active" data-page="sessions">Sessions</button>
        <button class="nav-tab" data-page="reports">Reports</button>
        <button class="nav-tab" data-page="compare">Compare</button>
      </div>

      <div class="mini-stats" id="mini-stats"></div>

      <div class="search-box">
        <input type="text" class="search-input" placeholder="Search sessions..." id="search-input">
      </div>

      <div class="sessions-list" id="sessions-list"></div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Sessions Page -->
      <div class="page active" id="page-sessions">
        <div class="content-header">
          <div>
            <div class="content-title" id="session-title">Select a Session</div>
            <div class="content-subtitle" id="session-subtitle">Choose from the sidebar</div>
          </div>
          <div class="view-toggle">
            <button class="view-btn active" data-view="overview">Overview</button>
            <button class="view-btn" data-view="report">Full Report</button>
          </div>
        </div>
        <div class="content-body" id="session-content">
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No Session Selected</div>
            <div class="empty-text">Click on a session from the sidebar to view details</div>
          </div>
        </div>
      </div>

      <!-- Reports Page -->
      <div class="page" id="page-reports">
        <div class="reports-page" id="reports-content"></div>
      </div>

      <!-- Compare Page -->
      <div class="page" id="page-compare">
        <div class="compare-page" id="compare-content"></div>
      </div>
    </main>
  </div>

  <script>
    let stats = null;
    let trends = null;
    let allSessions = [];
    let currentSession = null;
    let sessionData = null;
    let currentView = 'overview';
    let charts = {};

    async function init() {
      const [statsRes, sessionsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/sessions')
      ]);
      stats = await statsRes.json();
      allSessions = await sessionsRes.json();

      renderMiniStats();
      renderSessionsList();

      // Auto-select first session
      if (allSessions.length > 0) {
        selectSession(allSessions[0]);
      }
    }

    function renderMiniStats() {
      document.getElementById('mini-stats').innerHTML = \`
        <div class="mini-stat primary">
          <div class="mini-stat-value">\${stats.totalSessions}</div>
          <div class="mini-stat-label">Sessions</div>
        </div>
        <div class="mini-stat danger">
          <div class="mini-stat-value">\${stats.totalErrors}</div>
          <div class="mini-stat-label">Errors</div>
        </div>
        <div class="mini-stat warning">
          <div class="mini-stat-value">\${stats.totalWarnings}</div>
          <div class="mini-stat-label">Warnings</div>
        </div>
        <div class="mini-stat success">
          <div class="mini-stat-value">\${formatNumber(stats.totalFilesChanged)}</div>
          <div class="mini-stat-label">Files</div>
        </div>
      \`;
    }

    function renderSessionsList(filter = '') {
      const container = document.getElementById('sessions-list');
      const byDate = {};

      const filtered = allSessions.filter(s => {
        if (!filter) return true;
        const searchLower = filter.toLowerCase();
        return s.time.includes(searchLower) || s.date.includes(searchLower);
      });

      for (const s of filtered) {
        if (!byDate[s.date]) byDate[s.date] = [];
        byDate[s.date].push(s);
      }

      let html = '';
      for (const [date, sessions] of Object.entries(byDate)) {
        const relDate = getRelativeDate(date);
        html += \`<div class="date-group"><div class="date-label">\${relDate}</div>\`;

        for (const s of sessions) {
          const isActive = currentSession && currentSession.id === s.id;
          const score = 85; // Placeholder until loaded
          const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

          html += \`
            <div class="session-item \${isActive ? 'active' : ''}" data-id="\${s.id}" onclick='selectSessionById("\${s.id}")'>
              <div class="session-score">
                <svg width="44" height="44" viewBox="0 0 44 44">
                  <circle class="session-score-bg" cx="22" cy="22" r="18"/>
                  <circle class="session-score-ring" cx="22" cy="22" r="18" stroke="\${scoreColor}" stroke-dasharray="113" stroke-dashoffset="\${113 * (1 - score/100)}"/>
                </svg>
                <div class="session-score-value">\${score}</div>
              </div>
              <div class="session-info">
                <div class="session-time">\${s.time}</div>
                <div class="session-meta">\${s.metadata?.author || 'Unknown'}</div>
              </div>
            </div>
          \`;
        }
        html += '</div>';
      }

      container.innerHTML = html || '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No sessions</div></div>';
    }

    function selectSessionById(id) {
      const session = allSessions.find(s => s.id === id);
      if (session) selectSession(session);
    }

    async function selectSession(session) {
      currentSession = session;
      const res = await fetch(\`/api/sessions/\${session.id}\`);
      sessionData = await res.json();

      // Update sidebar active state
      document.querySelectorAll('.session-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === session.id);
      });

      // Update header
      document.getElementById('session-title').textContent = \`Session \${session.time}\`;
      document.getElementById('session-subtitle').textContent = \`\${session.date} • \${sessionData.metadata.project} • by \${sessionData.metadata.author || 'Unknown'}\`;

      renderSessionContent();
    }

    function renderSessionContent() {
      const container = document.getElementById('session-content');
      const m = sessionData.metadata;
      const score = calculateHealthScore(m);
      const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

      // Extract AI Summary (supports both "## AI Summary" and "## 🤖 AI Summary")
      const aiSummaryMatch = sessionData.markdown.match(/## (?:🤖 )?AI Summary([\\s\\S]*?)(?=##|$)/);
      const aiSummary = aiSummaryMatch ? aiSummaryMatch[1].trim() : 'No AI summary available for this session.';

      // Create filtered HTML without AI Summary section (to avoid duplication)
      const filteredHtml = sessionData.html.replace(/<h2[^>]*>(?:🤖\\s*)?AI Summary<\\/h2>[\\s\\S]*?(?=<h2|$)/, '');

      // Extract dependencies
      const deps = [];
      const depSection = sessionData.markdown.match(/## 📦 Dependency Analysis([\\s\\S]*?)(?=##|$)/);
      if (depSection) {
        const verified = [...depSection[1].matchAll(/✅\\s*\`([^\`]+)\`/g)].map(m => ({ name: m[1], verified: true }));
        const hallucinated = [...depSection[1].matchAll(/❌\\s*\`([^\`]+)\`/g)].map(m => ({ name: m[1], verified: false }));
        deps.push(...verified, ...hallucinated);
      }

      if (currentView === 'overview') {
        container.innerHTML = \`
          <div class="fade-in">
            <!-- AI Summary First -->
            <div class="ai-summary-section">
              <div class="ai-summary-card">
                <div class="ai-summary-header">
                  <div class="ai-summary-icon">🤖</div>
                  <div class="ai-summary-title">AI Summary</div>
                </div>
                <div class="ai-summary-content">\${aiSummary.replace(/\\n/g, '<br>').replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')}</div>
              </div>
            </div>

            <!-- Stats -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value" style="color: \${scoreColor}">\${score}</div>
                <div class="stat-label">Health Score</div>
              </div>
              <div class="stat-card primary">
                <div class="stat-value">\${m.filesChanged}</div>
                <div class="stat-label">Files Changed</div>
              </div>
              <div class="stat-card success">
                <div class="stat-value">+\${m.linesAdded}</div>
                <div class="stat-label">Lines Added</div>
              </div>
              <div class="stat-card danger">
                <div class="stat-value">-\${m.linesRemoved}</div>
                <div class="stat-label">Lines Removed</div>
              </div>
            </div>

            <!-- Bento Grid -->
            <div class="bento-grid">
              <div class="bento-card">
                <div class="bento-title">⚠️ Issues</div>
                <div style="display:flex;gap:16px;">
                  <div style="flex:1;text-align:center;padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;">
                    <div style="font-size:24px;font-weight:800;color:var(--danger);">\${m.errors}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Errors</div>
                  </div>
                  <div style="flex:1;text-align:center;padding:16px;background:rgba(245,158,11,0.1);border-radius:10px;">
                    <div style="font-size:24px;font-weight:800;color:var(--warning);">\${m.warnings}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Warnings</div>
                  </div>
                </div>
              </div>

              <div class="bento-card span-2">
                <div class="bento-title">📦 Dependencies</div>
                <div class="dep-grid">
                  \${deps.slice(0, 10).map(d => \`
                    <div class="dep-badge \${d.verified ? 'verified' : 'hallucinated'}">
                      <span class="icon">\${d.verified ? '✓' : '✗'}</span>
                      \${d.name}
                    </div>
                  \`).join('')}
                  \${deps.length > 10 ? \`<div class="dep-badge">+\${deps.length - 10} more</div>\` : ''}
                  \${deps.length === 0 ? '<span style="color:var(--text-muted)">No dependencies detected</span>' : ''}
                </div>
              </div>
            </div>

            <!-- Full Report (without AI Summary since it's shown above) -->
            <div class="report-card">
              <div class="bento-title">📄 Full Report</div>
              <div class="report-content">\${filteredHtml}</div>
            </div>
          </div>
        \`;
      } else {
        container.innerHTML = \`
          <div class="fade-in">
            <div class="report-card">
              <div class="report-content">\${filteredHtml}</div>
            </div>
          </div>
        \`;
      }

      if (typeof Prism !== 'undefined') Prism.highlightAll();
    }

    // Reports Page
    async function loadReports() {
      if (!trends) {
        const res = await fetch('/api/trends');
        trends = await res.json();
      }

      const hotspotsRes = await fetch('/api/hotspots');
      const hotspots = await hotspotsRes.json();

      document.getElementById('reports-content').innerHTML = \`
        <h1 class="reports-title">Reports & Analytics</h1>

        <div class="stats-grid">
          <div class="stat-card primary"><div class="stat-value">\${stats.totalSessions}</div><div class="stat-label">Sessions</div></div>
          <div class="stat-card danger"><div class="stat-value">\${stats.totalErrors}</div><div class="stat-label">Errors</div></div>
          <div class="stat-card warning"><div class="stat-value">\${stats.totalHallucinated}</div><div class="stat-label">Hallucinated</div></div>
          <div class="stat-card success"><div class="stat-value">\${formatNumber(stats.totalLinesAdded)}</div><div class="stat-label">Lines Added</div></div>
        </div>

        <div class="charts-row">
          <div class="chart-card">
            <div class="chart-title">Issues Over Time</div>
            <div class="chart-container"><canvas id="chart-timeline"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Top Rules</div>
            <div class="chart-container"><canvas id="chart-rules"></canvas></div>
          </div>
        </div>

        <div class="charts-row">
          <div class="chart-card">
            <div class="chart-title">File Hotspots</div>
            <div class="hotspot-list">
              \${hotspots.files.slice(0, 5).map((f, i) => \`
                <div class="hotspot-item">
                  <div class="hotspot-rank">\${i + 1}</div>
                  <div class="hotspot-path">\${f.path}</div>
                  <div class="hotspot-count">\${f.issues}</div>
                </div>
              \`).join('')}
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Code Velocity</div>
            <div class="chart-container"><canvas id="chart-velocity"></canvas></div>
          </div>
        </div>
      \`;

      setTimeout(renderCharts, 100);
    }

    function renderCharts() {
      Object.values(charts).forEach(c => c.destroy());
      charts = {};

      const opts = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: '#1f1f1f' }, ticks: { color: '#6b7280' } }, y: { grid: { color: '#1f1f1f' }, ticks: { color: '#6b7280' } } }
      };

      const tl = document.getElementById('chart-timeline');
      if (tl) {
        charts.timeline = new Chart(tl, {
          type: 'line',
          data: {
            labels: trends.daily.map(d => formatChartDate(d.date)),
            datasets: [
              { label: 'Errors', data: trends.daily.map(d => d.errors), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4 },
              { label: 'Warnings', data: trends.daily.map(d => d.warnings), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4 }
            ]
          },
          options: { ...opts, plugins: { legend: { display: true, position: 'top', labels: { color: '#9ca3af' } } } }
        });
      }

      const ru = document.getElementById('chart-rules');
      if (ru && trends.topRules.length > 0) {
        charts.rules = new Chart(ru, {
          type: 'bar',
          data: { labels: trends.topRules.map(r => r.rule), datasets: [{ data: trends.topRules.map(r => r.count), backgroundColor: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'] }] },
          options: { ...opts, indexAxis: 'y' }
        });
      }

      const ve = document.getElementById('chart-velocity');
      if (ve) {
        charts.velocity = new Chart(ve, {
          type: 'bar',
          data: { labels: trends.daily.map(d => formatChartDate(d.date)), datasets: [{ label: 'Lines', data: trends.daily.map(d => d.lines), backgroundColor: '#a78bfa' }] },
          options: opts
        });
      }
    }

    // Compare Page
    function loadCompare() {
      const opts = allSessions.map(s => \`<option value="\${s.id}">\${s.date} \${s.time}</option>\`).join('');

      document.getElementById('compare-content').innerHTML = \`
        <h1 class="reports-title">Compare Sessions</h1>
        <div class="compare-selector">
          <div class="compare-select">
            <label>Session 1</label>
            <select id="compare-1" onchange="updateCompare()"><option value="">Select...</option>\${opts}</select>
          </div>
          <div class="compare-arrow">→</div>
          <div class="compare-select">
            <label>Session 2</label>
            <select id="compare-2" onchange="updateCompare()"><option value="">Select...</option>\${opts}</select>
          </div>
        </div>
        <div id="compare-result"></div>
      \`;

      if (allSessions.length >= 2) {
        document.getElementById('compare-1').value = allSessions[1].id;
        document.getElementById('compare-2').value = allSessions[0].id;
        updateCompare();
      }
    }

    async function updateCompare() {
      const id1 = document.getElementById('compare-1').value;
      const id2 = document.getElementById('compare-2').value;
      const result = document.getElementById('compare-result');

      if (!id1 || !id2 || id1 === id2) {
        result.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Select two different sessions</div></div>';
        return;
      }

      const res = await fetch(\`/api/compare/\${id1}/\${id2}\`);
      const data = await res.json();
      const diff = (v) => v > 0 ? \`<span class="diff-up">+\${v}</span>\` : v < 0 ? \`<span class="diff-down">\${v}</span>\` : \`<span class="diff-same">0</span>\`;

      result.innerHTML = \`
        <div class="compare-result fade-in">
          <div class="compare-card">
            <div class="compare-card-title">Session 1 • \${data.session1.date}</div>
            <div class="compare-metrics">
              <div class="compare-metric"><div class="compare-metric-value">\${data.session1.metadata.filesChanged}</div><div class="compare-metric-label">Files</div></div>
              <div class="compare-metric"><div class="compare-metric-value">\${data.session1.metadata.errors}</div><div class="compare-metric-label">Errors</div></div>
              <div class="compare-metric"><div class="compare-metric-value">\${data.session1.metadata.warnings}</div><div class="compare-metric-label">Warnings</div></div>
              <div class="compare-metric"><div class="compare-metric-value">\${data.session1.metadata.hallucinated}</div><div class="compare-metric-label">Hallucinated</div></div>
            </div>
          </div>
          <div class="diff-card">
            <h3>Changes</h3>
            <div class="diff-row"><span>Files</span>\${diff(data.diff.filesChanged)}</div>
            <div class="diff-row"><span>Errors</span>\${diff(data.diff.errors)}</div>
            <div class="diff-row"><span>Warnings</span>\${diff(data.diff.warnings)}</div>
            <div class="diff-row"><span>Hallucinated</span>\${diff(data.diff.hallucinated)}</div>
          </div>
          <div class="compare-card">
            <div class="compare-card-title">Session 2 • \${data.session2.date}</div>
            <div class="compare-metrics">
              <div class="compare-metric"><div class="compare-metric-value">\${data.session2.metadata.filesChanged}</div><div class="compare-metric-label">Files</div></div>
              <div class="compare-metric"><div class="compare-metric-value">\${data.session2.metadata.errors}</div><div class="compare-metric-label">Errors</div></div>
              <div class="compare-metric"><div class="compare-metric-value">\${data.session2.metadata.warnings}</div><div class="compare-metric-label">Warnings</div></div>
              <div class="compare-metric"><div class="compare-metric-value">\${data.session2.metadata.hallucinated}</div><div class="compare-metric-label">Hallucinated</div></div>
            </div>
          </div>
        </div>
      \`;
    }

    // Navigation
    function showPage(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));

      document.getElementById(\`page-\${page}\`).classList.add('active');
      document.querySelector(\`.nav-tab[data-page="\${page}"]\`).classList.add('active');

      if (page === 'reports') loadReports();
      if (page === 'compare') loadCompare();
    }

    // Event Listeners
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => showPage(tab.dataset.page));
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        if (sessionData) renderSessionContent();
      });
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
      renderSessionsList(e.target.value);
    });

    // Helpers
    function calculateHealthScore(m) {
      let score = 100;
      score -= (m.errors || 0) * 15;
      score -= (m.warnings || 0) * 5;
      score -= (m.hallucinated || 0) * 3;
      return Math.max(0, Math.min(100, score));
    }

    function getRelativeDate(dateStr) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (dateStr === today) return 'Today';
      if (dateStr === yesterday) return 'Yesterday';
      return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function formatChartDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function formatNumber(n) {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return n.toString();
    }

    init();
  </script>
</body>
</html>`;
}
