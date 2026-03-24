# Contributing to Shielded Skills

## The Short Version

Fork → add your skill to `skills/` → open a PR → CI scans it → address findings → merge.

The bar is **honest documentation**, not zero findings. A skill that legitimately makes network calls can pass if that's documented. A skill that hides what it does will not.

---

## Required Structure

Every skill directory must contain a `SKILL.md` file with valid frontmatter:

```
skills/
└── your-skill-name/
    ├── SKILL.md          ← required
    └── scripts/          ← optional
        └── run.sh
```

### SKILL.md Frontmatter

```yaml
---
name: your-skill-name
version: 1.0.0
description: One sentence description of what this skill does
author: your-github-handle
license: MIT

# Security documentation — fill in anything that applies
network_calls: false          # true if skill makes HTTP requests; explain below
shell_access: false           # true if skill runs shell commands; explain below
destructive: false            # true if skill can delete/modify data; explain below
data_access:                  # list what data the skill can read
  - working directory files

# If any of the above are true, document why:
security_notes: |
  This skill calls the GitHub API (api.github.com) to fetch PR data.
  No credentials are stored or transmitted beyond the API call.
  Network calls are read-only.
---
```

The frontmatter is the difference between a documented pattern and a suspicious one. Undocumented network calls lose 25 points. Documented ones lose 5.

---

## What Gets Scanned

The `skill-shield-ci` workflow runs on every PR that touches `skills/`. Here's what it checks:

### Prompt Injection (up to -35 points)
Patterns like "ignore previous instructions", "you are now", "disregard your rules", "act as if", "pretend you". These are the most common attack vector in agent skills.

**Legitimate use**: Almost never. If your skill genuinely needs to include these phrases as examples or documentation, wrap them in code blocks and add a `prompt_injection_examples: true` flag to your frontmatter with an explanation.

### Undocumented Network Calls (up to -25 points)
`curl`, `wget`, `fetch`, `axios`, any `http://` or `https://` URL in scripts. Drops to -5 if documented in frontmatter.

**Legitimate use**: API integrations, fetching documentation, calling webhooks. Document the endpoint, the data sent, and the data received.

### Undocumented Shell Execution (-15 points)
Shell commands referenced in the skill without `shell_access: true` in frontmatter. Drops to -5 if documented.

**Legitimate use**: Most useful skills need some shell access. Document what commands and why.

### Obfuscated Code (-30 points)
`base64`, `eval()`, `exec()`, encoded payloads. This is a hard signal — there's almost no reason to encode behavior in a skill.

**Legitimate use**: None accepted. If you're base64-encoding something for a legitimate reason, decode it in documentation and explain why encoding was necessary. Expect manual review.

### Undocumented Destructive Operations (-30 points)
`rm -rf`, `DROP TABLE`, `DELETE FROM`, `format`, `mkfs`. Drops to -10 if documented.

**Legitimate use**: Cleanup scripts, database migrations, scaffolding tools that remove old files. Document the conditions under which destruction occurs and what safeguards exist.

---

## How Scoring Works

Start at 100. Each finding deducts points. Floor is 0.

| Score | Grade | Merge Status |
|-------|-------|--------------|
| 80–100 | A | Allowed |
| 65–79 | B | Allowed |
| 50–64 | C | Allowed |
| 35–49 | D | **Blocked** |
| 0–34 | F | **Blocked** |

Skills that score D or F block the merge gate. Fix the findings or document the legitimate use, then push a new commit — CI re-runs automatically.

---

## Common False Positives

### "My skill mentions 'ignore previous output' in an example"
Wrap it in a fenced code block. The scanner skips content inside triple-backtick blocks.

### "My skill calls the GitHub API"
Add `network_calls: true` to frontmatter and document the endpoint in `security_notes`. You'll lose 5 points instead of 25, and it won't block merge.

### "My skill has a cleanup step that runs `rm`"
Add `destructive: true` and explain what gets deleted and under what conditions. A cleanup script that removes its own temp files is fine; one that `rm -rf /` is not.

### "I'm including a base64 string as example data"
Inline examples of encoded data (not executed) usually don't trigger the scanner. If they do, put them in a code block and open an issue — that's a scanner bug.

---

## Security Requirements

**No obfuscated code.** If you can't show us what it does in plain text, it's not going in.

**No undocumented external network calls.** We need to know what leaves the machine.

**Safeguards on destructive operations.** If your skill can delete things, document when and what.

**No credential harvesting patterns.** Skills that read `~/.ssh/`, `~/.aws/`, `~/.env`, or similar files without explicit justification will be rejected regardless of score.

---

## Review Process

After CI passes (grade C or above), a maintainer reviews:

1. Does the security documentation match what the skill actually does?
2. Are the documented uses legitimate for an agent skill?
3. Does the skill do what it claims in the description?

Turnaround is typically 1–3 days. If your PR is stuck, open an issue and tag a maintainer.

---

## Questions

Open an issue. We'd rather answer a question than reject a legitimate skill.
