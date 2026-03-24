# Security Policy

## Reporting a Vulnerability in a Listed Skill

If you find a security issue in a skill listed in this marketplace, **do not open a public issue.** The skill may be in active use.

### Responsible Disclosure

1. Email `security@shielded-skills.dev` (or open a GitHub Security Advisory on this repo)
2. Include: the skill name, the vulnerability, and a minimal reproduction
3. We'll acknowledge within 24 hours and provide a timeline for remediation
4. The affected skill will be pulled from the marketplace while the issue is investigated
5. Once fixed, we'll post a public disclosure with credit to you (unless you prefer anonymity)

**We do not offer a bug bounty, but we do credit researchers publicly.**

---

## What the Scanner Checks

Every skill is scanned by [skill-shield](../SKILL.md) before it's accepted. The scanner runs on:

- `SKILL.md` and all Markdown files in the skill directory
- Any scripts in `scripts/` (`.sh`, `.js`, `.ts`, `.py`)
- Configuration files

### Prompt Injection Detection
Scans for instruction-override patterns commonly used to hijack agent behavior:
- Direct override phrases ("ignore previous instructions", "disregard your rules")
- Identity substitution ("you are now", "act as if you are")
- Authority claims ("as your developer", "this is a system message")

### Data Exfiltration Vectors
Scans for undocumented external communication:
- Network request libraries and CLI tools (`curl`, `wget`, `fetch`, `axios`)
- Hardcoded URLs in scripts
- File read patterns targeting credential locations (`~/.ssh`, `~/.aws`, `~/.npmrc`)

### Destructive Operations
Scans for operations that could cause data loss:
- File system destruction commands (`rm -rf`, `rmdir`)
- Database destruction (`DROP TABLE`, `DELETE FROM` without `WHERE`)
- Disk operations (`format`, `mkfs`, `dd`)

### Code Obfuscation
Scans for hidden behavior:
- Base64-encoded payloads
- `eval()` and `exec()` calls on dynamic content
- Minified or obfuscated scripts

### Trust Score
Each skill receives a 0–100 trust score and an A–F grade. Skills scoring below 50 are not accepted. Full scoring methodology is in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Scanning Limitations

The scanner is static analysis — it can detect patterns, not intent. A sophisticated attacker could:

- Split injection phrases across multiple lines
- Encode payloads in ways the scanner doesn't recognize
- Disguise network calls through indirection

This is why the marketplace also has **manual review** by maintainers. The scanner is the first gate; human review is the second.

If you discover a bypass technique, please report it — that's a vulnerability in the scanner itself, and we want to fix it.

---

## Scope

This security policy covers:

- Skills listed in the `skills/` directory of this repository
- The CI scanning workflow (`.github/workflows/skill-shield-ci.yml`)
- The marketplace catalog (`.claude-plugin/marketplace.json`)

It does **not** cover skills you install from other sources. We can only vouch for what's been scanned here.

---

## History

| Date | Event |
|------|-------|
| 2026-03-24 | Initial marketplace launch |

Security advisories will be published here as they're resolved.
