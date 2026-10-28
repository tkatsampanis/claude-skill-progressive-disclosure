const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SKILLS_DIR = path.join(process.env.HOME, '.claude', 'skills');
const OUTPUT_FILE = path.join(process.env.HOME, '.claude', 'CLAUDE.md');
const QUIET_MODE = process.argv.includes('--quiet');

const START_TAG = '<!-- SKILL-INDEX:START -->';
const END_TAG = '<!-- SKILL-INDEX:END -->';

function normalizeDescription(description) {
  if (!description) return 'Use when no specific trigger identified.';
  const trimmed = description.trim();
  if (/^use when\b/i.test(trimmed)) {
    return trimmed.replace(/^use when\s*/i, 'Use when ');
  }
  return `Use when ${trimmed}`;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const rawYaml = match[1];

  const result = { name: '', description: '', tags: [] };

  const nameMatch = rawYaml.match(/^name:\s*["']?([^"'\r\n]+)["']?/m);
  if (nameMatch) result.name = nameMatch[1].trim();

  const descMatch = rawYaml.match(/^description:\s*(?:[>|]-?\s*)?(["']?[\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|$)/m);
  if (descMatch) {
    result.description = descMatch[1]
      .replace(/^["']|["']$/g, '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const tagBlockMatch = rawYaml.match(/tags:\s*(\[[^\]]+\]|(?:\n\s*-\s*[^\n]+)+)/m);
  if (tagBlockMatch) {
    const rawTags = tagBlockMatch[1];
    if (rawTags.startsWith('[')) {
      result.tags = rawTags.replace(/[\[\]"']/g, '').split(',').map(t => t.trim()).filter(Boolean);
    } else {
      result.tags = rawTags.split('\n').map(l => l.replace(/^\s*-\s*["']?|["']?\s*$/g, '').trim()).filter(Boolean);
    }
  }

  return result;
}

function generateCatalog() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const catalog = [];
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      skipped++;
      continue;
    }

    try {
      const content = fs.readFileSync(skillPath, 'utf8');
      const parsed = parseFrontmatter(content);
      const name = (parsed && parsed.name) ? parsed.name : entry.name;

      let summary = '';
      if (parsed && parsed.description) {
        summary = parsed.description;
      } else {
        const bodyLines = content.replace(/^---[\s\S]*?---/, '').split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#') && !l.startsWith('---'));
        summary = bodyLines[0] || 'Specialized skill for contextual tasks.';
      }

      summary = normalizeDescription(summary);

      const tagsSuffix = (parsed && parsed.tags && parsed.tags.length > 0)
        ? ` [Triggers: ${parsed.tags.join(', ')}]`
        : '';

      catalog.push(`- **${name}**: ${summary}${tagsSuffix}`);
    } catch (err) {
      console.warn(`Failed to parse ${entry.name}:`, err.message);
      skipped++;
    }
  }

  catalog.sort();
  return { catalog, skipped };
}

function run() {
  const { catalog, skipped } = generateCatalog();
  const generatedSection = `${START_TAG}\n### Indexed Skills (${catalog.length} Total)\n${catalog.join('\n')}\n${END_TAG}`;

  let existingContent = '';
  if (fs.existsSync(OUTPUT_FILE)) {
    existingContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
  }

  let newContent = '';
  const hasMarkers = existingContent.includes(START_TAG) && existingContent.includes(END_TAG);

  if (hasMarkers) {
    const startIdx = existingContent.indexOf(START_TAG);
    const endIdx = existingContent.indexOf(END_TAG) + END_TAG.length;
    newContent = existingContent.substring(0, startIdx) + generatedSection + existingContent.substring(endIdx);
  } else {
    const defaultHeader = `# Claude Code Global Configuration

You have access to the local user-installed skills indexed below.
- Do NOT load full skill documentation upfront.
- When user intent naturally matches a skill's domain, purpose, or trigger, inspect and follow \`~/.claude/skills/<skill-name>/SKILL.md\` only when executing that task.
- You may select and chain multiple skills when complementary.
- For unrelated general queries, proceed natively without invoking specialized skills.
`;
    newContent = existingContent.trim()
      ? `${existingContent.trim()}\n\n${generatedSection}\n`
      : `${defaultHeader}\n${generatedSection}\n`;
  }

  // Hash check for quiet mode
  const oldHash = crypto.createHash('md5').update(existingContent).digest('hex');
  const newHash = crypto.createHash('md5').update(newContent).digest('hex');

  if (QUIET_MODE && oldHash === newHash) {
    process.exit(0);
  }

  fs.writeFileSync(OUTPUT_FILE, newContent, 'utf8');
  if (!QUIET_MODE) {
    console.log(`Success: Indexed ${catalog.length} skills (Skipped: ${skipped}). Written to ${OUTPUT_FILE}`);
  }
}

run();
