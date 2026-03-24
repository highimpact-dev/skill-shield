# Shielded Skills Marketplace

A security-first marketplace for agent skills. Every skill here has been scanned, scored, and verified before it ships to your agent.

**36.8% of community skills have security flaws.** This marketplace exists because that number is unacceptable.

---

## What This Is

A curated repository of skills for AI coding agents (Claude Code, OpenAI Codex, Gemini CLI, Cursor, GitHub Copilot). Every skill is automatically scanned by [skill-shield](../SKILL.md) for prompt injection, data exfiltration vectors, and destructive operations before it's accepted.

Think npm, but with a mandatory security audit on every package — and a public trust score so you know exactly what you're getting.

---

## How Skills Are Verified

Every PR that adds or modifies a skill triggers the `skill-shield-ci` workflow:

1. **Automated scan** — skill-shield analyzes SKILL.md, any scripts, and configuration files
2. **Trust report** — a detailed report is posted as a PR comment (patterns found, severity, score)
3. **Grade assignment** — skills receive an A–F grade based on their trust score
4. **Gate enforcement** — PRs with a score below 50 (grade D or F) are blocked from merging
5. **Manual review** — maintainers review flagged patterns before final approval

Skills that pass ship with a `shield-verified` label and a trust badge.

---

## Trust Score Badges

| Grade | Score | Meaning | Badge |
|-------|-------|---------|-------|
| A | 80–100 | No suspicious patterns found | ![A](https://img.shields.io/badge/skill--shield-A%20TRUSTED-brightgreen) |
| B | 65–79 | Minor patterns, all documented | ![B](https://img.shields.io/badge/skill--shield-B%20GOOD-green) |
| C | 50–64 | Some patterns, documented with justification | ![C](https://img.shields.io/badge/skill--shield-C%20CAUTION-yellow) |
| D | 35–49 | Multiple patterns, review before use | ![D](https://img.shields.io/badge/skill--shield-D%20WARNING-orange) |
| F | 0–34 | Blocked — not accepted into this marketplace | ![F](https://img.shields.io/badge/skill--shield-F%20BLOCKED-red) |

Grade D and F skills are automatically blocked at the CI gate.

---

## Installing Skills

### Claude Code

```bash
# Install a skill from this marketplace
cp -r skills/your-skill ~/.claude/skills/your-skill
```

### Cursor / Copilot / Codex / Gemini CLI

Skills follow a cross-platform format. Each skill directory contains:
- `SKILL.md` — the skill definition with frontmatter metadata
- `scripts/` (optional) — helper scripts the skill may reference

Copy the skill directory to wherever your agent loads skills from. All skills in this marketplace are tested for compatibility with:

- **Claude Code** — `~/.claude/skills/`
- **OpenAI Codex** — `.codex/skills/`
- **Gemini CLI** — `.gemini/skills/`
- **Cursor** — `.cursor/skills/`
- **GitHub Copilot** — `.github/skills/`

---

## Submitting a Skill

1. Fork this repository
2. Add your skill directory under `skills/your-skill-name/`
3. Your skill needs at minimum: `SKILL.md` with valid frontmatter
4. Open a PR — the CI workflow runs automatically
5. The trust report posts as a comment on your PR
6. Address any flagged patterns (see [CONTRIBUTING.md](CONTRIBUTING.md))
7. A maintainer reviews and merges if the grade is C or above

**The bar is honest documentation, not perfection.** A skill that legitimately uses network calls can still get a B if that use is clearly documented in the SKILL.md frontmatter.

---

## Stats

- **Community average**: 63/100 trust score
- **Skills in this marketplace**: scanned and verified
- **False positive rate**: documented in each skill's frontmatter
- **36.8% of community skills have security flaws.** Every skill here has been scanned.

---

## Why This Exists

Agent skills are arbitrary instruction sets that run with the same permissions as your agent — which often means shell access, file system access, and network access. An unvetted skill is an unvetted piece of code running in a trusted context.

This marketplace is the answer: automated scanning, public trust scores, and a community that takes agent security seriously.

---

## License

MIT. Skills are individually licensed by their authors — check each skill's frontmatter.
