/**
 * Tree-sitter AST Parser Module
 *
 * Provides AST parsing for TypeScript, JavaScript, and Python using tree-sitter WASM.
 */

import { Parser, Language, Tree, Node } from 'web-tree-sitter';
import * as path from 'path';
import * as fs from 'fs';

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'tsx' | 'jsx';

interface LanguageConfig {
  wasmFile: string;
  extensions: string[];
}

const LANGUAGE_CONFIG: Record<SupportedLanguage, LanguageConfig> = {
  typescript: {
    wasmFile: 'tree-sitter-typescript.wasm',
    extensions: ['.ts', '.mts', '.cts'],
  },
  tsx: {
    wasmFile: 'tree-sitter-typescript.wasm',
    extensions: ['.tsx'],
  },
  javascript: {
    wasmFile: 'tree-sitter-javascript.wasm',
    extensions: ['.js', '.mjs', '.cjs'],
  },
  jsx: {
    wasmFile: 'tree-sitter-javascript.wasm',
    extensions: ['.jsx'],
  },
  python: {
    wasmFile: 'tree-sitter-python.wasm',
    extensions: ['.py', '.pyw'],
  },
};

// Cache for loaded languages
const languageCache = new Map<string, Language>();

// Cache for parsed ASTs within a single analysis run
const astCache = new Map<string, Tree>();

// Parser instance (singleton)
let parserInstance: Parser | null = null;

/**
 * Initialize the tree-sitter parser
 */
export async function initParser(): Promise<Parser> {
  if (parserInstance) {
    return parserInstance;
  }

  await Parser.init();
  parserInstance = new Parser();
  return parserInstance;
}

/**
 * Get the WASM file path for a language
 */
function getWasmPath(wasmFile: string): string {
  // Try multiple possible locations
  const possiblePaths = [
    // In node_modules
    path.join(process.cwd(), 'node_modules', 'tree-sitter-wasms', 'out', wasmFile),
    // Relative to this file in dist
    path.join(__dirname, '..', '..', 'node_modules', 'tree-sitter-wasms', 'out', wasmFile),
    // In project root
    path.join(__dirname, '..', '..', '..', 'node_modules', 'tree-sitter-wasms', 'out', wasmFile),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(`WASM file not found: ${wasmFile}`);
}

/**
 * Load a language grammar
 */
async function loadLanguage(lang: SupportedLanguage): Promise<Language> {
  const config = LANGUAGE_CONFIG[lang];
  if (!config) {
    throw new Error(`Unsupported language: ${lang}`);
  }

  // Check cache
  if (languageCache.has(config.wasmFile)) {
    return languageCache.get(config.wasmFile)!;
  }

  const wasmPath = getWasmPath(config.wasmFile);
  const language = await Language.load(wasmPath);
  languageCache.set(config.wasmFile, language);

  return language;
}

/**
 * Detect language from file extension
 */
export function detectLanguage(filePath: string): SupportedLanguage | null {
  const ext = path.extname(filePath).toLowerCase();

  for (const [lang, config] of Object.entries(LANGUAGE_CONFIG)) {
    if (config.extensions.includes(ext)) {
      return lang as SupportedLanguage;
    }
  }

  return null;
}

/**
 * Parse file content into an AST
 */
export async function parseFile(
  content: string,
  language: SupportedLanguage,
  cacheKey?: string
): Promise<Tree | null> {
  // Check AST cache
  if (cacheKey && astCache.has(cacheKey)) {
    return astCache.get(cacheKey)!;
  }

  try {
    const parser = await initParser();
    const lang = await loadLanguage(language);
    parser.setLanguage(lang);

    const tree = parser.parse(content);

    // Cache the result
    if (cacheKey && tree) {
      astCache.set(cacheKey, tree);
    }

    return tree;
  } catch (error) {
    // Graceful fallback - return null to indicate parsing failed
    // Rules can fall back to regex-based analysis
    console.error(`Tree-sitter parse error for ${language}:`, error);
    return null;
  }
}

/**
 * Parse a file by path (auto-detects language)
 */
export async function parseFileByPath(
  filePath: string,
  content: string
): Promise<{ tree: Tree | null; language: SupportedLanguage | null }> {
  const language = detectLanguage(filePath);

  if (!language) {
    return { tree: null, language: null };
  }

  const tree = await parseFile(content, language, filePath);
  return { tree, language };
}

/**
 * Clear the AST cache (call between analysis runs)
 */
export function clearAstCache(): void {
  astCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { languages: number; asts: number } {
  return {
    languages: languageCache.size,
    asts: astCache.size,
  };
}

/**
 * Query helper - find nodes matching a pattern
 */
export function queryNodes(
  tree: Tree,
  nodeTypes: string[]
): Node[] {
  const results: Node[] = [];

  function traverse(node: Node): void {
    if (nodeTypes.includes(node.type)) {
      results.push(node);
    }
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(tree.rootNode);
  return results;
}

/**
 * Find all string literals in the AST
 */
export function findStringLiterals(tree: Tree): Node[] {
  return queryNodes(tree, ['string', 'string_literal', 'template_string']);
}

/**
 * Find all function declarations
 */
export function findFunctions(tree: Tree): Node[] {
  return queryNodes(tree, [
    'function_declaration',
    'function_expression',
    'arrow_function',
    'method_definition',
    'function_definition', // Python
  ]);
}

/**
 * Find all try-catch blocks
 */
export function findTryCatchBlocks(tree: Tree): Node[] {
  return queryNodes(tree, [
    'try_statement',
    'try', // Python
  ]);
}

/**
 * Find all class declarations
 */
export function findClasses(tree: Tree): Node[] {
  return queryNodes(tree, [
    'class_declaration',
    'class_expression',
    'class_definition', // Python
  ]);
}

/**
 * Get the text content of a node
 */
export function getNodeText(node: Node): string {
  return node.text;
}

/**
 * Get the line number of a node (1-indexed)
 */
export function getNodeLine(node: Node): number {
  return node.startPosition.row + 1;
}

/**
 * Check if a node is inside a comment
 */
export function isInsideComment(node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (current.type === 'comment' || current.type === 'line_comment' || current.type === 'block_comment') {
      return true;
    }
    current = current.parent;
  }
  return false;
}

// Re-export types for convenience
export type { Language, Tree, Node };
export { Parser };
