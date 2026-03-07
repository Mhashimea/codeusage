/**
 * AST Context Module
 *
 * Provides AST context for rules to use during analysis.
 * Rules can use this to get parsed AST and avoid false positives
 * by checking if matches occur in comments, strings, etc.
 */

import { parseFileByPath, clearAstCache, type Tree, type Node } from './index.js';

export interface AstContext {
  /** The parsed AST tree, null if parsing failed or unsupported language */
  tree: Tree | null;
  /** The detected language */
  language: string | null;
  /** Check if a line number is inside a comment */
  isLineInComment: (line: number) => boolean;
  /** Check if a line number is inside a string literal */
  isLineInString: (line: number) => boolean;
  /** Get all string literal nodes */
  getStringLiterals: () => Node[];
  /** Find the node at a specific line */
  getNodeAtLine: (line: number) => Node | null;
}

/**
 * Create an AST context for a file
 */
export async function createAstContext(
  filePath: string,
  content: string
): Promise<AstContext> {
  const { tree, language } = await parseFileByPath(filePath, content);

  // Cache line -> comment status
  const commentLines = new Set<number>();
  const stringLines = new Set<number>();
  let stringLiterals: Node[] = [];

  if (tree) {
    // Pre-compute comment and string line numbers
    traverseTree(tree.rootNode, (node) => {
      if (isCommentNode(node)) {
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        for (let i = startLine; i <= endLine; i++) {
          commentLines.add(i);
        }
      }

      if (isStringNode(node)) {
        stringLiterals.push(node);
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        for (let i = startLine; i <= endLine; i++) {
          stringLines.add(i);
        }
      }
    });
  }

  return {
    tree,
    language,

    isLineInComment(line: number): boolean {
      return commentLines.has(line);
    },

    isLineInString(line: number): boolean {
      return stringLines.has(line);
    },

    getStringLiterals(): Node[] {
      return stringLiterals;
    },

    getNodeAtLine(line: number): Node | null {
      if (!tree) return null;
      return findNodeAtLine(tree.rootNode, line);
    },
  };
}

/**
 * Traverse the AST tree
 */
function traverseTree(node: Node, callback: (node: Node) => void): void {
  callback(node);
  for (const child of node.children) {
    traverseTree(child, callback);
  }
}

/**
 * Check if a node is a comment
 */
function isCommentNode(node: Node): boolean {
  const commentTypes = [
    'comment',
    'line_comment',
    'block_comment',
    'multiline_comment',
    // Python
    'string', // Python docstrings are strings but often used as comments
  ];
  return commentTypes.includes(node.type);
}

/**
 * Check if a node is a string literal
 */
function isStringNode(node: Node): boolean {
  const stringTypes = [
    'string',
    'string_literal',
    'template_string',
    'template_literal',
    'raw_string',
    'binary_string',
    'formatted_string',
    // Python
    'concatenated_string',
  ];
  return stringTypes.includes(node.type);
}

/**
 * Find the deepest node that contains a given line
 */
function findNodeAtLine(node: Node, line: number): Node | null {
  const startLine = node.startPosition.row + 1;
  const endLine = node.endPosition.row + 1;

  if (line < startLine || line > endLine) {
    return null;
  }

  // Check children for a more specific match
  for (const child of node.children) {
    const found = findNodeAtLine(child, line);
    if (found) {
      return found;
    }
  }

  return node;
}

/**
 * Reset AST cache between analysis runs
 */
export function resetAstContext(): void {
  clearAstCache();
}
