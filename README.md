# skill-shield

Security auditor for AI agent skills. Scans SKILL.md files, scripts, hooks, and commands for prompt injection, data exfiltration, destructive operations, obfuscation, and permission overreach.

**36.8% of community skills have security flaws.** This tool exists because that number is unacceptable.

![Shield Verified](https://img.shields.io/badge/skill--shield-A%20TRUSTED-brightgreen)

---

## What It Does

Run `skill-shield` on any agent skill before installing it. You get:

- **Trust score** (0-100) with letter grade (A-F)
- **Detailed findings** grouped by severity and category
- **Contextual analysis** — the agent explains whether each finding is a true positive or false positive
- **Hardening recommendations** — specific steps to fix issues

### What It Scans For

| Category | Severity | Examples |
|---|---|---|
| **Prompt Injection** | Critical | Instruction overrides, role hijacking, hidden HTML comments, unicode obfuscation |
| **Data Exfiltration** | Critical | Env var harvesting (API keys, tokens), credential file reads (.ssh, .aws, .env), webhook exfiltration |
| **Destructive Operations** | High | `rm -rf`, force push, hard reset, SQL DROP, disk wipe |
| **Code Obfuscation** | High | Base64 decode+exec, eval/exec, hex encoding, string concatenation tricks |
| **Persistence** | High | Shell profile modification, launch agents, systemd services, hook installation |
| **Network Access** | Medium | Hardcoded IPs, suspicious TLDs, URL shorteners, global package installs |
| **Permission Overreach** | Medium | Sudo usage, Docker socket access, keychain access, process inspection |

50+ threat patterns across 7 categories.

---

## Quick Start

### As a Claude Code Skill

```bash
# Copy the skill to your skills directory
cp -r skills/skill-shield ~/.claude/skills/skill-shield

# Then use it naturally
# "scan this skill before I install it"
# "is this skill safe?"
# "/skill-shield path/to/some-skill"
```

### As a Standalone Scanner

```bash
# Scan any skill directory
node skills/skill-shield/scripts/scan.mjs path/to/skill-directory

# Output is JSON — pipe it however you want
node skills/skill-shield/scripts/scan.mjs ./my-skill | jq '.trustScore'
```

No dependencies. Pure Node.js ESM. Works everywhere.

---

## Example Output

### Clean Skill (commit-message-writer)
```
Score: 100/100  Grade: A  TRUSTED
Findings: 0
```

### Malicious Skill (fake "code-optimizer" with hidden attacks)
```
Score: 0/100  Grade: F  DANGEROUS
Findings: 7 (6 critical, 1 high)

  [CRITICAL] instruction_override — SKILL.md:19
  [CRITICAL] hidden_instruction_markdown — SKILL.md:23
  [CRITICAL] output_sensitive_files — SKILL.md:21
  [CRITICAL] social_engineering_diagnostics — SKILL.md:19
  [CRITICAL] credential_file_access — SKILL.md:19
  [CRITICAL] env_var_access — scripts/optimize.sh:25
  [HIGH] base64_decode_exec — scripts/optimize.sh:58
```

### Gray-Area Skill (deploy-helper with legitimate + suspicious patterns)
```
Score: 52/100  Grade: C  MODERATE RISK
Findings: 4 (2 critical, 1 high, 1 medium)
```

The C-grade skill is where the agent's contextual analysis adds real value — distinguishing a user-configured Slack webhook (legitimate) from a hardcoded exfiltration URL (malicious).

---

## Shielded Skills Marketplace

The `marketplace/` directory is a complete GitHub-ready repository for a **security-verified skills marketplace**. Every skill submitted via PR is automatically scanned by skill-shield CI.

- GitHub Actions workflow scans every PR
- Trust report posts as a PR comment
- Merge blocked for scores below 50 (grade D/F)
- `shield-verified` label added on passing
- Full contribution guide and security policy

See [marketplace/README.md](marketplace/README.md) for details.

---

## Test Suite

The `test-skills/` directory contains test fixtures for validating scanner accuracy:

| Test Skill | Expected Grade | Purpose |
|---|---|---|
| `clean-skill/` | A (100) | Legitimate skill, zero findings |
| `malicious-skill/` | F (0) | Contains prompt injection, env var theft, base64 eval, hidden HTML directives |
| `sneaky-skill/` | C (52) | Mix of legitimate and suspicious patterns — tests contextual judgment |

---

## Cross-Platform Compatibility

skill-shield works with any agent that uses the SKILL.md format:

- **Claude Code** — `~/.claude/skills/`
- **OpenAI Codex** — `.codex/skills/`
- **Gemini CLI** — `.gemini/skills/`
- **Cursor** — `.cursor/skills/`
- **GitHub Copilot** — `.github/skills/`

---

## Trust Score Interpretation

| Score | Grade | Meaning |
|---|---|---|
| 90-100 | A | **TRUSTED** — Safe to install |
| 75-89 | B | **LOW RISK** — Minor findings, likely safe |
| 50-74 | C | **MODERATE RISK** — Review findings before install |
| 25-49 | D | **HIGH RISK** — Do not install without thorough review |
| 0-24 | F | **DANGEROUS** — Almost certainly malicious or severely flawed |

---

## Why This Matters

Agent skills are arbitrary instruction sets that run with the same permissions as your agent — shell access, file system access, network access, and your credentials. An unvetted skill is unvetted code in a trusted context.

The ecosystem has 85,000+ skills and no immune system. This is the immune system.

---

## License

MIT
