/**
 * Inline Directive Parser
 *
 * Parses inline comments that control rule behavior:
 * - // afterburn-disable-next-line AB001
 * - // afterburn-disable-next-line AB001, AB002
 * - // afterburn-disable AB001
 * - // afterburn-disable (disables all rules for file)
 * - // afterburn-enable AB001
 */

export interface InlineDirective {
  type: 'disable-next-line' | 'disable' | 'enable';
  rules: string[]; // Empty array means all rules
  line: number;
}

/**
 * Parse inline directives from file content
 */
export function parseInlineDirectives(content: string): InlineDirective[] {
  const directives: InlineDirective[] = [];
  const lines = content.split('\n');

  // Regex patterns for directives
  const patterns = [
    // // afterburn-disable-next-line AB001, AB002
    {
      regex: /\/\/\s*afterburn-disable-next-line\s*([\w\s,]*)/i,
      type: 'disable-next-line' as const,
    },
    // /* afterburn-disable-next-line AB001 */
    {
      regex: /\/\*\s*afterburn-disable-next-line\s*([\w\s,]*)\s*\*\//i,
      type: 'disable-next-line' as const,
    },
    // // afterburn-disable AB001, AB002
    {
      regex: /\/\/\s*afterburn-disable\s*([\w\s,]*)/i,
      type: 'disable' as const,
    },
    // /* afterburn-disable AB001 */
    {
      regex: /\/\*\s*afterburn-disable\s*([\w\s,]*)\s*\*\//i,
      type: 'disable' as const,
    },
    // // afterburn-enable AB001
    {
      regex: /\/\/\s*afterburn-enable\s*([\w\s,]*)/i,
      type: 'enable' as const,
    },
    // /* afterburn-enable AB001 */
    {
      regex: /\/\*\s*afterburn-enable\s*([\w\s,]*)\s*\*\//i,
      type: 'enable' as const,
    },
    // # afterburn-disable-next-line (Python style)
    {
      regex: /#\s*afterburn-disable-next-line\s*([\w\s,]*)/i,
      type: 'disable-next-line' as const,
    },
    // # afterburn-disable (Python style)
    {
      regex: /#\s*afterburn-disable\s*([\w\s,]*)/i,
      type: 'disable' as const,
    },
    // # afterburn-enable (Python style)
    {
      regex: /#\s*afterburn-enable\s*([\w\s,]*)/i,
      type: 'enable' as const,
    },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { regex, type } of patterns) {
      const match = line.match(regex);
      if (match) {
        const rulesStr = match[1]?.trim() || '';
        const rules = rulesStr
          ? rulesStr.split(',').map(r => r.trim()).filter(r => r.match(/^AB\d{3}$/))
          : [];

        directives.push({
          type,
          rules,
          line: i + 1, // 1-indexed
        });
        break; // Only match one directive per line
      }
    }
  }

  return directives;
}

/**
 * Check if a rule should be disabled for a specific line
 */
export function shouldDisableLine(
  directives: InlineDirective[],
  line: number,
  ruleId: string
): boolean {
  // Track disable state
  let disabled = false;

  for (const directive of directives) {
    // File-level or range disable/enable
    if (directive.type === 'disable') {
      // Check if this disable applies to our rule
      if (directive.rules.length === 0 || directive.rules.includes(ruleId)) {
        // Disable applies from this line onwards
        if (directive.line <= line) {
          disabled = true;
        }
      }
    } else if (directive.type === 'enable') {
      // Check if this enable applies to our rule
      if (directive.rules.length === 0 || directive.rules.includes(ruleId)) {
        // Enable applies from this line onwards
        if (directive.line <= line) {
          disabled = false;
        }
      }
    } else if (directive.type === 'disable-next-line') {
      // Check if this applies to the next line (our line)
      if (directive.line === line - 1) {
        if (directive.rules.length === 0 || directive.rules.includes(ruleId)) {
          return true;
        }
      }
    }
  }

  return disabled;
}

/**
 * Get all disabled rules for a specific line
 */
export function getDisabledRulesForLine(
  directives: InlineDirective[],
  line: number
): Set<string> {
  const disabled = new Set<string>();
  let allDisabled = false;

  for (const directive of directives) {
    if (directive.type === 'disable') {
      if (directive.line <= line) {
        if (directive.rules.length === 0) {
          allDisabled = true;
        } else {
          directive.rules.forEach(r => disabled.add(r));
        }
      }
    } else if (directive.type === 'enable') {
      if (directive.line <= line) {
        if (directive.rules.length === 0) {
          allDisabled = false;
          disabled.clear();
        } else {
          directive.rules.forEach(r => disabled.delete(r));
        }
      }
    } else if (directive.type === 'disable-next-line') {
      if (directive.line === line - 1) {
        if (directive.rules.length === 0) {
          allDisabled = true;
        } else {
          directive.rules.forEach(r => disabled.add(r));
        }
      }
    }
  }

  // If all rules are disabled, return a special marker
  if (allDisabled) {
    disabled.add('*');
  }

  return disabled;
}
