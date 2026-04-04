# Afterburn — Prompt Guard

## Feature Documentation v0.3

**Status:** Planned — v0.3
**Hook used:** `UserPromptSubmit`
**Processing:** 100% local — nothing stored, nothing sent to Afterburn servers
**Scope:** Claude Code (v0.3), Codex (v0.4 when hook matures)

---

## 1. What it is

Prompt Guard is a client-side safety net that runs before every prompt reaches Claude Code or Codex. If the prompt contains a known sensitive pattern — an AWS key, a database connection string, a private key — it is blocked before the AI model ever sees it.

Nothing is stored. Nothing is logged. Nothing is sent to Afterburn's servers. The check happens entirely on the developer's machine in milliseconds.

**One sentence:** Before your prompt reaches Claude Code, Afterburn checks it — and if it finds something sensitive, it stops it.

---

## 2. Why it exists

AI coding tools are conversational. Developers paste things into them constantly — config files, terminal output, error logs, environment variables. Accidentally including a credential in a prompt is not a theoretical risk. It happens regularly, and when it does the credential has already been sent to Anthropic or OpenAI's servers before anyone realises.

Prompt Guard stops it before it leaves the machine.

This is distinct from every other tool in the space:

| Tool                   | When it acts                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| GitHub secret scanning | After code is committed                                                |
| Nightfall, Cycode      | After prompt reaches the model or after code is written                |
| Pre-commit hooks       | After code is staged                                                   |
| **Prompt Guard**       | **Before the prompt reaches Claude Code — on the developer's machine** |

---

## 3. How it works

### The hook

Prompt Guard uses the `UserPromptSubmit` hook — the same hook Afterburn already registers during `afterburn init`. No new installation required. When the developer types a prompt and submits it, this hook fires before Claude Code processes it.

```
Developer types prompt
        ↓
UserPromptSubmit hook fires
        ↓
Prompt Guard checks prompt against local pattern cache
        ↓
Pattern matched?
   YES → Exit code 2 → Prompt blocked → Developer sees warning
   NO  → Exit code 0 → Prompt reaches Claude Code normally
```

### Local pattern cache

Patterns are stored in `~/.afterburn/patterns.json` on the developer's machine. This file is synced from workspace settings when:

- The developer runs `afterburn init` or `afterburn sync`
- The local cache is older than 24 hours — refreshed automatically in the background
- The developer runs `afterburn patterns sync` manually

The check runs against the local cache — no network call is made at prompt time. If the patterns file cannot be loaded, Prompt Guard fails open — prompt is allowed through — and a local warning is shown. It never fails in a way that blocks the developer's work.

### What the developer sees when a prompt is blocked

```
──────────────────────────────────────────────────────
⚠  afterburn · prompt blocked
──────────────────────────────────────────────────────
   Reason:  AWS access key detected in your prompt
   Pattern: AWS Access Key (AKIA...)

   Your prompt was not sent to Claude Code.
   Remove the sensitive value and try again.
──────────────────────────────────────────────────────
```

The message appears inline in the terminal. Claude Code's process is not interrupted — the prompt is simply not submitted. The developer removes the sensitive content and tries again.

---

## 4. Pattern library

### 4.1 Built-in patterns (v0.3)

Shipped with the product. Active whenever Prompt Guard is enabled. The whole feature can be toggled off but individual patterns cannot be disabled — this is intentional to prevent partial protection that gives false confidence.

| Pattern name                | What it detects                                     | Example format                      |
| --------------------------- | --------------------------------------------------- | ----------------------------------- |
| AWS Access Key              | AWS access key ID                                   | `AKIA4EXAMPLE12345`                 |
| AWS Secret Key              | AWS secret access key                               | `aws_secret_access_key=wJalrXUt...` |
| Private RSA Key             | PEM private key block                               | `-----BEGIN RSA PRIVATE KEY-----`   |
| Private EC Key              | Elliptic curve private key                          | `-----BEGIN EC PRIVATE KEY-----`    |
| Generic Private Key         | Any PEM private key                                 | `-----BEGIN PRIVATE KEY-----`       |
| Database URL — Postgres     | PostgreSQL connection string                        | `postgresql://user:pass@host/db`    |
| Database URL — MySQL        | MySQL connection string                             | `mysql://user:pass@host/db`         |
| Database URL — MongoDB      | MongoDB connection string                           | `mongodb+srv://user:pass@cluster`   |
| JWT Token                   | JSON Web Token                                      | `eyJhbGciOiJIUzI1NiJ9...`           |
| GitHub Personal Token       | GitHub PAT                                          | `ghp_xxxxxxxxxxxxxxxxxxxx`          |
| GitHub OAuth Token          | GitHub OAuth token                                  | `gho_xxxxxxxxxxxxxxxxxxxx`          |
| Slack Bot Token             | Slack bot token                                     | `xoxb-xxxxxxxxxxxx`                 |
| Slack User Token            | Slack user token                                    | `xoxp-xxxxxxxxxxxx`                 |
| Stripe Secret Key           | Stripe live secret key                              | `sk_live_xxxxxxxxxxxxxxxxxxxx`      |
| OpenAI API Key              | OpenAI key                                          | `sk-xxxxxxxxxxxxxxxxxxxx`           |
| Anthropic API Key           | Anthropic key                                       | `sk-ant-xxxxxxxxxxxxxxxxxxxx`       |
| Google API Key              | Google API key                                      | `AIzaSyXXXXXXXXXXXX`                |
| .env file content           | Lines matching KEY=VALUE with secret-like key names | `DATABASE_PASSWORD=supersecret`     |
| Generic high-entropy string | Long random strings after known secret prefixes     | `api_key=4f9a2c1d8e3b7f0a...`       |

### 4.2 What Prompt Guard does NOT detect

Be explicit with users about limitations:

- Secrets embedded in files that Claude Code reads automatically as context (e.g. `.env` files Claude loads without being asked) — this is a separate problem outside Prompt Guard's scope
- Code or config that Claude Code generates — Prompt Guard only checks input, not output
- Every possible credential format — only known patterns with high-confidence regex
- Intentional sharing — a developer who wants to share a credential can disable the feature

Prompt Guard is a safety net for **accidental** exposure. It is not a security enforcement boundary and should not be positioned as one.

### 4.3 Custom patterns (v0.4)

Not in v0.3. Workspace admins will be able to define custom regex patterns from the dashboard in v0.4. Custom patterns sync to all developer machines in the workspace the same way built-in patterns do.

---

## 5. Configuration

### Enabling Prompt Guard

From the dashboard: **Settings → Prompt Guard → Enable**

This is a workspace-level setting. When an admin enables it, the setting propagates to all developer machines when their pattern cache next refreshes — within 24 hours, or immediately if the developer runs `afterburn patterns sync`.

Individual developers cannot override the workspace setting. The admin controls whether Prompt Guard is active for the team.

### CLI commands

```bash
# Manually sync pattern cache from workspace settings
afterburn patterns sync

# Show cache status — last synced, pattern count, workspace setting
afterburn patterns status

# List all active patterns by name
afterburn patterns list

# Test a string against the active pattern cache (for debugging)
afterburn patterns test "postgresql://user:pass@host/db"
```

---

## 6. Privacy & data handling

This section is the most important part of the feature. It must be communicated clearly.

**Prompt content:** Never sent to Afterburn's servers. Never written to disk. Never logged anywhere. The hook process reads the prompt, runs the pattern check locally, and discards the text. That is all.

**If a prompt is blocked:** The block happens locally on the developer's machine. The dashboard does not show blocked prompt history. The admin cannot see what was blocked or what the prompt contained. This is a deliberate decision — Prompt Guard protects developers from accidental exposure, it is not a surveillance tool.

**What Afterburn does store:** Only the workspace setting (on/off) and the pattern library. No prompt content under any circumstances.

**Why no logging of blocked prompts:** If blocked prompt content were logged and sent to Afterburn's servers, Afterburn would itself become a repository of the credentials it is trying to prevent from being exposed. That defeats the purpose entirely.

---

## 7. Failure modes

Prompt Guard is designed to fail safely. It must never break a developer's workflow.

| Failure scenario                  | Behaviour                                                       |
| --------------------------------- | --------------------------------------------------------------- |
| Pattern cache file missing        | Fail open — prompt goes through, local warning shown            |
| Pattern cache file corrupted      | Fail open — developer prompted to run `afterburn patterns sync` |
| Pattern cache older than 7 days   | Fail open with warning — patterns may be outdated               |
| Hook script crashes               | Fail open — Claude Code continues normally                      |
| Network unavailable — cannot sync | Fail open using last known cache                                |

**Fail open** means: when in doubt, let the prompt through. The developer's work is never blocked due to a Prompt Guard infrastructure issue. A false block is far more damaging to adoption than a missed detection.

---

## 8. Performance

Pattern matching runs locally against a pre-compiled regex list. Benchmarks on a modern machine:

| Prompt size                                          | Check time |
| ---------------------------------------------------- | ---------- |
| Typical prompt (< 500 chars)                         | < 5ms      |
| Large prompt (5,000 chars)                           | < 20ms     |
| Very large prompt (50,000 chars — whole file pasted) | < 100ms    |

Imperceptible in normal use. The developer will not notice any delay between submitting a prompt and it reaching Claude Code.

---

## 9. What this is and is not

**This is:**

- A developer safety net for accidental credential exposure
- A client-side, local-only check with no server round trip
- A workspace policy feature — admin enables it, all developers benefit
- Zero latency, zero data retention, zero surveillance

**This is not:**

- A compliance or DLP product — do not market it as one
- A security enforcement boundary that cannot be bypassed
- A monitoring tool — admins cannot see what was blocked
- A replacement for secrets management (Doppler, Vault, 1Password)
- A post-commit or post-generation scanner

---

## 10. Positioning

**To developers:**

> "Afterburn already sees every prompt before it reaches Claude Code. Prompt Guard adds one step — if it spots something that looks like a credential, it stops the prompt before the AI ever sees it. Nothing is stored. It just blocks."

**To PMs and admins:**

> "Enable Prompt Guard for your whole team from the dashboard. Every developer gets automatic protection against accidentally sharing API keys or database credentials with Claude Code. You don't see what was blocked — the developer does — because this is about protecting them, not monitoring them."

---

## 11. Out of scope for v0.3

| Feature                                         | Target version                                      |
| ----------------------------------------------- | --------------------------------------------------- |
| Custom workspace patterns (admin-defined regex) | v0.4                                                |
| Codex integration                               | v0.4 (when Codex `UserPromptSubmit` hook is stable) |
| Blocked prompt history in dashboard             | Never — privacy decision                            |
| Per-developer pattern override                  | Never — workspace policy                            |
| Pattern allowlist for a session                 | v0.4                                                |
| Community pattern marketplace                   | Post v0.4 — evaluate based on demand                |

---

## 12. User stories

**Developer:**

- As a developer, my prompt is blocked before it reaches Claude Code if it contains a credential
- As a developer, I see exactly what was detected and why my prompt was blocked
- As a developer, I can resubmit after removing the sensitive content
- As a developer, my prompt content is never sent to Afterburn's servers under any circumstances
- As a developer, my workflow is never broken by a Prompt Guard failure — it always fails open

**Admin / PM:**

- As an admin, I can enable Prompt Guard for my entire workspace with one toggle
- As an admin, I know Prompt Guard activates on all developer machines within 24 hours of enabling
- As an admin, I am not shown what prompts were blocked or their content
- As an admin, I can see that Prompt Guard is active and which built-in pattern categories are enabled

---

_Afterburn Prompt Guard · v0.3 · Internal_
