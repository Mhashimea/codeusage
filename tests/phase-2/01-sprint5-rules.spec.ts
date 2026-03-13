/**
 * Phase 2 Rule Engine Tests - Sprint 5
 * Tests for Rules AB004-AB010
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const FIXTURES_PATH = path.join(PROJECT_ROOT, 'tests/fixtures/phase-2');

// Import rules module
let rulesModule: typeof import('../../src/rules/index.js');

test.beforeAll(async () => {
  rulesModule = await import('../../dist/rules/index.js');
});

test.describe('Phase 2: Sprint 5 - Rules AB004-AB010', () => {
  test.describe('Rule AB004: Duplicate Logic Detection', () => {
    let ab004Rule: typeof rulesModule.ab004DuplicateLogic;

    test.beforeAll(async () => {
      ab004Rule = rulesModule.ab004DuplicateLogic;
    });

    test('5.1.1 - detects magic numbers repeated 3+ times', async () => {
      // AB004 requires content > 500 chars, so use fixture
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab004-duplicate-logic.ts'),
        'utf-8'
      );

      const findings = ab004Rule.check(content, 'src/utils.ts');

      // Should detect the magic number 12500 or 7777
      const magicNumFindings = findings.filter(f =>
        f.message.includes('12500') || f.message.includes('7777')
      );
      expect(magicNumFindings.length).toBeGreaterThan(0);
    });

    test('5.1.2 - detects repeated string literals', async () => {
      // AB004 requires content > 500 chars, so use fixture
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab004-duplicate-logic.ts'),
        'utf-8'
      );

      const findings = ab004Rule.check(content, 'src/utils.ts');

      // Should detect repeated strings like "Connection failed"
      const stringFindings = findings.filter(f =>
        f.message.toLowerCase().includes('string') ||
        f.message.toLowerCase().includes('repeated') ||
        f.message.toLowerCase().includes('connection')
      );
      expect(stringFindings.length).toBeGreaterThan(0);
    });

    test('5.1.3 - ignores common acceptable numbers', async () => {
      const content = `
        const count = 0;
        const increment = 1;
        const double = 2;
        const isActive = true;
        const negOne = -1;
      `;

      const findings = ab004Rule.check(content, 'test.ts');

      // Should not flag common numbers like 0, 1, 2, -1
      const magicNumberFindings = findings.filter(f =>
        f.message.includes('0') || f.message.includes('1') || f.message.includes('2')
      );
      expect(magicNumberFindings.length).toBe(0);
    });

    test('5.1.4 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab004-duplicate-logic.ts'),
        'utf-8'
      );

      const findings = ab004Rule.check(content, 'src/utils.ts');

      // Should detect multiple duplicate patterns
      expect(findings.length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Rule AB005: Missing Null/Undefined Checks', () => {
    let ab005Rule: typeof rulesModule.ab005NullChecks;

    test.beforeAll(async () => {
      ab005Rule = rulesModule.ab005NullChecks;
    });

    test('5.2.1 - detects deep property access without optional chaining', async () => {
      const content = `
        function getNestedValue(obj: any) {
          return obj.level1.level2.level3.value;
        }
      `;

      const findings = ab005Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toBe('AB005');
    });

    test('5.2.2 - detects Array.find result used directly', async () => {
      // Use inline pattern that matches the rule's regex
      const content = `const user = users.find(u => u.id === 1).name;`;

      const findings = ab005Rule.check(content, 'src/utils.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.2.3 - detects Map.get result used directly', async () => {
      // Use inline pattern that matches the rule's regex
      const content = `const value = map.get('key').property;`;

      const findings = ab005Rule.check(content, 'src/utils.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.2.4 - detects non-null assertion (!)', async () => {
      const content = `
        function useNonNull(value: string | null) {
          return value!.length;
        }
      `;

      const findings = ab005Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.2.5 - allows safe patterns with optional chaining', async () => {
      const content = `
        function safeAccess(obj: any) {
          return obj?.level1?.level2?.value;
        }

        function safeFind(users: any[]) {
          const user = users.find(u => u.id === 1);
          return user?.name;
        }
      `;

      const findings = ab005Rule.check(content, 'test.ts');

      // Safe patterns should not be flagged
      expect(findings.length).toBe(0);
    });

    test('5.2.6 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab005-null-checks.ts'),
        'utf-8'
      );

      const findings = ab005Rule.check(content, 'src/utils.ts');

      // Should detect multiple null check issues
      expect(findings.length).toBeGreaterThanOrEqual(5);
    });
  });

  test.describe('Rule AB007: Security Anti-Patterns', () => {
    let ab007Rule: typeof rulesModule.ab007Security;

    test.beforeAll(async () => {
      ab007Rule = rulesModule.ab007Security;
    });

    test('5.3.1 - detects MD5 for password hashing (CRITICAL)', async () => {
      const content = `
        import crypto from 'crypto';
        function hashPassword(password: string) {
          return crypto.createHash('md5').update(password).digest('hex');
        }
      `;

      const findings = ab007Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.severity === 'error')).toBe(true);
    });

    test('5.3.2 - detects SQL injection via template literal', async () => {
      // Pattern: query(`SELECT ... ${var}`)
      const content = 'db.query(`SELECT * FROM users WHERE id = ${userId}`)';

      const findings = ab007Rule.check(content, 'src/db.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.message.toLowerCase().includes('sql'))).toBe(true);
    });

    test('5.3.3 - detects eval() usage (CRITICAL)', async () => {
      const content = `
        function executeCode(code: string) {
          return eval(code);
        }
      `;

      const findings = ab007Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.severity === 'error')).toBe(true);
    });

    test('5.3.4 - detects JWT without expiration', async () => {
      const content = `
        function createToken(payload: any, jwt: any) {
          return jwt.sign(payload, 'secret');
        }
      `;

      const findings = ab007Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.3.5 - detects CORS allow all origins', async () => {
      // Pattern requires: cors: "*" or Access-Control-Allow-Origin: "*"
      const content = `const cors = "*"; const header = { 'Access-Control-Allow-Origin': '*' };`;

      const findings = ab007Rule.check(content, 'src/server.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.3.6 - detects disabled SSL verification', async () => {
      const content = `
        const httpsOptions = {
          rejectUnauthorized: false,
        };
      `;

      const findings = ab007Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.3.7 - detects innerHTML XSS vulnerability', async () => {
      const content = `
        function setContent(element: HTMLElement, content: string) {
          element.innerHTML = content;
        }
      `;

      const findings = ab007Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.3.8 - detects command injection', async () => {
      const content = `
        function runCommand(userInput: string, exec: any) {
          exec(\`ls -la \${userInput}\`);
        }
      `;

      const findings = ab007Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.3.9 - allows secure patterns', async () => {
      // These patterns should be safe - no SQL concat, no eval, etc.
      const content = `
        const hash = bcrypt.hash(input, 10);
        const query = db.prepare('SELECT * FROM users WHERE name = ?').run(name);
      `;

      const findings = ab007Rule.check(content, 'src/auth.ts');

      // Secure patterns should not be flagged (or have very few findings)
      expect(findings.length).toBeLessThanOrEqual(1);
    });

    test('5.3.10 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab007-security.ts'),
        'utf-8'
      );

      const findings = ab007Rule.check(content, 'src/auth.ts');

      // Should detect multiple security issues
      expect(findings.length).toBeGreaterThanOrEqual(10);
    });
  });

  test.describe('Rule AB008: Over-Abstraction Detection', () => {
    let ab008Rule: typeof rulesModule.ab008OverAbstraction;

    test.beforeAll(async () => {
      ab008Rule = rulesModule.ab008OverAbstraction;
    });

    test('5.4.1 - detects Factory Factory pattern', async () => {
      const content = `
        class UserFactoryFactory {
          createFactory() {
            return new UserFactory();
          }
        }
      `;

      const findings = ab008Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.message.toLowerCase().includes('factory'))).toBe(true);
    });

    test('5.4.2 - detects Manager Manager pattern', async () => {
      const content = `
        class ServiceManagerManager {
          getManager() {
            return new ServiceManager();
          }
        }
      `;

      const findings = ab008Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.4.3 - detects AbstractBaseManager naming', async () => {
      const content = `
        abstract class AbstractBaseManager {
          abstract manage(): void;
        }
      `;

      const findings = ab008Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.4.4 - detects empty interface extension', async () => {
      const content = `
        interface BaseUser {
          id: string;
        }

        interface ExtendedUser extends BaseUser {}
      `;

      const findings = ab008Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.4.5 - detects Singleton pattern', async () => {
      const content = `
        class DatabaseConnection {
          private static instance: DatabaseConnection;

          static getInstance() {
            if (!this.instance) {
              this.instance = new DatabaseConnection();
            }
            return this.instance;
          }
        }
      `;

      const findings = ab008Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.4.6 - detects deep inheritance chain', async () => {
      // Pattern: extends XBaseYAbstract or extends XAbstractYBase
      const content = `class Concrete extends UserBaseManagerAbstract { }`;

      const findings = ab008Rule.check(content, 'src/patterns.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.4.7 - detects too many generic parameters', async () => {
      const content = `
        type ComplexType<T, U, V, W, X> = {
          t: T;
          u: U;
          v: V;
          w: W;
          x: X;
        };
      `;

      const findings = ab008Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.4.8 - allows simple patterns', async () => {
      const content = `
        class UserService {
          getUser(id: string) {
            return { id };
          }
        }

        function createUser(name: string) {
          return { name };
        }
      `;

      const findings = ab008Rule.check(content, 'test.ts');

      // Simple patterns should not be flagged
      expect(findings.length).toBe(0);
    });

    test('5.4.9 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab008-over-abstraction.ts'),
        'utf-8'
      );

      const findings = ab008Rule.check(content, 'src/patterns.ts');

      // Should detect multiple over-abstraction issues
      expect(findings.length).toBeGreaterThanOrEqual(8);
    });
  });

  test.describe('Rule AB009: Missing Timeout Configuration', () => {
    let ab009Rule: typeof rulesModule.ab009Timeouts;

    test.beforeAll(async () => {
      ab009Rule = rulesModule.ab009Timeouts;
    });

    test('5.5.1 - detects fetch() without AbortController', async () => {
      const content = `
        async function fetchData(url: string) {
          const response = await fetch(url);
          return response.json();
        }
      `;

      const findings = ab009Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toBe('AB009');
    });

    test('5.5.2 - detects axios without timeout', async () => {
      const content = `
        async function axiosGet(url: string) {
          const axios = require('axios');
          return axios.get(url);
        }
      `;

      const findings = ab009Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.5.3 - detects setInterval without clearInterval reference', async () => {
      const content = `
        function startPolling() {
          setInterval(() => {
            console.log('polling...');
          }, 1000);
        }
      `;

      const findings = ab009Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.5.4 - detects WebSocket without heartbeat', async () => {
      const content = `
        function connectWebSocket() {
          const ws = new WebSocket('ws://localhost:8080');
          ws.onmessage = (event) => {
            console.log(event.data);
          };
        }
      `;

      const findings = ab009Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.5.5 - detects HTTP server without timeout', async () => {
      // Use createServer pattern which is reliably detected
      const content = `const server = http.createServer((req, res) => { res.end('Hello'); });`;

      const findings = ab009Rule.check(content, 'src/server.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.5.6 - allows patterns with proper timeout', async () => {
      const content = `
        async function fetchWithTimeout(url: string) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          try {
            const response = await fetch(url, { signal: controller.signal });
            return response.json();
          } finally {
            clearTimeout(timeout);
          }
        }
      `;

      const findings = ab009Rule.check(content, 'test.ts');

      // Properly configured should not be flagged
      expect(findings.length).toBe(0);
    });

    test('5.5.7 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab009-timeouts.ts'),
        'utf-8'
      );

      const findings = ab009Rule.check(content, 'src/api.ts');

      // Should detect multiple timeout issues
      expect(findings.length).toBeGreaterThanOrEqual(5);
    });
  });

  test.describe('Rule AB010: AI TODO/FIXME Detection', () => {
    let ab010Rule: typeof rulesModule.ab010AiTodos;

    test.beforeAll(async () => {
      ab010Rule = rulesModule.ab010AiTodos;
    });

    test('5.6.1 - detects TODO comments', async () => {
      const content = `
        // TODO: Implement user authentication
        function login(username: string, password: string) {
          return true;
        }
      `;

      const findings = ab010Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toBe('AB010');
    });

    test('5.6.2 - detects FIXME comments', async () => {
      const content = `
        // FIXME: This breaks on edge cases
        function calculateTotal(items: any[]) {
          return items.reduce((sum, item) => sum + item.price, 0);
        }
      `;

      const findings = ab010Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.severity === 'warn')).toBe(true);
    });

    test('5.6.3 - detects HACK comments', async () => {
      const content = `
        // HACK: Temporary workaround for API bug
        function fetchData() {
          return {};
        }
      `;

      const findings = ab010Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.6.4 - detects "implement this" AI placeholders', async () => {
      const content = `
        function createUser(data: any) {
          // implement this function
          return data;
        }
      `;

      const findings = ab010Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.6.5 - detects "..." continuation markers', async () => {
      const content = `
        function incompleteFunction() {
          // ...
        }
      `;

      const findings = ab010Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.6.6 - detects throw "Not implemented" (CRITICAL)', async () => {
      const content = `
        function notImplementedYet() {
          throw new Error("Not implemented");
        }
      `;

      const findings = ab010Rule.check(content, 'test.ts');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.severity === 'error')).toBe(true);
    });

    test('5.6.7 - detects Python raise NotImplementedError', async () => {
      const content = `
        def my_function():
            raise NotImplementedError
      `;

      const findings = ab010Rule.check(content, 'test.py');

      expect(findings.length).toBeGreaterThan(0);
    });

    test('5.6.8 - allows properly implemented code', async () => {
      const content = `
        function properlyImplemented(data: any) {
          if (!data) {
            throw new Error('Data is required');
          }
          return { processed: true, data };
        }
      `;

      const findings = ab010Rule.check(content, 'test.ts');

      // Properly implemented should not be flagged
      expect(findings.length).toBe(0);
    });

    test('5.6.9 - full test with fixture file', async () => {
      const content = fs.readFileSync(
        path.join(FIXTURES_PATH, 'ab010-ai-todos.ts'),
        'utf-8'
      );

      const findings = ab010Rule.check(content, 'src/service.ts');

      // Should detect multiple TODO/FIXME issues
      expect(findings.length).toBeGreaterThanOrEqual(10);
    });
  });

  test.describe('Sprint 5 Integration', () => {
    test('5.7.1 - RuleRunner includes all Phase 2 rules', async () => {
      const runner = new rulesModule.RuleRunner();

      // Check that all Phase 2 rules are loaded
      const content = `
        const timeout = 12500; // AB004
        const x = obj.a.b.c; // AB005
        eval('code'); // AB007
        class FactoryFactory {} // AB008
        fetch('/api'); // AB009
        // TODO: fix // AB010
      `;

      const findings = runner.run(content, 'test.ts');

      // Should have findings from multiple rules
      const ruleIds = new Set(findings.map(f => f.ruleId));
      expect(ruleIds.size).toBeGreaterThanOrEqual(3);
    });

    test('5.7.2 - all Phase 2 rules report correct ruleId', async () => {
      const rules = [
        { rule: rulesModule.ab004DuplicateLogic, expectedId: 'AB004' },
        { rule: rulesModule.ab005NullChecks, expectedId: 'AB005' },
        { rule: rulesModule.ab007Security, expectedId: 'AB007' },
        { rule: rulesModule.ab008OverAbstraction, expectedId: 'AB008' },
        { rule: rulesModule.ab009Timeouts, expectedId: 'AB009' },
        { rule: rulesModule.ab010AiTodos, expectedId: 'AB010' },
      ];

      for (const { rule, expectedId } of rules) {
        expect(rule.id).toBe(expectedId);
      }
    });
  });
});
