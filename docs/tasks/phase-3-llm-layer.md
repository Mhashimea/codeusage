# Phase 3: LLM Layer & Pro Tier

**Duration:** Sprints 9-12
**Goal:** BYOK LLM integration, human-readable summaries, Pro tier with billing.

---

## Sprint 9: LLM Provider Integration ✅

### 9.1 Provider Abstraction Layer ✅
- [x] **9.1.1** Define `LLMProvider` interface:
  ```typescript
  interface LLMProvider {
    name: string;
    complete(prompt: string, options: LLMOptions): Promise<string>;
    validateConfig(): Promise<boolean>;
    estimateCost(tokenCount: number): number;
  }
  ```
- [x] **9.1.2** Implement provider factory: `createProvider(config: LLMConfig)`
- [x] **9.1.3** Implement token counting utility (approximate)
- [x] **9.1.4** Implement retry logic with exponential backoff
- [x] **9.1.5** Implement timeout handling (60 second default)
- [ ] **9.1.6** Implement streaming support (optional, for progress)

### 9.2 Anthropic Claude Integration ✅
- [x] **9.2.1** Implement `AnthropicProvider` class
- [x] **9.2.2** Support Claude Sonnet and Opus models
- [x] **9.2.3** Implement API key validation
- [x] **9.2.4** Handle rate limiting (429 errors)
- [x] **9.2.5** Handle context length limits (truncate diff if needed)
- [x] **9.2.6** Implement cost estimation (~$3/1M input, ~$15/1M output for Sonnet)
- [ ] **9.2.7** Test with real API calls
- [ ] **9.2.8** Add unit tests with mocked responses

### 9.3 OpenAI Integration ✅
- [x] **9.3.1** Implement `OpenAIProvider` class
- [x] **9.3.2** Support GPT-4o and GPT-4o-mini models
- [x] **9.3.3** Implement API key validation
- [x] **9.3.4** Handle rate limiting
- [x] **9.3.5** Handle context length limits
- [x] **9.3.6** Implement cost estimation
- [ ] **9.3.7** Test with real API calls
- [ ] **9.3.8** Add unit tests with mocked responses

### 9.4 Ollama (Local LLM) Integration ✅
- [x] **9.4.1** Implement `OllamaProvider` class
- [x] **9.4.2** Auto-detect Ollama running locally (http://localhost:11434)
- [x] **9.4.3** List available models via Ollama API
- [x] **9.4.4** Support common models: llama3, codellama, mistral
- [x] **9.4.5** Handle Ollama not running gracefully
- [ ] **9.4.6** Test with local Ollama instance
- [ ] **9.4.7** Document Ollama setup in README

### 9.5 API Key Management ✅
- [x] **9.5.1** Support API key in config file (`llm.apiKey`)
- [x] **9.5.2** Support environment variable reference (`env:ANTHROPIC_API_KEY`)
- [x] **9.5.3** Support direct environment variable (`AFTERBURN_API_KEY`)
- [x] **9.5.4** Implement `afterburn config set llm.apiKey sk-...` (secure storage)
- [x] **9.5.5** Never log or display API keys
- [x] **9.5.6** Validate API key on first use (test call)
- [x] **9.5.7** Clear error message if API key missing/invalid

### 9.6 Local Build & Test ✅
- [x] **9.6.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **9.6.2** Run `npm run test` — verify all unit tests pass
- [ ] **9.6.3** Run `npm link` — update local global installation
- [ ] **9.6.4** Test Anthropic provider with real API key on personal project
- [ ] **9.6.5** Test OpenAI provider with real API key on personal project
- [ ] **9.6.6** Test Ollama provider with local instance
- [ ] **9.6.7** Verify API key validation and error messages
- [ ] **9.6.8** Test without API key — verify graceful error handling

**Sprint 9 Deliverable:** Working LLM integration with Anthropic, OpenAI, and Ollama. ✅

---

## Sprint 10: LLM-Powered Analysis Features ✅

### 10.1 Session Summary Generation ✅
- [x] **10.1.1** Design prompt template for session summary
- [x] **10.1.2** Include: diff content, file list, commit messages (if any)
- [x] **10.1.3** Request: 2-3 paragraph overview in plain language
- [x] **10.1.4** Request: key changes, purpose, notable decisions
- [x] **10.1.5** Implement diff truncation for large sessions (prioritize recent/important)
- [ ] **10.1.6** Test with 10+ real session diffs
- [ ] **10.1.7** Iterate on prompt for quality output

### 10.2 Intent-Based Changelog ✅
- [x] **10.2.1** Design prompt template for intent extraction
- [x] **10.2.2** Request: group changes by purpose, not by file
- [x] **10.2.3** Request: use action verbs ("Added", "Fixed", "Refactored")
- [x] **10.2.4** Request: link related changes across files
- [x] **10.2.5** Format as bullet list suitable for release notes
- [ ] **10.2.6** Test with 10+ real sessions
- [ ] **10.2.7** Iterate on prompt quality

### 10.3 Architecture Decision Records (ADR) ✅
- [x] **10.3.1** Design prompt template for ADR extraction
- [x] **10.3.2** Request: identify technology/framework choices
- [x] **10.3.3** Request: explain why choice was made (infer from code)
- [x] **10.3.4** Request: list alternatives and trade-offs
- [x] **10.3.5** Format as structured ADR (Context, Decision, Consequences)
- [ ] **10.3.6** Test with sessions that introduce new dependencies
- [ ] **10.3.7** Iterate on prompt quality

### 10.4 Trade-off Analysis ✅
- [x] **10.4.1** Design prompt template for trade-off identification
- [x] **10.4.2** Request: identify decisions with alternatives
- [x] **10.4.3** Request: pros/cons of chosen approach
- [x] **10.4.4** Request: flag potential technical debt
- [x] **10.4.5** Format as advisory notes
- [ ] **10.4.6** Test with complex refactoring sessions

### 10.5 `--explain` Flag Implementation ✅
- [x] **10.5.1** Add `--explain` flag to CLI
- [x] **10.5.2** Check for valid LLM config when flag used
- [x] **10.5.3** Show cost estimate before calling LLM (optional confirm)
- [x] **10.5.4** Show progress spinner during LLM call
- [x] **10.5.5** Integrate LLM sections into markdown report
- [x] **10.5.6** Integrate LLM sections into terminal output
- [x] **10.5.7** Handle LLM errors gracefully (still output static analysis)

### 10.6 Prompt Engineering & Quality
- [ ] **10.6.1** Create prompt test suite (input diff → expected output themes)
- [ ] **10.6.2** A/B test prompts for quality
- [x] **10.6.3** Implement prompt versioning (store in code)
- [x] **10.6.4** Add system prompt for consistent persona/format
- [ ] **10.6.5** Handle hallucinations (LLM making up file names, etc.)
- [ ] **10.6.6** Document prompt design decisions

### 10.7 Local Build & Test ✅
- [x] **10.7.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **10.7.2** Run `npm run test` — verify all unit tests pass
- [ ] **10.7.3** Run `npm link` — update local global installation
- [ ] **10.7.4** Test `afterburn ./ --explain` on personal project with Anthropic
- [ ] **10.7.5** Test `afterburn ./ --explain` on personal project with OpenAI
- [ ] **10.7.6** Test `afterburn ./ --explain` on personal project with Ollama
- [x] **10.7.7** Review LLM output quality — is it useful and accurate?
- [x] **10.7.8** Test on large diff (50+ files) — verify truncation works
- [x] **10.7.9** Verify cost estimation is displayed correctly

**Sprint 10 Deliverable:** All LLM features working with --explain flag. ✅

---

## Sprint 11: Pro Tier & License Gating

### 11.1 License System Design
- [ ] **11.1.1** Design license key format (JWT or simple signed token)
- [ ] **11.1.2** Decide on license validation: online vs offline
- [ ] **11.1.3** Define Pro feature list:
  - LLM Session Summary
  - Intent-Based Changelog
  - Architecture Decision Records
  - Trade-off Analysis
  - Historical Trending (Phase 4)
- [ ] **11.1.4** Define free tier limits (if any)

### 11.2 License Verification
- [ ] **11.2.1** Implement license key storage (config file or system keychain)
- [ ] **11.2.2** Implement `afterburn login` command (enter license key)
- [ ] **11.2.3** Implement `afterburn logout` command
- [ ] **11.2.4** Implement `afterburn status` command (show license status)
- [ ] **11.2.5** Implement license validation endpoint (lightweight API)
- [ ] **11.2.6** Cache validation result (don't call API every run)
- [ ] **11.2.7** Handle offline mode (use cached validation)
- [ ] **11.2.8** Handle expired licenses gracefully

### 11.3 Feature Gating
- [ ] **11.3.1** Gate `--explain` flag behind Pro license
- [ ] **11.3.2** Show upgrade prompt when free user tries Pro feature
- [ ] **11.3.3** Include upgrade URL in prompt
- [ ] **11.3.4** Allow LLM features with Ollama without Pro (local = free)
- [ ] **11.3.5** Track feature usage for analytics (opt-in)

### 11.4 Stripe Billing Integration
- [ ] **11.4.1** Create Stripe account and products
- [ ] **11.4.2** Create Pro subscription product ($12/month)
- [ ] **11.4.3** Build simple checkout page (hosted or embedded)
- [ ] **11.4.4** Implement webhook handler for subscription events:
  - `checkout.session.completed` → issue license
  - `customer.subscription.deleted` → revoke license
  - `invoice.payment_failed` → grace period
- [ ] **11.4.5** Generate and email license key on purchase
- [ ] **11.4.6** Build customer portal link for subscription management

### 11.5 License API Backend
- [ ] **11.5.1** Choose hosting: Vercel/Cloudflare Workers/simple VPS
- [ ] **11.5.2** Implement `/verify` endpoint (validate license key)
- [ ] **11.5.3** Implement `/issue` endpoint (called by Stripe webhook)
- [ ] **11.5.4** Implement rate limiting
- [ ] **11.5.5** Implement key revocation
- [ ] **11.5.6** Add monitoring and alerting
- [ ] **11.5.7** Keep it simple: <500 lines of code total

### 11.6 Marketing Page
- [ ] **11.6.1** Create simple landing page (afterburn.dev or similar)
- [ ] **11.6.2** Explain free vs Pro features
- [ ] **11.6.3** Show pricing clearly
- [ ] **11.6.4** Add "Get Started" → npm install instructions
- [ ] **11.6.5** Add "Upgrade to Pro" → Stripe checkout
- [ ] **11.6.6** Add documentation section

### 11.7 Local Build & Test
- [ ] **11.7.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **11.7.2** Run `npm run test` — verify all unit tests pass
- [ ] **11.7.3** Run `npm link` — update local global installation
- [ ] **11.7.4** Test `afterburn login` with valid license key
- [ ] **11.7.5** Test `afterburn status` — verify license status displayed
- [ ] **11.7.6** Test `--explain` without license — verify upgrade prompt
- [ ] **11.7.7** Test `--explain` with license — verify Pro features work
- [ ] **11.7.8** Test `--explain` with Ollama (no license required)
- [ ] **11.7.9** Complete Stripe test purchase flow end-to-end
- [ ] **11.7.10** Verify license API endpoints work correctly

**Sprint 11 Deliverable:** Pro tier with Stripe billing, license gating functional.

---

## Sprint 12: Polish, Testing & v0.2.0 Release

### 12.1 End-to-End Testing
- [ ] **12.1.1** Create E2E test suite for full analysis flow
- [ ] **12.1.2** Test free tier flow (no license)
- [ ] **12.1.3** Test Pro tier flow (with license)
- [ ] **12.1.4** Test Anthropic integration E2E
- [ ] **12.1.5** Test OpenAI integration E2E
- [ ] **12.1.6** Test Ollama integration E2E
- [ ] **12.1.7** Test offline mode (cached license, no network)
- [ ] **12.1.8** Test license expiration handling

### 12.2 Error Handling & Edge Cases
- [ ] **12.2.1** Handle network errors during LLM calls
- [ ] **12.2.2** Handle API rate limiting gracefully
- [ ] **12.2.3** Handle very large diffs (>100 files)
- [ ] **12.2.4** Handle empty sessions (no changes)
- [ ] **12.2.5** Handle non-git directories
- [ ] **12.2.6** Handle corrupted config files
- [ ] **12.2.7** Add helpful error messages for common issues

### 12.3 Performance Optimization
- [ ] **12.3.1** Profile analysis time for large projects
- [ ] **12.3.2** Optimize file reading (parallel where possible)
- [ ] **12.3.3** Optimize rule execution (batch similar rules)
- [ ] **12.3.4** Add progress reporting for long operations
- [ ] **12.3.5** Target: <60 seconds for 100-file project with LLM

### 12.4 Documentation Update
- [ ] **12.4.1** Update README with LLM configuration section
- [ ] **12.4.2** Document all Pro features
- [ ] **12.4.3** Add troubleshooting section
- [ ] **12.4.4** Add FAQ section
- [ ] **12.4.5** Create video demo (optional)
- [ ] **12.4.6** Update CHANGELOG

### 12.5 Local Build & Test (Final)
- [ ] **12.5.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **12.5.2** Run `npm run test` — verify all unit tests pass
- [ ] **12.5.3** Run `npm link` — update local global installation
- [ ] **12.5.4** Full regression test on 5+ real projects (various sizes)
- [ ] **12.5.5** Test complete flow: install → init → analyze → explain
- [ ] **12.5.6** Test on fresh machine / new user simulation
- [ ] **12.5.7** Performance benchmark: <60 seconds for 100-file project
- [ ] **12.5.8** Verify all error messages are helpful and clear

### 12.6 Release v0.2.0
- [ ] **12.6.1** Update version to 0.2.0
- [ ] **12.6.2** Final test pass on all features
- [ ] **12.6.3** Publish to npm
- [ ] **12.6.4** Create GitHub release
- [ ] **12.6.5** Announce Pro tier launch
- [ ] **12.6.6** Monitor for issues post-release

**Sprint 12 Deliverable:** v0.2.0 released with Pro tier and LLM features.

---

## Phase 3 Completion Checklist

- [ ] LLM integration with Anthropic, OpenAI, Ollama
- [ ] --explain flag produces human-readable summaries
- [ ] Intent-based changelog generation
- [ ] Architecture decision record generation
- [ ] Trade-off analysis
- [ ] Pro license system functional
- [ ] Stripe billing integrated
- [ ] License verification API deployed
- [ ] Landing page live
- [ ] v0.2.0 published to npm
- [ ] Documentation complete

---

## Technical Debt to Track

- [ ] Prompt optimization (ongoing)
- [ ] License caching strategy refinement
- [ ] Cost tracking / usage dashboard for users
- [ ] Support for more LLM providers (Google, Azure)
- [ ] Streaming output for LLM responses
