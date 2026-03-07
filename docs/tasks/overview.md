# Afterburn — Development Task Overview

## Project Summary

**Goal:** Build a production-ready CLI tool that generates human-readable summaries of AI-assisted coding sessions.

**Core Value Proposition:**
- LLM-powered session summaries (BYOK model)
- Static analysis for AI-specific anti-patterns
- Hallucinated package detection
- Zero infrastructure cost (user's API key)

---

## Phase Overview

| Phase | Name | Sprints | Focus |
|-------|------|---------|-------|
| 1 | Foundation | Sprint 1-4 | Core CLI, Git parsing, basic rules, npm registry |
| 2 | Rule Engine | Sprint 5-8 | Full rule catalog, config system, multi-language AST |
| 3 | LLM Layer | Sprint 9-12 | BYOK integration, Pro features, billing |
| 4 | Teams & Dashboard | Sprint 13-16 | Web dashboard, team features, v1.0 launch |

---

## Sprint Cadence

- **Sprint Duration:** 1 week
- **Total Timeline:** 16 sprints (~4 months to v1.0)
- **Deliverable per Sprint:** Working increment, tested, documented

---

## Definition of Done (Global)

A task is considered "done" when:

- [ ] Code is written and compiles without errors
- [ ] Unit tests pass (>80% coverage for new code)
- [ ] ESLint passes with no errors
- [ ] Code is reviewed (self-review for solo dev)
- [ ] Feature is manually tested with real-world scenarios
- [ ] Documentation updated if user-facing
- [ ] Changes committed with descriptive message

---

## Local Testing Workflow

**Every sprint ends with a Local Build & Test section.** This ensures features are validated on real projects before moving forward.

### CLI Testing Steps
```bash
# 1. Build the project
npm run build

# 2. Run unit tests
npm run test

# 3. Link globally for local testing
npm link

# 4. Test on afterburn project itself
afterburn ./

# 5. Test on personal/real projects
cd ~/my-other-project
afterburn ./
```

### Dashboard Testing Steps (Phase 4+)
```bash
# 1. Build dashboard
cd dashboard && npm run build

# 2. Run locally
npm run dev

# 3. Test CLI sync
afterburn ./ --sync

# 4. Verify in browser at localhost:3000
```

### Why Local Testing Matters
- Catch issues before they reach npm
- Validate features work on real codebases
- Build confidence in the tool by using it yourself
- Identify edge cases not covered by unit tests

---

## Quality Gates by Phase

### Phase 1 Complete
- [ ] CLI generates report for 50-file TypeScript project in <30 seconds
- [ ] 4 core rules produce accurate results
- [ ] npm registry checker has zero false positives on hallucinated packages
- [ ] Published to npm as v0.1.0-beta

### Phase 2 Complete
- [ ] All 10 rules implemented and tested
- [ ] .afterburnrc configuration works correctly
- [ ] Tree-sitter parses TypeScript/JavaScript/Python
- [ ] CI mode exits with correct codes
- [ ] Published as v0.1.0 stable

### Phase 3 Complete
- [ ] LLM integration works with Anthropic, OpenAI, Ollama
- [ ] --explain flag produces useful summaries
- [ ] Pro license gating functional
- [ ] Stripe billing integrated
- [ ] Published as v0.2.0

### Phase 4 Complete
- [ ] Web dashboard deployed and functional
- [ ] Team sharing works
- [ ] Historical trends displayed
- [ ] GitHub Action published
- [ ] Published as v1.0.0

---

## File Structure

```
docs/tasks/
├── overview.md              # This file
├── phase-1-foundation.md    # Sprints 1-4
├── phase-2-rule-engine.md   # Sprints 5-8
├── phase-3-llm-layer.md     # Sprints 9-12
└── phase-4-dashboard.md     # Sprints 13-16
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tree-sitter complexity | Medium | Start with TS/JS only, defer others |
| False positive rules | High | Invest in test suite, default to 'info' severity |
| LLM API changes | Low | Abstract behind provider interface |
| Low conversion to Pro | Medium | Ensure free tier is genuinely useful |

---

## Success Metrics (Launch)

- [ ] 500+ npm installs in first month
- [ ] <30 second analysis time for typical project
- [ ] Zero critical bugs reported
- [ ] 10+ beta testers validate Pro features
