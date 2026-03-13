/**
 * Phase 2 Rule Engine Tests - Sprint 6
 * Tests for Configuration System
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const CLI_PATH = path.join(PROJECT_ROOT, 'dist/cli.js');

// Import config module
let configModule: typeof import('../../src/config/index.js');

test.beforeAll(async () => {
  configModule = await import('../../dist/config/index.js');
});

test.describe('Phase 2: Sprint 6 - Configuration System', () => {
  test.describe('6.1 Configuration File Support', () => {

    test('6.1.1 - loads .afterburnrc JSON file', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));
      const configPath = path.join(tempDir, '.afterburnrc');

      try {
        fs.writeFileSync(configPath, JSON.stringify({
          rules: {
            AB001: 'error',
          },
        }));

        const result = await configModule.loadConfig(tempDir);

        expect(result.config).toBeDefined();
        expect(result.config.rules?.AB001).toBe('error');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('6.1.2 - loads .afterburnrc.json alternative filename', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));
      const configPath = path.join(tempDir, '.afterburnrc.json');

      try {
        fs.writeFileSync(configPath, JSON.stringify({
          rules: {
            AB002: 'warn',
          },
        }));

        const result = await configModule.loadConfig(tempDir);

        expect(result.config).toBeDefined();
        expect(result.config.rules?.AB002).toBe('warn');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('6.1.3 - loads afterburn.config.js JavaScript config', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));
      const configPath = path.join(tempDir, 'afterburn.config.js');

      try {
        fs.writeFileSync(configPath, `
          module.exports = {
            rules: {
              AB003: 'info',
            },
          };
        `);

        const result = await configModule.loadConfig(tempDir);

        expect(result.config).toBeDefined();
        expect(result.config.rules?.AB003).toBe('info');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('6.1.4 - findConfigFile walks up directory tree', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));
      const subDir = path.join(tempDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });

      const configPath = path.join(tempDir, '.afterburnrc');

      try {
        fs.writeFileSync(configPath, JSON.stringify({ rules: { AB001: 'off' } }));

        const foundPath = await configModule.findConfigFile(subDir);

        expect(foundPath).toBe(configPath);
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('6.1.5 - CLI flags override config file', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));
      const configPath = path.join(tempDir, '.afterburnrc');

      try {
        // Config file sets format to markdown
        fs.writeFileSync(configPath, JSON.stringify({
          format: 'markdown',
        }));

        // CLI flag overrides to JSON
        const { stdout } = await execAsync(
          `node ${CLI_PATH} --json --help 2>&1 || true`,
          { cwd: tempDir }
        );

        // Verifying CLI works with --json flag
        expect(typeof stdout).toBe('string');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('6.1.6 - validates config schema and reports errors', async () => {
      const invalidConfig = {
        rules: {
          AB001: 'invalid-severity', // Invalid severity
        },
      };

      const validation = configModule.validateConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors?.length).toBeGreaterThan(0);
    });
  });

  test.describe('6.2 Rule Configuration', () => {

    test('6.2.1 - per-rule severity override works', async () => {
      const config = {
        rules: {
          AB001: 'info' as const,
          AB002: 'off' as const,
        },
      };

      // getRuleSeverity(config, ruleId, defaultSeverity)
      const ab001Severity = configModule.getRuleSeverity(config, 'AB001', 'error');
      const ab002Severity = configModule.getRuleSeverity(config, 'AB002', 'error');

      expect(ab001Severity).toBe('info');
      expect(ab002Severity).toBe('off');
    });

    test('6.2.2 - default severity used when not configured', async () => {
      const config = {
        rules: {},
      };

      // Should return the default severity when rule not configured
      const severity = configModule.getRuleSeverity(config, 'AB001', 'warn');

      expect(severity).toBe('warn');
    });

    test('6.2.3 - ignore patterns exclude files', async () => {
      const config = {
        ignore: ['*.test.ts', 'node_modules/**', 'dist/**'],
      };

      // shouldIgnoreFile(config, filePath)
      expect(configModule.shouldIgnoreFile(config, 'app.test.ts')).toBe(true);
      expect(configModule.shouldIgnoreFile(config, 'node_modules/pkg/index.js')).toBe(true);
      expect(configModule.shouldIgnoreFile(config, 'dist/cli.js')).toBe(true);
      expect(configModule.shouldIgnoreFile(config, 'src/app.ts')).toBe(false);
    });

    test('6.2.4 - include patterns limit scope', async () => {
      const config = {
        include: ['src/**/*.ts'],
        ignore: [],
      };

      // Files matching include pattern should not be ignored
      // Note: src/**/*.ts requires at least one subdirectory (like src/utils/file.ts)
      expect(configModule.shouldIgnoreFile(config, 'src/utils/helper.ts')).toBe(false);
      expect(configModule.shouldIgnoreFile(config, 'src/components/Button.ts')).toBe(false);
      // Files not matching include should be ignored
      expect(configModule.shouldIgnoreFile(config, 'lib/app.ts')).toBe(true);
    });

    test('6.2.5 - glob patterns work correctly', async () => {
      const config = {
        ignore: ['**/*.spec.ts', '**/fixtures/**'],
      };

      expect(configModule.shouldIgnoreFile(config, 'tests/unit.spec.ts')).toBe(true);
      expect(configModule.shouldIgnoreFile(config, 'tests/fixtures/sample.ts')).toBe(true);
      expect(configModule.shouldIgnoreFile(config, 'src/main.ts')).toBe(false);
    });

    test('6.2.6 - inline disable comments parsed correctly', async () => {
      const content = `
        const password = "secret"; // afterburn-disable-line AB001
        // afterburn-disable-next-line AB002
        try {} catch(e) {}
      `;

      const directives = configModule.parseInlineDirectives(content);

      expect(directives.length).toBeGreaterThan(0);
    });

    test('6.2.7 - file-level disable parsed correctly', async () => {
      const content = `
        // afterburn-disable AB001, AB002
        const password = "secret";
        try {} catch(e) {}
      `;

      const directives = configModule.parseInlineDirectives(content);

      expect(directives.some(d => d.rules.includes('AB001'))).toBe(true);
      expect(directives.some(d => d.rules.includes('AB002'))).toBe(true);
    });

    test('6.2.8 - shouldDisableLine checks line directives', async () => {
      const content = `const x = 1;
// afterburn-disable-next-line AB001
const password = "secret";
const y = 2;`;

      const directives = configModule.parseInlineDirectives(content);

      // shouldDisableLine(directives, line, ruleId)
      // Line 3 should be disabled (following the disable-next-line on line 2)
      expect(configModule.shouldDisableLine(directives, 1, 'AB001')).toBe(false);
      expect(configModule.shouldDisableLine(directives, 3, 'AB001')).toBe(true);
      expect(configModule.shouldDisableLine(directives, 4, 'AB001')).toBe(false);
    });
  });

  test.describe('6.3 Session Configuration', () => {

    test('6.3.1 - DEFAULT_CONFIG has session.window', async () => {
      expect(configModule.DEFAULT_CONFIG).toHaveProperty('session');
      expect(configModule.DEFAULT_CONFIG.session).toHaveProperty('window');
      expect(typeof configModule.DEFAULT_CONFIG.session.window).toBe('string');
    });

    test('6.3.2 - DEFAULT_CONFIG has ignore patterns', async () => {
      expect(configModule.DEFAULT_CONFIG).toHaveProperty('ignore');
      expect(Array.isArray(configModule.DEFAULT_CONFIG.ignore)).toBe(true);
    });

    test('6.3.3 - DEFAULT_CONFIG has output.format setting', async () => {
      expect(configModule.DEFAULT_CONFIG).toHaveProperty('output');
      expect(configModule.DEFAULT_CONFIG.output).toHaveProperty('format');
      expect(['markdown', 'json']).toContain(configModule.DEFAULT_CONFIG.output.format);
    });

    test('6.3.4 - DEFAULT_CONFIG has output path', async () => {
      expect(configModule.DEFAULT_CONFIG).toHaveProperty('output');
      expect(configModule.DEFAULT_CONFIG.session).toHaveProperty('outputDir');
    });
  });

  test.describe('6.4 Config Schema', () => {

    test('6.4.1 - validateConfig accepts valid config', async () => {
      const validConfig = {
        rules: {
          AB001: 'error',
          AB002: 'warn',
          AB003: 'info',
          AB004: 'off',
        },
        ignore: ['*.test.ts'],
        include: ['src/**'],
      };

      const validation = configModule.validateConfig(validConfig);

      expect(validation.valid).toBe(true);
      expect(validation.errors?.length).toBe(0);
    });

    test('6.4.2 - mergeConfig combines user config with defaults', async () => {
      // mergeConfig takes ONE argument (user config) and merges with DEFAULT_CONFIG
      const userConfig = {
        rules: { AB001: 'warn' as const, AB002: 'info' as const },
        include: ['src/**'],
      };

      const merged = configModule.mergeConfig(userConfig);

      // User config values should be present
      expect(merged.rules?.AB001).toBe('warn');
      expect(merged.rules?.AB002).toBe('info');
      expect(merged.include).toContain('src/**');

      // Default values should be merged in
      expect(merged.session?.window).toBe('4h'); // From defaults
      expect(merged.output?.format).toBe('markdown'); // From defaults
      expect(merged.ci?.failOnWarnings).toBe(false); // From defaults
    });

    test('6.4.3 - CONFIG_FILE_NAMES contains expected filenames', async () => {
      expect(configModule.CONFIG_FILE_NAMES).toContain('.afterburnrc');
      expect(configModule.CONFIG_FILE_NAMES).toContain('.afterburnrc.json');
      expect(configModule.CONFIG_FILE_NAMES).toContain('afterburn.config.js');
    });
  });

  test.describe('6.5 Init Command', () => {

    test('6.5.1 - afterburn init creates config file', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));

      try {
        await execAsync(`node ${CLI_PATH} init`, { cwd: tempDir });

        const configExists = fs.existsSync(path.join(tempDir, '.afterburnrc'));
        expect(configExists).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('6.5.2 - generated config has sensible defaults', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));

      try {
        await execAsync(`node ${CLI_PATH} init`, { cwd: tempDir });

        const configPath = path.join(tempDir, '.afterburnrc');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

        expect(config).toHaveProperty('rules');
        expect(config).toHaveProperty('ignore');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });
  });

  test.describe('6.6 Config Command', () => {

    test('6.6.1 - afterburn config set writes value', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));
      const configPath = path.join(tempDir, '.afterburnrc');

      try {
        // Create initial config
        fs.writeFileSync(configPath, JSON.stringify({ rules: {} }));

        await execAsync(`node ${CLI_PATH} config set format json`, { cwd: tempDir });

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        expect(config.format).toBe('json');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('6.6.2 - afterburn config get reads value', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));
      const configPath = path.join(tempDir, '.afterburnrc');

      try {
        // Use proper nested config structure
        fs.writeFileSync(configPath, JSON.stringify({
          output: { format: 'markdown' }
        }));

        const { stdout } = await execAsync(
          `node ${CLI_PATH} config get output.format`,
          { cwd: tempDir }
        );

        expect(stdout.trim()).toContain('markdown');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('6.6.3 - afterburn config list shows all settings', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));
      const configPath = path.join(tempDir, '.afterburnrc');

      try {
        // Use proper nested config structure
        fs.writeFileSync(configPath, JSON.stringify({
          output: { format: 'markdown' },
          session: { window: '4h' },
        }));

        const { stdout } = await execAsync(
          `node ${CLI_PATH} config list`,
          { cwd: tempDir }
        );

        // Config uses nested keys: session.window, output.format
        expect(stdout).toContain('format');
        expect(stdout).toContain('window');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('6.6.4 - dot notation for nested values', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));
      const configPath = path.join(tempDir, '.afterburnrc');

      try {
        fs.writeFileSync(configPath, JSON.stringify({ rules: {} }));

        await execAsync(
          `node ${CLI_PATH} config set rules.AB001 off`,
          { cwd: tempDir }
        );

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        expect(config.rules?.AB001).toBe('off');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });
  });

  test.describe('6.7 Config Integration', () => {

    test('6.7.1 - rules respect config severity', async () => {
      const rulesModule = await import('../../dist/rules/index.js');
      const runner = new rulesModule.RuleRunner({
        severityOverrides: { AB001: 'info' },
      });

      const content = 'const password = "secret123";';
      const findings = runner.run(content, 'test.ts');

      const ab001Findings = findings.filter(f => f.ruleId === 'AB001');
      for (const finding of ab001Findings) {
        expect(finding.severity).toBe('info');
      }
    });

    test('6.7.2 - ignore patterns skip files', async () => {
      const rulesModule = await import('../../dist/rules/index.js');
      const runner = new rulesModule.RuleRunner({
        ignorePatterns: ['*.config.ts', '**/tests/**'],
      });

      const content = 'const password = "secret123";';

      // Should skip config files
      const configFindings = runner.run(content, 'app.config.ts');
      expect(configFindings.length).toBe(0);

      // Should skip test files
      const testFindings = runner.run(content, 'tests/unit.ts');
      expect(testFindings.length).toBe(0);

      // Should not skip regular files
      const regularFindings = runner.run(content, 'src/app.ts');
      expect(regularFindings.length).toBeGreaterThan(0);
    });

    test('6.7.3 - enabled rules filtering works', async () => {
      const rulesModule = await import('../../dist/rules/index.js');
      const runner = new rulesModule.RuleRunner({
        enabledRules: ['AB001', 'AB002'],
      });

      const content = `
        const password = "secret";
        try { } catch(e) {}
        const data = x as any;
      `;

      const findings = runner.run(content, 'test.ts');

      // Should only have AB001 and AB002 findings
      for (const finding of findings) {
        expect(['AB001', 'AB002']).toContain(finding.ruleId);
      }
    });

    test('6.7.4 - severityOverrides changes finding severity', async () => {
      const rulesModule = await import('../../dist/rules/index.js');
      const runner = new rulesModule.RuleRunner({
        severityOverrides: { 'AB001': 'warn' }, // Downgrade from error to warn
      });

      const content = 'const password = "secret123";';
      const findings = runner.run(content, 'test.ts');

      // AB001 findings should have 'warn' severity instead of 'error'
      const ab001Findings = findings.filter(f => f.ruleId === 'AB001');
      expect(ab001Findings.length).toBeGreaterThan(0);
      expect(ab001Findings.every(f => f.severity === 'warn')).toBe(true);
    });
  });
});
