/**
 * Python Dependency Parser
 *
 * Parses Python dependency files:
 * - requirements.txt
 * - pyproject.toml (PEP 621 / Poetry / Flit)
 * - setup.py (limited support)
 * - Pipfile
 */

export interface PythonDependency {
  name: string;
  version?: string;
  versionConstraint?: string;
  extras?: string[];
  source: 'requirements.txt' | 'pyproject.toml' | 'setup.py' | 'Pipfile';
  isDev?: boolean;
}

/**
 * Parse requirements.txt format
 *
 * Supports:
 * - package==1.0.0
 * - package>=1.0.0,<2.0.0
 * - package[extra1,extra2]
 * - -r other-requirements.txt (noted but not followed)
 * - # comments
 */
export function parseRequirementsTxt(content: string): PythonDependency[] {
  const dependencies: PythonDependency[] = [];
  const lines = content.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue;
    }

    // Skip -r, -e, --requirement, --editable flags
    if (line.startsWith('-r') || line.startsWith('-e') ||
        line.startsWith('--requirement') || line.startsWith('--editable')) {
      continue;
    }

    // Skip environment markers for now (the part after ;)
    const lineWithoutMarker = line.split(';')[0].trim();

    // Parse package[extras]version
    const match = lineWithoutMarker.match(
      /^([a-zA-Z0-9][-a-zA-Z0-9._]*)(?:\[([^\]]+)\])?\s*((?:[<>=!~]+\s*[\d.]+\s*,?\s*)+)?/
    );

    if (match) {
      const [, name, extras, versionConstraint] = match;

      dependencies.push({
        name: name.toLowerCase(),
        versionConstraint: versionConstraint?.trim(),
        extras: extras ? extras.split(',').map(e => e.trim()) : undefined,
        source: 'requirements.txt',
      });
    }
  }

  return dependencies;
}

/**
 * Parse pyproject.toml format (PEP 621 and Poetry)
 *
 * Uses regex-based parsing since we don't have a TOML parser
 */
export function parsePyprojectToml(content: string): PythonDependency[] {
  const dependencies: PythonDependency[] = [];

  // PEP 621 format: [project] dependencies = [...]
  const pep621Match = content.match(/\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (pep621Match) {
    const deps = extractStringArray(pep621Match[1]);
    for (const dep of deps) {
      const parsed = parseRequirementString(dep);
      if (parsed) {
        dependencies.push({ ...parsed, source: 'pyproject.toml' });
      }
    }
  }

  // PEP 621 optional-dependencies
  const optionalDepsMatches = content.matchAll(
    /\[project\.optional-dependencies\][\s\S]*?(\w+)\s*=\s*\[([\s\S]*?)\]/g
  );
  for (const match of optionalDepsMatches) {
    const deps = extractStringArray(match[2]);
    for (const dep of deps) {
      const parsed = parseRequirementString(dep);
      if (parsed) {
        dependencies.push({
          ...parsed,
          source: 'pyproject.toml',
          isDev: match[1].toLowerCase() === 'dev' || match[1].toLowerCase() === 'test',
        });
      }
    }
  }

  // Poetry format: [tool.poetry.dependencies]
  const poetryDepSection = content.match(
    /\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\[|$)/
  );
  if (poetryDepSection) {
    const sectionContent = poetryDepSection[1];
    // Match: package = "version" or package = { version = "..." }
    const depMatches = sectionContent.matchAll(
      /^([a-zA-Z0-9][-a-zA-Z0-9._]*)\s*=\s*(?:"([^"]+)"|{[^}]*version\s*=\s*"([^"]+)")/gm
    );
    for (const match of depMatches) {
      const name = match[1];
      const version = match[2] || match[3];
      if (name.toLowerCase() !== 'python') {
        dependencies.push({
          name: name.toLowerCase(),
          versionConstraint: version,
          source: 'pyproject.toml',
        });
      }
    }
  }

  // Poetry dev-dependencies
  const poetryDevSection = content.match(
    /\[tool\.poetry\.(?:dev-)?dependencies\]([\s\S]*?)(?=\[|$)/
  );
  if (poetryDevSection && poetryDevSection[0].includes('dev')) {
    const sectionContent = poetryDevSection[1];
    const depMatches = sectionContent.matchAll(
      /^([a-zA-Z0-9][-a-zA-Z0-9._]*)\s*=\s*(?:"([^"]+)"|{[^}]*version\s*=\s*"([^"]+)")/gm
    );
    for (const match of depMatches) {
      const name = match[1];
      const version = match[2] || match[3];
      dependencies.push({
        name: name.toLowerCase(),
        versionConstraint: version,
        source: 'pyproject.toml',
        isDev: true,
      });
    }
  }

  return dependencies;
}

/**
 * Parse setup.py format (basic support)
 *
 * Limited regex-based parsing - only catches common patterns
 */
export function parseSetupPy(content: string): PythonDependency[] {
  const dependencies: PythonDependency[] = [];

  // Match install_requires=[...]
  const installRequiresMatch = content.match(
    /install_requires\s*=\s*\[([\s\S]*?)\]/
  );
  if (installRequiresMatch) {
    const deps = extractStringArray(installRequiresMatch[1]);
    for (const dep of deps) {
      const parsed = parseRequirementString(dep);
      if (parsed) {
        dependencies.push({ ...parsed, source: 'setup.py' });
      }
    }
  }

  // Match extras_require={...}
  const extrasMatch = content.match(
    /extras_require\s*=\s*\{([\s\S]*?)\}/
  );
  if (extrasMatch) {
    // This is complex, just extract string literals
    const stringMatches = extrasMatch[1].matchAll(/"([^"]+)"/g);
    for (const match of stringMatches) {
      const parsed = parseRequirementString(match[1]);
      if (parsed) {
        dependencies.push({ ...parsed, source: 'setup.py', isDev: true });
      }
    }
  }

  return dependencies;
}

/**
 * Parse Pipfile format
 */
export function parsePipfile(content: string): PythonDependency[] {
  const dependencies: PythonDependency[] = [];

  // [packages] section
  const packagesSection = content.match(
    /\[packages\]([\s\S]*?)(?=\[|$)/
  );
  if (packagesSection) {
    const deps = parseIniStyleDeps(packagesSection[1]);
    for (const dep of deps) {
      dependencies.push({ ...dep, source: 'Pipfile' });
    }
  }

  // [dev-packages] section
  const devSection = content.match(
    /\[dev-packages\]([\s\S]*?)(?=\[|$)/
  );
  if (devSection) {
    const deps = parseIniStyleDeps(devSection[1]);
    for (const dep of deps) {
      dependencies.push({ ...dep, source: 'Pipfile', isDev: true });
    }
  }

  return dependencies;
}

/**
 * Helper: Extract strings from a Python-style array
 */
function extractStringArray(content: string): string[] {
  const strings: string[] = [];
  const matches = content.matchAll(/["']([^"']+)["']/g);
  for (const match of matches) {
    strings.push(match[1]);
  }
  return strings;
}

/**
 * Helper: Parse a single requirement string like "package>=1.0.0"
 */
function parseRequirementString(req: string): { name: string; versionConstraint?: string; extras?: string[] } | null {
  const match = req.trim().match(
    /^([a-zA-Z0-9][-a-zA-Z0-9._]*)(?:\[([^\]]+)\])?\s*(.*)?$/
  );

  if (!match) return null;

  const [, name, extras, versionConstraint] = match;

  return {
    name: name.toLowerCase(),
    versionConstraint: versionConstraint?.trim() || undefined,
    extras: extras ? extras.split(',').map(e => e.trim()) : undefined,
  };
}

/**
 * Helper: Parse INI-style dependencies (Pipfile format)
 */
function parseIniStyleDeps(content: string): Array<{ name: string; versionConstraint?: string }> {
  const deps: Array<{ name: string; versionConstraint?: string }> = [];

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Match: package = "version" or package = "*"
    const match = trimmed.match(/^([a-zA-Z0-9][-a-zA-Z0-9._]*)\s*=\s*["']?([^"']+)?["']?/);
    if (match) {
      deps.push({
        name: match[1].toLowerCase(),
        versionConstraint: match[2] === '*' ? undefined : match[2],
      });
    }
  }

  return deps;
}

/**
 * Get all Python dependencies from a project
 */
export async function getPythonDependencies(
  files: Map<string, string>
): Promise<PythonDependency[]> {
  const allDeps: PythonDependency[] = [];

  for (const [filePath, content] of files) {
    const fileName = filePath.split('/').pop() || filePath;

    if (fileName === 'requirements.txt' || fileName.match(/requirements.*\.txt$/)) {
      allDeps.push(...parseRequirementsTxt(content));
    } else if (fileName === 'pyproject.toml') {
      allDeps.push(...parsePyprojectToml(content));
    } else if (fileName === 'setup.py') {
      allDeps.push(...parseSetupPy(content));
    } else if (fileName === 'Pipfile') {
      allDeps.push(...parsePipfile(content));
    }
  }

  // Deduplicate by name (keep first occurrence)
  const seen = new Set<string>();
  return allDeps.filter(dep => {
    if (seen.has(dep.name)) return false;
    seen.add(dep.name);
    return true;
  });
}
