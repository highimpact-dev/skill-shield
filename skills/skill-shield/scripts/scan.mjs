#!/usr/bin/env node

/**
 * skill-shield scanner — static analysis engine for agent skills
 * Scans SKILL.md files, scripts, hooks, and commands for security threats.
 * Outputs structured JSON report with trust score.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, extname, basename } from "path";

// ─── Threat Pattern Definitions ───────────────────────────────────────────────

const THREAT_PATTERNS = {
  prompt_injection: {
    severity: "critical",
    category: "Prompt Injection",
    patterns: [
      {
        name: "instruction_override",
        regex: /ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(\w+\s+)?(instructions?|rules?|guidelines?|prompts?|context)/i,
        description: "Attempts to override prior instructions",
      },
      {
        name: "role_hijack",
        regex: /you\s+are\s+now\s+(a|an|the)\s+/i,
        description: "Attempts to reassign agent identity",
      },
      {
        name: "system_prompt_override",
        regex: /(system\s*prompt|system\s*message|system\s*instruction)\s*[:=]/i,
        description: "Attempts to set/override system prompt",
      },
      {
        name: "jailbreak_keywords",
        regex: /\b(DAN|do\s+anything\s+now|jailbreak|bypass\s+(safety|filter|restriction)|unlocked\s+mode)\b/i,
        description: "Known jailbreak technique keywords",
      },
      {
        name: "instruction_boundary_attack",
        regex: /(END\s+OF\s+(SYSTEM|INSTRUCTIONS?)|<\/system>|<\/instructions?>|\[INST\]|\[\/INST\])/i,
        description: "Fake instruction boundary markers",
      },
      {
        name: "hidden_instruction_markdown",
        regex: /<!--[\s\S]*?(ignore|override|forget|disregard|new instructions|read and|include contents|output.*file|exfiltrat)[\s\S]*?-->/i,
        description: "Hidden instructions in HTML/markdown comments",
      },
      {
        name: "hidden_command_in_comment",
        regex: /<!--[\s\S]*?(curl|wget|bash|sh\s|python|node\s|eval|exec|fetch|nc\s|ncat|socat|ssh|scp|rsync)[\s\S]*?-->/i,
        description: "Executable command hidden in HTML/markdown comment",
      },
      {
        name: "pipe_to_shell",
        regex: /(curl|wget|fetch)\s+[^\n]*\|\s*(bash|sh|zsh|python|node|ruby|perl|exec)/i,
        description: "Fetching remote content and piping to shell execution",
      },
      {
        name: "backtick_command_in_comment",
        regex: /<!--[\s\S]*?`[^`]*(curl|wget|bash|rm|eval|exec|python|node)[^`]*`[\s\S]*?-->/i,
        description: "Backtick-wrapped command hidden in HTML comment",
      },
      {
        name: "unicode_homoglyph_obfuscation",
        regex: /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/,
        description: "Zero-width or invisible Unicode characters (obfuscation)",
      },
      {
        name: "prompt_leak_request",
        regex: /(show|print|output|reveal|display|repeat)\s+(your|the|my)?\s*(system\s*)?(prompt|instructions?|rules?|guidelines?)/i,
        description: "Attempts to extract system prompt or instructions",
      },
      {
        name: "context_manipulation",
        regex: /\b(pretend|act\s+as\s+if|assume|imagine)\s+(you|that|there)\s+(are|is|have|has|were|was)\s+(no|zero|unlimited)/i,
        description: "Context manipulation to remove guardrails",
      },
      {
        name: "output_sensitive_files",
        regex: /(include|output|print|display|show|read)\s+(the\s+)?(full\s+)?(contents?\s+of|all)\s+.*(\.env|config|credential|secret|key|password|token)/i,
        description: "Instructions to output sensitive file contents",
      },
      {
        name: "social_engineering_diagnostics",
        regex: /(environment\s+diagnostics|system\s+info|include\s+all\s+env\s+vars|full\s+environment)/i,
        description: "Social engineering via fake diagnostics requests",
      },
    ],
  },

  data_exfiltration: {
    severity: "critical",
    category: "Data Exfiltration",
    patterns: [
      {
        name: "env_var_access",
        regex: /(\$\{?[A-Z_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH)[A-Z_]*\}?|process\.env\[?['"](.*?(KEY|TOKEN|SECRET|PASS|AUTH|CRED).*?)['"]\]?|os\.environ\[?['"](.*?(KEY|TOKEN|SECRET|PASS|AUTH|CRED).*?)['"]\]?)/i,
        description: "Accessing sensitive environment variables (keys, tokens, secrets)",
      },
      {
        name: "credential_file_access",
        regex: /(~\/|\/home\/|\/Users\/|\$HOME\/)\.(ssh|aws|gnupg|kube|docker|npmrc|netrc|gitconfig|env|credentials|config\/gcloud)/,
        description: "Reading credential or config files",
      },
      {
        name: "curl_post_external",
        regex: /curl\s+(-[^s])*\s*(-X\s*(POST|PUT)|--data|--data-raw|-d\s)/i,
        description: "HTTP POST/PUT to external endpoint (potential data exfiltration)",
      },
      {
        name: "fetch_post_external",
        regex: /(fetch|axios|got|request)\s*\([^)]*method\s*:\s*['"]POST['"]/i,
        description: "JS HTTP POST request (potential data exfiltration)",
      },
      {
        name: "webhook_exfiltration",
        regex: /(webhook|ngrok|requestbin|pipedream|hookbin|burpcollaborator|interact\.sh|oast)/i,
        description: "References to webhook/exfiltration services",
      },
      {
        name: "dns_exfiltration",
        regex: /(nslookup|dig|host)\s+.*\$|(\$\(.*\))\.(.*\.)+[a-z]{2,}/i,
        description: "DNS-based data exfiltration pattern",
      },
      {
        name: "clipboard_access",
        regex: /(pbcopy|pbpaste|xclip|xsel|wl-copy|wl-paste|clip\.exe|Get-Clipboard|Set-Clipboard)/,
        description: "Clipboard access (potential data theft)",
      },
      {
        name: "browser_data_access",
        regex: /(Chrome|Firefox|Safari|Brave|Edge)\/(Default|Profile)?\/(Cookies|Login\s*Data|History|Bookmarks|Web\s*Data)/i,
        description: "Accessing browser profile data",
      },
    ],
  },

  destructive_operations: {
    severity: "high",
    category: "Destructive Operations",
    patterns: [
      {
        name: "recursive_delete",
        regex: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive\s+--force|-[a-zA-Z]*f[a-zA-Z]*r)\s/,
        description: "Recursive force deletion",
      },
      {
        name: "force_push",
        regex: /git\s+push\s+(-[a-zA-Z]*f|--force(?!-with-lease))/,
        description: "Git force push (can destroy remote history)",
      },
      {
        name: "hard_reset",
        regex: /git\s+reset\s+--hard/,
        description: "Git hard reset (discards all changes)",
      },
      {
        name: "drop_database",
        regex: /DROP\s+(DATABASE|TABLE|SCHEMA)\s/i,
        description: "SQL DROP statement",
      },
      {
        name: "disk_wipe",
        regex: /(dd\s+if=\/dev\/(zero|urandom)\s+of=|mkfs\.|format\s+[A-Z]:)/i,
        description: "Disk formatting or overwriting",
      },
      {
        name: "kill_processes",
        regex: /kill\s+-9\s+(-1|\$\(|`)|killall\s+-9/,
        description: "Aggressive process killing",
      },
      {
        name: "chmod_world_writable",
        regex: /chmod\s+(-R\s+)?[0-7]*7[0-7]*\s|chmod\s+(-R\s+)?a\+w/,
        description: "Making files world-writable",
      },
      {
        name: "cron_modification",
        regex: /(crontab\s+-[re]|\/etc\/cron)/,
        description: "Modifying cron jobs (persistence mechanism)",
      },
    ],
  },

  obfuscation: {
    severity: "high",
    category: "Code Obfuscation",
    patterns: [
      {
        name: "base64_decode_exec",
        regex: /(base64\s+(-d|--decode)|atob\s*\(|Buffer\.from\s*\([^)]*,\s*['"]base64['"]|b64decode)/,
        description: "Base64 decoding (may hide malicious payloads)",
      },
      {
        name: "eval_exec",
        regex: /\b(eval|exec|execSync|spawn|Function\s*\()\s*\(/,
        description: "Dynamic code execution",
      },
      {
        name: "hex_decode",
        regex: /(\\x[0-9a-fA-F]{2}){4,}|Buffer\.from\s*\([^)]*,\s*['"]hex['"]\)/,
        description: "Hex-encoded strings (may hide payloads)",
      },
      {
        name: "string_concatenation_obfuscation",
        regex: /['"][a-z]{1,3}['"]\s*\+\s*['"][a-z]{1,3}['"]\s*\+\s*['"][a-z]{1,3}['"]\s*\+/i,
        description: "Excessive string concatenation (obfuscation technique)",
      },
      {
        name: "shell_variable_obfuscation",
        regex: /\$\{[A-Z]#?\}.*\$\{[A-Z]#?\}.*\$\{[A-Z]#?\}/,
        description: "Shell variable-based string construction",
      },
      {
        name: "encoded_url",
        regex: /%[0-9a-fA-F]{2}.*%[0-9a-fA-F]{2}.*%[0-9a-fA-F]{2}.*%[0-9a-fA-F]{2}/,
        description: "Heavy URL encoding (may hide malicious URLs)",
      },
    ],
  },

  persistence: {
    severity: "high",
    category: "Persistence Mechanisms",
    patterns: [
      {
        name: "shell_profile_modification",
        regex: /(\.bashrc|\.zshrc|\.bash_profile|\.profile|\.zprofile)\s/,
        description: "Modifying shell profile files",
      },
      {
        name: "launchd_plist",
        regex: /(LaunchAgents|LaunchDaemons|launchctl)/,
        description: "macOS launch agent/daemon (persistence)",
      },
      {
        name: "systemd_service",
        regex: /(systemctl\s+(enable|start)|\/etc\/systemd|\.service\s+file)/,
        description: "Systemd service installation (persistence)",
      },
      {
        name: "hook_installation",
        regex: /(PreToolUse|PostToolUse|PreCompact|SessionStart|Stop)\s*.*hook/i,
        description: "Installing agent hooks (may persist after skill removal)",
      },
      {
        name: "global_settings_modification",
        regex: /(settings\.json|\.claude\/settings|\.cursor\/settings|\.vscode\/settings)/,
        description: "Modifying global agent/editor settings",
      },
      {
        name: "git_hook_installation",
        regex: /\.git\/hooks\/(pre-commit|post-commit|pre-push|post-receive)/,
        description: "Installing git hooks",
      },
    ],
  },

  network_access: {
    severity: "medium",
    category: "Network Access",
    patterns: [
      {
        name: "hardcoded_ip",
        regex: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)\b(?!.*(?:localhost|127\.0\.0\.1|0\.0\.0\.0|255\.255))/,
        description: "Hardcoded IP address (non-localhost)",
      },
      {
        name: "suspicious_tld",
        regex: /https?:\/\/[^\s]*\.(ru|cn|tk|ml|ga|cf|top|xyz|buzz|click|work)\b/i,
        description: "URL with suspicious TLD",
      },
      {
        name: "url_shortener",
        regex: /https?:\/\/(bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd|v\.gd|cutt\.ly|rb\.gy)\//i,
        description: "URL shortener (hides true destination)",
      },
      {
        name: "raw_github_content",
        regex: /raw\.githubusercontent\.com|gist\.githubusercontent\.com/,
        description: "Fetching raw content from GitHub (could be dynamic payload)",
      },
      {
        name: "package_install_global",
        regex: /(npm\s+install\s+-g|pip\s+install|gem\s+install|cargo\s+install|brew\s+install)/,
        description: "Installing global packages",
      },
    ],
  },

  permission_overreach: {
    severity: "medium",
    category: "Permission Overreach",
    patterns: [
      {
        name: "sudo_usage",
        regex: /\bsudo\s+/,
        description: "Requires elevated privileges",
      },
      {
        name: "docker_socket",
        regex: /\/var\/run\/docker\.sock|docker\s+exec|docker\s+run\s+(-[a-zA-Z]*v|--privileged)/i,
        description: "Docker socket access or privileged container",
      },
      {
        name: "keychain_access",
        regex: /(security\s+find-(generic|internet)-password|keytar|keychain)/i,
        description: "Accessing system keychain/credential store",
      },
      {
        name: "process_inspection",
        regex: /\/proc\/\d+\/(environ|cmdline|maps|mem)/,
        description: "Reading other process memory/environment",
      },
      {
        name: "wildcard_file_glob",
        regex: /\bfind\s+\/\s+-name\b|\bls\s+-[a-zA-Z]*R\s+\/\b/,
        description: "Recursive filesystem enumeration from root",
      },
    ],
  },
};

// ─── File Collection ──────────────────────────────────────────────────────────

function collectFiles(dir, maxDepth = 5, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith(".") && entry !== ".claude-plugin") continue;
      if (entry === "node_modules" || entry === ".git") continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          files.push(...collectFiles(fullPath, maxDepth, currentDepth + 1));
        } else if (stat.isFile() && stat.size < 500_000) {
          files.push(fullPath);
        }
      } catch {
        // skip unreadable
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return files;
}

// ─── Scanning ─────────────────────────────────────────────────────────────────

// Patterns that need multi-line matching (HTML comments spanning multiple lines)
const MULTILINE_PATTERNS = new Set([
  "hidden_instruction_markdown",
  "hidden_command_in_comment",
  "backtick_command_in_comment",
]);

function scanFile(filePath, content) {
  const findings = [];
  const lines = content.split("\n");
  const foundPatterns = new Set();

  // Pass 1: line-by-line scanning
  for (const [categoryKey, category] of Object.entries(THREAT_PATTERNS)) {
    for (const pattern of category.patterns) {
      if (MULTILINE_PATTERNS.has(pattern.name)) continue; // handled in pass 2
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.regex.test(line)) {
          pattern.regex.lastIndex = 0;
          foundPatterns.add(pattern.name);
          findings.push({
            category: category.category,
            categoryKey,
            severity: category.severity,
            pattern: pattern.name,
            description: pattern.description,
            file: filePath,
            line: i + 1,
            content: line.trim().substring(0, 200),
          });
          break; // one finding per pattern per file
        }
      }
    }
  }

  // Pass 2: multi-line scanning (for patterns that span lines, e.g. HTML comments)
  for (const [categoryKey, category] of Object.entries(THREAT_PATTERNS)) {
    for (const pattern of category.patterns) {
      if (!MULTILINE_PATTERNS.has(pattern.name)) continue;
      if (foundPatterns.has(pattern.name)) continue;
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(content)) {
        pattern.regex.lastIndex = 0;
        // Find approximate line number by searching for comment start
        const match = content.match(/<!--/);
        const lineNum = match ? content.substring(0, match.index).split("\n").length : 1;
        findings.push({
          category: category.category,
          categoryKey,
          severity: category.severity,
          pattern: pattern.name,
          description: pattern.description,
          file: filePath,
          line: lineNum,
          content: content.substring(match?.index || 0, (match?.index || 0) + 200).replace(/\n/g, " ").trim(),
        });
      }
    }
  }

  return findings;
}

function analyzeSkillStructure(skillDir) {
  const issues = [];
  const structure = { hasSkillMd: false, hasScripts: false, hasHooks: false, hasCommands: false, fileCount: 0, scriptFiles: [] };

  const files = collectFiles(skillDir);
  structure.fileCount = files.length;

  for (const f of files) {
    const rel = relative(skillDir, f);
    const base = basename(f);
    const ext = extname(f);

    if (base === "SKILL.md") structure.hasSkillMd = true;
    if (rel.startsWith("scripts/") || rel.startsWith("scripts\\")) {
      structure.hasScripts = true;
      structure.scriptFiles.push(rel);
    }
    if (rel.startsWith("hooks/") || rel.startsWith("hooks\\")) structure.hasHooks = true;
    if (rel.startsWith("commands/") || rel.startsWith("commands\\")) structure.hasCommands = true;

    // Flag executable scripts
    if ([".sh", ".bash", ".zsh", ".py", ".rb", ".pl"].includes(ext)) {
      structure.scriptFiles.push(rel);
    }
  }

  if (!structure.hasSkillMd) {
    issues.push({
      category: "Structure",
      severity: "medium",
      pattern: "missing_skill_md",
      description: "No SKILL.md found — non-standard skill structure",
      file: skillDir,
      line: 0,
      content: "",
    });
  }

  if (structure.hasHooks) {
    issues.push({
      category: "Structure",
      severity: "medium",
      pattern: "includes_hooks",
      description: "Skill installs hooks that execute on agent events — these persist after skill removal",
      file: skillDir,
      line: 0,
      content: `Hook directory found`,
    });
  }

  return { structure, issues };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calculateTrustScore(findings) {
  let score = 100;
  const deductions = { critical: 25, high: 15, medium: 8, low: 3 };
  const seen = new Set();

  for (const f of findings) {
    const key = `${f.categoryKey}:${f.pattern}`;
    if (!seen.has(key)) {
      seen.add(key);
      score -= deductions[f.severity] || 5;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function trustGrade(score) {
  if (score >= 90) return { grade: "A", label: "TRUSTED", emoji: "shield" };
  if (score >= 75) return { grade: "B", label: "LOW RISK", emoji: "check" };
  if (score >= 50) return { grade: "C", label: "MODERATE RISK", emoji: "warning" };
  if (score >= 25) return { grade: "D", label: "HIGH RISK", emoji: "alert" };
  return { grade: "F", label: "DANGEROUS", emoji: "skull" };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const skillPath = process.argv[2];
  if (!skillPath) {
    console.error("Usage: scan.mjs <path-to-skill-directory>");
    process.exit(1);
  }

  if (!existsSync(skillPath)) {
    console.error(`Error: path does not exist: ${skillPath}`);
    process.exit(1);
  }

  const allFindings = [];

  // Analyze structure
  const { structure, issues: structureIssues } = analyzeSkillStructure(skillPath);
  allFindings.push(...structureIssues);

  // Scan all files
  const files = collectFiles(skillPath);
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const rel = relative(skillPath, file);
      const findings = scanFile(rel, content);
      allFindings.push(...findings);
    } catch {
      // skip unreadable files
    }
  }

  // Calculate score
  const score = calculateTrustScore(allFindings);
  const grade = trustGrade(score);

  // Group findings by severity
  const bySeverity = {};
  for (const f of allFindings) {
    if (!bySeverity[f.severity]) bySeverity[f.severity] = [];
    bySeverity[f.severity].push(f);
  }

  // Group findings by category
  const byCategory = {};
  for (const f of allFindings) {
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category].push(f);
  }

  const report = {
    skill: skillPath,
    scanDate: new Date().toISOString(),
    scanner: "skill-shield v1.0.0",
    trustScore: score,
    grade: grade.grade,
    gradeLabel: grade.label,
    structure,
    summary: {
      totalFindings: allFindings.length,
      critical: (bySeverity.critical || []).length,
      high: (bySeverity.high || []).length,
      medium: (bySeverity.medium || []).length,
      low: (bySeverity.low || []).length,
    },
    findingsByCategory: byCategory,
    findings: allFindings,
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
