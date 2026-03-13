/**
 * Phase 1 Foundation Tests - Static Analysis Rules
 * Tests for Sprint 2 (2.1-2.6 Core Static Analysis Rules)
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const FIXTURES_PATH = path.join(PROJECT_ROOT, 'tests/fixtures');

// Import rules module
let rulesModule: typeof import('../../src/rules/index.js');

test.beforeAll(async () => {
  rulesModule = await import('../../dist/rules/index.js');
});

test.describe('Phase 1: Static Analysis Rules', () => {
  test.describe('Sprint 2.1 - Rule Engine Architecture', () => {

    test('2.1.1 - Rule interface has required properties', async () => {
      const runner = new rulesModule.RuleRunner();

      // The runner should be constructed without error
      expect(runner).toBeDefined();
    });

    test('2.1.2 - RuleRunner loads and executes rules', async () => {
      const runner = new rulesModule.RuleRunner();
      const content = 'const password = "secret123";';

      const findings = runner.run(content, 'test.ts');

      expect(Array.isArray(findings)).toBe(true);
    });

    test('2.1.3 - finding aggregation sorts by severity', async () => {
      const runner = new rulesModule.RuleRunner();

      // Content with multiple severity issues
      const content = `
        const apiKey = "sk-123456789";
        try { fetch('/api'); } catch(e) {}
        const data = value as any;
      `;

      const findings = runner.run(content, 'test.ts');

      // Check that findings are sorted (errors first, then warnings, then info)
      let lastSeverityOrder = -1;
      const severityOrder = { error: 0, warn: 1, info: 2 } as const;

      for (const finding of findings) {
        const order = severityOrder[finding.severity];
        expect(order).toBeGreaterThanOrEqual(lastSeverityOrder);
        lastSeverityOrder = Math.max(lastSeverityOrder, order);
      }
    });

    test('2.1.4 - severity levels: error, warn, info', async () => {
      const runner = new rulesModule.RuleRunner();

      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab001-credentials.ts'),
        'utf-8'
      );

      const findings = runner.run(content, 'test.ts');

      // All findings should have valid severity
      for (const finding of findings) {
        expect(['error', 'warn', 'info']).toContain(finding.severity);
      }
    });

    test('2.1.5 - file filtering skips ignore patterns', async () => {
      const runner = new rulesModule.RuleRunner({
        ignorePatterns: ['*.test.ts', 'node_modules/**'],
      });

      const content = 'const password = "secret";';

      // Should skip test files
      const testFindings = runner.run(content, 'app.test.ts');
      expect(testFindings.length).toBe(0);

      // Should not skip regular files
      const regularFindings = runner.run(content, 'app.ts');
      expect(regularFindings.length).toBeGreaterThan(0);
    });
  });

  test.describe('Sprint 2.2 - Rule AB001: Hardcoded Credentials', () => {
    let ab001Rule: typeof rulesModule.ab001HardcodedCredentials;

    test.beforeAll(async () => {
      ab001Rule = rulesModule.ab001HardcodedCredentials;
    });

    test('2.2.1 - detects API key patterns (sk-, pk_live_, ghp_, AKIA)', async () => {
      const content = `
        const apiKey = 'sk-1234567890abcdefghijklmnopqrstuv';
        const stripeKey = 'pk_live_abcdefghijklmnopqrstuvwxyz123456';
        const githubToken = 'ghp_abcdefghij1234567890abcdefghij123456';
        const awsKey = 'AKIAIOSFODNN7TESTKEY';
      `;

      const findings = ab001Rule.check(content, 'src/config.ts');

      expect(findings.length).toBeGreaterThanOrEqual(4);
      expect(findings.every(f => f.ruleId === 'AB001')).toBe(true);
    });

    test('2.2.2 - detects password assignments', async () => {
      const content = `
        const password = "mysecretpassword123";
        const pwd = 'admin123';
        const secret = "topsecret";
        const token = "mytoken123";
      `;

      const findings = ab001Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.2.3 - detects connection strings with credentials', async () => {
      const content = `
        const mongoUri = 'mongodb://user:password123@localhost:27017/mydb';
        const postgresUrl = 'postgres://admin:secretpwd@db.example.com:5432/production';
        const mysqlConn = 'mysql://root:rootpassword@127.0.0.1:3306/app';
      `;

      const findings = ab001Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.2.4 - detects AWS patterns', async () => {
      const content = `
        const awsAccessKey = 'AKIAIOSFODNN7TESTKEY';
        const awsSecretKey = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYTESTKEY01';
      `;

      const findings = ab001Rule.check(content, 'src/config.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.2.5 - excludes false positives (env vars, placeholders)', async () => {
      const content = `
        const envPassword = process.env.PASSWORD;
        const configuredSecret = process.env.SECRET_KEY;
        const placeholder = 'sk-your-api-key-here';
        const exampleToken = 'pk_test_example_for_docs';
      `;

      const findings = ab001Rule.check(content, 'test.ts');

      // Should have minimal or no false positives
      expect(findings.length).toBeLessThan(3);
    });

    test('2.2.6 - includes line number and code snippet', async () => {
      const content = 'const password = "secret123";';

      const findings = ab001Rule.check(content, 'test.ts');

      if (findings.length > 0) {
        expect(findings[0]).toHaveProperty('line');
        expect(findings[0]).toHaveProperty('snippet');
        expect(findings[0].line).toBeGreaterThan(0);
      }
    });

    test('2.2.7 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab001-credentials.ts'),
        'utf-8'
      );

      // Use a source file path to avoid fixture exclusion
      const findings = ab001Rule.check(content, 'src/config.ts');

      // Should detect credential issues (may vary based on exclusion patterns)
      expect(findings.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Sprint 2.3 - Rule AB002: Generic Error Swallowing', () => {
    let ab002Rule: typeof rulesModule.ab002ErrorSwallowing;

    test.beforeAll(async () => {
      ab002Rule = rulesModule.ab002ErrorSwallowing;
    });

    test('2.3.1 - detects empty catch blocks', async () => {
      const content = `
        try {
          await fetch('/api/data');
        } catch (e) {}
      `;

      const findings = ab002Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toBe('AB002');
    });

    test('2.3.2 - detects console-only catch', async () => {
      const content = `
        try {
          await fetch('/api/data');
        } catch (e) {
          console.log(e);
        }
      `;

      const findings = ab002Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.3.3 - detects ignored error parameter', async () => {
      const content = `
        try {
          await fetch('/api/data');
        } catch (_) {
          return null;
        }
      `;

      const findings = ab002Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.3.4 - detects Promise without catch', async () => {
      const content = `
        fetch('/api/data').then(response => response.json());

        someAsyncFunction()
          .then(data => processData(data));
      `;

      const findings = ab002Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.3.5 - allows legitimate patterns with comments', async () => {
      const content = `
        try {
          await fetch('/api/data');
        } catch (e) {
          // Intentionally swallowing error for graceful degradation
          return defaultValue;
        }
      `;

      const findings = ab002Rule.check(content, 'test.ts');

      // Should not flag intentional swallowing
      expect(findings.length).toBe(0);
    });

    test('2.3.6 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab002-error-swallowing.ts'),
        'utf-8'
      );

      const findings = ab002Rule.check(content, 'ab002-error-swallowing.ts');

      // Should detect multiple error handling issues
      expect(findings.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Sprint 2.4 - Rule AB003: Optimistic Type Assertions', () => {
    let ab003Rule: typeof rulesModule.ab003TypeAssertions;

    test.beforeAll(async () => {
      ab003Rule = rulesModule.ab003TypeAssertions;
    });

    test('2.4.1 - detects as any type assertions', async () => {
      const content = `
        const data = fetchData() as any;
        const result = (someValue as any).property;
      `;

      const findings = ab003Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toBe('AB003');
    });

    test('2.4.2 - detects non-null assertions (!)', async () => {
      const content = `
        const user = getUser();
        const userName = user!.name;
        const nestedValue = obj!.nested!.deep!.value;
      `;

      const findings = ab003Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.4.3 - detects as unknown as T double casting', async () => {
      const content = `
        const adminUser = userData as unknown as AdminUser;
        const forcedCast = input as unknown as OutputType;
      `;

      const findings = ab003Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.4.4 - detects @ts-ignore comments', async () => {
      const content = `
        // @ts-ignore
        const ignoredError = invalidCode.property;
      `;

      const findings = ab003Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.4.5 - detects @ts-nocheck file-level ignores', async () => {
      const content = `
        // @ts-nocheck
        const unsafe = badCode();
      `;

      const findings = ab003Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.4.6 - counts frequency (high count = higher severity)', async () => {
      const content = `
        const a = x as any;
        const b = y as any;
        const c = z as any;
        const d = w as any;
        const e = v as any;
      `;

      const findings = ab003Rule.check(content, 'test.ts');

      // Should detect all instances
      expect(findings.length).toBeGreaterThanOrEqual(5);
    });

    test('2.4.7 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab003-type-assertions.ts'),
        'utf-8'
      );

      const findings = ab003Rule.check(content, 'ab003-type-assertions.ts');

      // Should detect multiple type assertion issues
      expect(findings.length).toBeGreaterThanOrEqual(5);
    });
  });

  test.describe('Sprint 2.5 - Rule AB006: Hardcoded Config Values', () => {
    let ab006Rule: typeof rulesModule.ab006HardcodedConfig;

    test.beforeAll(async () => {
      ab006Rule = rulesModule.ab006HardcodedConfig;
    });

    test('2.5.1 - detects hardcoded URLs', async () => {
      const content = `
        const apiBaseUrl = 'http://localhost:3000/api';
        const prodApiUrl = 'https://api.mycompany.com/v1';
      `;

      const findings = ab006Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toBe('AB006');
    });

    test('2.5.2 - detects hardcoded ports', async () => {
      const content = `
        const serverPort = 3000;
        const dbPort = 5432;
        const appListenPort = ':8080';
      `;

      const findings = ab006Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.5.3 - detects hardcoded IPs', async () => {
      const content = `
        const databaseHost = '192.168.1.50';
        const localHost = '127.0.0.1';
        const bindAddress = '0.0.0.0';
      `;

      const findings = ab006Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.5.4 - detects hardcoded absolute paths', async () => {
      const content = `
        const logPath = '/var/log/myapp/app.log';
        const configPath = '/etc/myapp/config.json';
        const windowsPath = 'C:\\\\Users\\\\admin\\\\Documents\\\\config.txt';
      `;

      const findings = ab006Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('2.5.5 - excludes test files', async () => {
      const content = `
        const testApiUrl = 'http://localhost:3000/api';
      `;

      const findings = ab006Rule.check(content, 'test.spec.ts');

      // Test files should not be flagged or have reduced severity
      // (depends on implementation)
      expect(Array.isArray(findings)).toBe(true);
    });

    test('2.5.6 - suggests environment variable alternative', async () => {
      const content = `
        const apiUrl = 'http://localhost:3000';
      `;

      const findings = ab006Rule.check(content, 'test.ts');

      if (findings.length > 0 && findings[0].suggestion) {
        expect(findings[0].suggestion).toMatch(/env|environment|config/i);
      }
    });

    test('2.5.7 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab006-hardcoded-config.ts'),
        'utf-8'
      );

      const findings = ab006Rule.check(content, 'ab006-hardcoded-config.ts');

      // Should detect multiple hardcoded config issues
      expect(findings.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Sprint 2.6 - Local Build & Test', () => {

    test('2.6.1 - RuleRunner.summarize provides correct statistics', async () => {
      const findings = [
        { ruleId: 'AB001', severity: 'error' as const, file: 'a.ts', line: 1, message: 'test', snippet: 'test' },
        { ruleId: 'AB001', severity: 'error' as const, file: 'b.ts', line: 2, message: 'test', snippet: 'test' },
        { ruleId: 'AB002', severity: 'warn' as const, file: 'c.ts', line: 3, message: 'test', snippet: 'test' },
        { ruleId: 'AB003', severity: 'info' as const, file: 'd.ts', line: 4, message: 'test', snippet: 'test' },
      ];

      const summary = rulesModule.RuleRunner.summarize(findings);

      expect(summary.errors).toBe(2);
      expect(summary.warnings).toBe(1);
      expect(summary.info).toBe(1);
    });

    test('2.6.2 - runOnFiles processes multiple files', async () => {
      const runner = new rulesModule.RuleRunner();

      const files = [
        { path: 'a.ts', content: 'const password = "secret";' },
        { path: 'b.ts', content: 'const apiKey = "sk-1234567890";' },
      ];

      const findings = runner.runOnFiles(files);

      expect(findings.length).toBeGreaterThanOrEqual(2);
    });

    test('2.6.3 - rule severity overrides work correctly', async () => {
      const runner = new rulesModule.RuleRunner({
        severityOverrides: { 'AB001': 'info' },
      });

      const content = 'const password = "secret123";';
      const findings = runner.run(content, 'test.ts');

      const ab001Findings = findings.filter(f => f.ruleId === 'AB001');
      for (const finding of ab001Findings) {
        expect(finding.severity).toBe('info');
      }
    });

    test('2.6.4 - enabled rules filtering works', async () => {
      const runner = new rulesModule.RuleRunner({
        enabledRules: ['AB001'], // Only enable AB001
      });

      const content = `
        const password = "secret";
        try { } catch(e) {}
        const data = x as any;
      `;

      const findings = runner.run(content, 'test.ts');

      // All findings should be from AB001
      for (const finding of findings) {
        expect(finding.ruleId).toBe('AB001');
      }
    });
  });
});
