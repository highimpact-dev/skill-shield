# Trust Badges

Add a shield-verified badge to your skill's README to show it's been scanned and accepted into the Shielded Skills Marketplace.

---

## Adding a Badge to Your Skill

Copy the Markdown for your skill's grade and paste it at the top of your skill's README:

### Grade A (80–100) — Trusted

No suspicious patterns found.

```markdown
![Shield Verified](https://img.shields.io/badge/skill--shield-A%20TRUSTED-brightgreen)
```

![Shield Verified](https://img.shields.io/badge/skill--shield-A%20TRUSTED-brightgreen)

---

### Grade B (65–79) — Good

Minor patterns present, all documented.

```markdown
![Shield Verified](https://img.shields.io/badge/skill--shield-B%20GOOD-green)
```

![Shield Verified](https://img.shields.io/badge/skill--shield-B%20GOOD-green)

---

### Grade C (50–64) — Caution

Some patterns present with documented justification.

```markdown
![Shield Verified](https://img.shields.io/badge/skill--shield-C%20CAUTION-yellow)
```

![Shield Verified](https://img.shields.io/badge/skill--shield-C%20CAUTION-yellow)

---

### Grade D (35–49) — Warning

Multiple patterns present. Not accepted into this marketplace.

```markdown
![Shield Verified](https://img.shields.io/badge/skill--shield-D%20WARNING-orange)
```

![Shield Verified](https://img.shields.io/badge/skill--shield-D%20WARNING-orange)

---

### Grade F (0–34) — Blocked

Blocked. Not accepted into this marketplace.

```markdown
![Shield Verified](https://img.shields.io/badge/skill--shield-F%20BLOCKED-red)
```

![Shield Verified](https://img.shields.io/badge/skill--shield-F%20BLOCKED-red)

---

## Dynamic Badges (Advanced)

If you want a badge that reflects the current score dynamically, you can use shields.io with a JSON endpoint once your skill is listed:

```markdown
![Shield Score](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fyour-org%2Fshielded-skills%2Fmain%2F.claude-plugin%2Fmarketplace.json&query=%24.plugins%5B%3F(%40.name%3D%3D'your-skill')%5D.score&label=skill-shield&color=brightgreen)
```

Replace `your-skill` with your skill's name. Score data is populated when your skill is accepted.

---

## Linking Back to the Marketplace

Optionally add a link so users can verify your skill's scan results:

```markdown
[![Shield Verified](https://img.shields.io/badge/skill--shield-A%20TRUSTED-brightgreen)](https://github.com/your-org/shielded-skills/tree/main/skills/your-skill-name)
```

---

## Badge Colors by Grade

| Grade | Color Name | Hex |
|-------|-----------|-----|
| A | brightgreen | `#4c1` |
| B | green | `#97ca00` |
| C | yellow | `#dfb317` |
| D | orange | `#fe7d37` |
| F | red | `#e05d44` |

These match the shields.io named colors for consistency.
