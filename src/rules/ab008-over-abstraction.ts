/**
 * AB008: Over-Abstraction Detection
 *
 * Detects patterns that indicate over-engineering or unnecessary abstraction:
 * - Factory of factories
 * - Manager/Handler/Helper naming anti-patterns
 * - Single-method interfaces/classes
 * - Wrapper functions with no added value
 * - Excessive indirection layers
 * - Over-generic naming (AbstractBaseManager)
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

interface AbstractionPattern {
  name: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warn' | 'info';
  suggestion?: string;
}

// ============================================================================
// NAMING ANTI-PATTERNS
// ============================================================================
const NAMING_PATTERNS: AbstractionPattern[] = [
  // Factory of factories
  {
    name: 'Factory Factory',
    pattern: /(?:class|interface|type)\s+\w*FactoryFactory/g,
    message: 'Factory of factories indicates over-engineering',
    severity: 'warn',
    suggestion: 'Consider simplifying the creation pattern',
  },
  // Manager of managers
  {
    name: 'Manager Manager',
    pattern: /(?:class|interface|type)\s+\w*ManagerManager/g,
    message: 'Manager of managers indicates over-abstraction',
    severity: 'warn',
    suggestion: 'Consider flattening the management hierarchy',
  },
  // Handler of handlers
  {
    name: 'Handler Handler',
    pattern: /(?:class|interface|type)\s+\w*HandlerHandler/g,
    message: 'Handler of handlers indicates over-abstraction',
    severity: 'warn',
    suggestion: 'Consider simplifying the handler chain',
  },
  // Abstract base with manager/handler/helper
  {
    name: 'Abstract Base Pattern',
    pattern: /(?:class|interface)\s+Abstract(?:Base)?(?:Manager|Handler|Helper|Service|Controller)\b/g,
    message: 'Abstract base class with generic naming may be over-engineered',
    severity: 'info',
    suggestion: 'Consider if this abstraction is necessary',
  },
  // Generic "Utils" or "Helpers" class
  {
    name: 'Generic Utils Class',
    pattern: /(?:class|interface)\s+(?:Generic)?(?:Utils|Helpers|Common|Misc)(?:Class)?\b/g,
    message: 'Generic utility class may indicate poor code organization',
    severity: 'info',
    suggestion: 'Consider grouping utilities by domain instead',
  },
  // IAbstractBaseSomething naming
  {
    name: 'Over-prefixed Interface',
    pattern: /interface\s+I(?:Abstract)?(?:Base)?\w+(?:Interface|Base|Abstract)/g,
    message: 'Over-prefixed interface name indicates redundant naming',
    severity: 'info',
    suggestion: 'Simplify interface naming',
  },
  // Enterprise-style naming
  {
    name: 'Enterprise Naming',
    pattern: /(?:class|interface)\s+\w*(?:Impl|Implementation|Concrete|Default)(?:Class|Impl)?$/gm,
    message: 'Enterprise-style naming pattern may indicate over-abstraction',
    severity: 'info',
    suggestion: 'Consider simpler, more descriptive naming',
  },
];

// ============================================================================
// STRUCTURAL ANTI-PATTERNS
// ============================================================================
const STRUCTURAL_PATTERNS: AbstractionPattern[] = [
  // Singleton pattern
  {
    name: 'Singleton Instance',
    pattern: /private\s+static\s+(?:_)?instance\s*[:=]|static\s+getInstance\s*\(\s*\)/g,
    message: 'Singleton pattern can make testing difficult',
    severity: 'info',
    suggestion: 'Consider dependency injection instead',
  },
  // Empty interface extending another
  {
    name: 'Empty Interface',
    pattern: /interface\s+\w+\s+extends\s+\w+\s*\{\s*\}/g,
    message: 'Empty interface extension adds unnecessary indirection',
    severity: 'warn',
    suggestion: 'Use the parent interface directly or add meaningful members',
  },
  // Class with only constructor
  {
    name: 'Constructor Only Class',
    pattern: /class\s+\w+\s*\{[^}]*constructor\s*\([^)]*\)\s*\{[^}]*\}\s*\}/g,
    message: 'Class with only constructor may be an unnecessary wrapper',
    severity: 'info',
    suggestion: 'Consider using a plain object or function instead',
  },
  // Proxy that just delegates
  {
    name: 'Pure Delegation',
    pattern: /(?:get|set)\s+(\w+)\s*\([^)]*\)\s*\{\s*return\s+this\.\w+\.\1\s*[;(]/g,
    message: 'Property that purely delegates may be unnecessary indirection',
    severity: 'info',
    suggestion: 'Expose the underlying property directly if appropriate',
  },
  // Builder pattern detection (can be over-engineering for simple objects)
  {
    name: 'Builder Pattern',
    pattern: /class\s+\w+Builder\s*\{[\s\S]*?build\s*\(\s*\)\s*[:{]/g,
    message: 'Builder pattern detected - ensure object complexity warrants it',
    severity: 'info',
    suggestion: 'Simple objects may not need the builder pattern',
  },
];

// ============================================================================
// WRAPPER/INDIRECTION PATTERNS
// ============================================================================
const WRAPPER_PATTERNS: AbstractionPattern[] = [
  // Function that just calls another function
  {
    name: 'Pass-through Function',
    pattern: /(?:function|const|let)\s+(\w+)\s*=?\s*(?:\([^)]*\)|async\s*\([^)]*\))\s*(?::\s*\w+)?\s*(?:=>|{)\s*(?:return\s+)?(\w+)\s*\(/g,
    message: 'Function appears to be a pass-through wrapper',
    severity: 'info',
    suggestion: 'Consider calling the underlying function directly',
  },
  // Method that just calls super with same args
  {
    name: 'Super Passthrough',
    pattern: /(\w+)\s*\(([^)]*)\)\s*\{\s*(?:return\s+)?super\.\1\s*\(\s*\2\s*\)\s*;?\s*\}/g,
    message: 'Method that only calls super is unnecessary',
    severity: 'warn',
    suggestion: 'Remove the method to use inherited behavior directly',
  },
  // Wrapper class that delegates all methods
  {
    name: 'Wrapper Class',
    pattern: /class\s+(\w+)Wrapper\s+/g,
    message: 'Wrapper class may add unnecessary indirection',
    severity: 'info',
    suggestion: 'Consider if composition or inheritance is more appropriate',
  },
  // Adapter with single method
  {
    name: 'Simple Adapter',
    pattern: /class\s+\w+Adapter\s*\{[^}]{0,200}\}/g,
    message: 'Small adapter class may be over-engineering',
    severity: 'info',
    suggestion: 'Consider a simple function instead of a class',
  },
];

// ============================================================================
// DESIGN PATTERN OVERUSE
// ============================================================================
const PATTERN_OVERUSE: AbstractionPattern[] = [
  // Multiple design patterns in one file
  {
    name: 'Strategy Factory',
    pattern: /(?:Strategy|Factory|Observer|Mediator|Visitor).*(?:Strategy|Factory|Observer|Mediator|Visitor)/g,
    message: 'Multiple design patterns in close proximity may indicate over-engineering',
    severity: 'info',
    suggestion: 'Ensure pattern usage is justified by actual complexity',
  },
  // Visitor pattern (often over-engineering)
  {
    name: 'Visitor Pattern',
    pattern: /(?:class|interface)\s+\w*Visitor\b.*accept\s*\(|accept\s*\(\s*visitor/gi,
    message: 'Visitor pattern is powerful but often over-engineered',
    severity: 'info',
    suggestion: 'Consider if simple polymorphism would suffice',
  },
  // Command pattern with many small commands
  {
    name: 'Command Pattern',
    pattern: /class\s+\w+Command\s*(?:implements|extends)\s+\w*Command/g,
    message: 'Command pattern detected - ensure it adds value',
    severity: 'info',
    suggestion: 'Simple operations may not need the command pattern',
  },
  // Specification pattern
  {
    name: 'Specification Pattern',
    pattern: /class\s+\w+Specification\s*(?:implements|extends)/g,
    message: 'Specification pattern may be overkill for simple conditions',
    severity: 'info',
    suggestion: 'Consider using simple predicate functions',
  },
];

// ============================================================================
// INHERITANCE DEPTH
// ============================================================================
const INHERITANCE_PATTERNS: AbstractionPattern[] = [
  // Deep inheritance chain indicator
  {
    name: 'Deep Inheritance',
    pattern: /class\s+\w+\s+extends\s+\w+(?:Base|Abstract)\w+(?:Base|Abstract)/g,
    message: 'Deep inheritance chain may indicate over-abstraction',
    severity: 'warn',
    suggestion: 'Consider composition over deep inheritance',
  },
  // Multiple levels of abstract
  {
    name: 'Abstract Chain',
    pattern: /abstract\s+class\s+\w+\s+extends\s+\w*Abstract/g,
    message: 'Abstract class extending another abstract class adds complexity',
    severity: 'info',
    suggestion: 'Consider flattening the inheritance hierarchy',
  },
];

// ============================================================================
// GENERIC OVERUSE
// ============================================================================
const GENERIC_PATTERNS: AbstractionPattern[] = [
  // Too many generic parameters
  {
    name: 'Many Generics',
    pattern: /<\s*\w+\s*,\s*\w+\s*,\s*\w+\s*,\s*\w+/g,
    message: 'Four or more generic parameters may indicate over-abstraction',
    severity: 'warn',
    suggestion: 'Consider simplifying the type signature',
  },
  // Nested generics deep
  {
    name: 'Nested Generics',
    pattern: /<[^>]*<[^>]*<[^>]*>/g,
    message: 'Deeply nested generic types are hard to understand',
    severity: 'info',
    suggestion: 'Consider type aliases to simplify complex generic types',
  },
  // Conditional types with multiple conditions
  {
    name: 'Complex Conditional Type',
    pattern: /extends\s+\w+\s*\?\s*[^:]+\s*:\s*[^;]*extends\s+\w+\s*\?/g,
    message: 'Nested conditional types are complex and hard to maintain',
    severity: 'info',
    suggestion: 'Consider breaking into separate type definitions',
  },
];

// Combine all patterns
const ALL_ABSTRACTION_PATTERNS: AbstractionPattern[] = [
  ...NAMING_PATTERNS,
  ...STRUCTURAL_PATTERNS,
  ...WRAPPER_PATTERNS,
  ...PATTERN_OVERUSE,
  ...INHERITANCE_PATTERNS,
  ...GENERIC_PATTERNS,
];

// Files to exclude
const EXCLUDE_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /\.d\.ts$/,
  /node_modules\//,
];

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDE_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function getSnippet(content: string, index: number): string {
  const lines = content.split('\n');
  const lineNum = getLineNumber(content, index);
  const line = lines[lineNum - 1];
  return line?.trim().substring(0, 100) || '';
}

export const ab008OverAbstraction: Rule = {
  id: 'AB008',
  name: 'Over-Abstraction Detection',
  description: 'Detects patterns that indicate over-engineering or unnecessary abstraction',
  defaultSeverity: 'info',
  appliesTo: ['.ts', '.tsx', '.js', '.jsx'],

  check(content: string, filePath: string): RiskFinding[] {
    const findings: RiskFinding[] = [];

    if (shouldExcludeFile(filePath)) {
      return findings;
    }

    // Track reported to avoid duplicates
    const reported = new Set<string>();

    for (const { pattern, message, severity, suggestion } of ALL_ABSTRACTION_PATTERNS) {
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = getLineNumber(content, match.index);
        const key = `${lineNum}:${message}`;

        if (reported.has(key)) {
          continue;
        }
        reported.add(key);

        const snippet = getSnippet(content, match.index);
        const fullMessage = suggestion ? `${message}. ${suggestion}` : message;

        findings.push({
          ruleId: 'AB008',
          severity,
          file: filePath,
          line: lineNum,
          message: fullMessage,
          snippet: snippet.length > 80 ? snippet.substring(0, 77) + '...' : snippet,
        });
      }
    }

    // Check for file-level metrics
    const classCount = (content.match(/\bclass\s+\w+/g) || []).length;
    const interfaceCount = (content.match(/\binterface\s+\w+/g) || []).length;
    const abstractCount = (content.match(/\babstract\s+class/g) || []).length;

    // Flag files with many abstractions
    if (abstractCount >= 3 || (interfaceCount >= 5 && classCount >= 3)) {
      findings.unshift({
        ruleId: 'AB008',
        severity: 'warn',
        file: filePath,
        line: 1,
        message: `File has high abstraction count (${abstractCount} abstract classes, ${interfaceCount} interfaces, ${classCount} classes)`,
        snippet: 'Consider if this complexity is warranted',
      });
    }

    return findings;
  },
};
