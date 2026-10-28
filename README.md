# Claude Code Skill Progressive Disclosure Indexer

A lightweight, zero-dependency Node.js utility that makes locally installed Claude Code skills easier to discover.

Instead of copying every skill's full instructions into your global context, this indexer builds a compact catalog from installed `SKILL.md` files and synchronizes it into `~/.claude/CLAUDE.md`.

The goal is simple: **make skills discoverable without loading every skill's documentation upfront.**

## Features

- **Automatic discovery:** Scans `~/.claude/skills/` for skill directories containing `SKILL.md`.
- **Compact catalog:** Extracts skill names, descriptions, and optional tags from YAML frontmatter.
- **Progressive disclosure:** Keeps the catalog separate from each skill's full instructions.
- **Managed section:** Uses explicit markers to identify the generated catalog.
- **Repeatable updates:** Regenerates the catalog as your installed skills change.
- **Quiet mode:** Supports `--quiet` for automation when the generated output is unchanged.
- **No external dependencies:** Uses Node.js built-in modules.

## How It Works

```text
~/.claude/skills/
       |
       | Discover SKILL.md files
       v
build-skill-index.js
       |
       | Generate compact catalog
       v
~/.claude/CLAUDE.md
       |
       | Discover relevant capabilities
       v
Read the relevant SKILL.md when needed
```

The generated catalog is placed between these markers:

```markdown
<!-- SKILL-INDEX:START -->
<!-- Generated skill catalog -->
<!-- SKILL-INDEX:END -->
```

The indexer replaces the managed section when both markers are present. If they are absent, it appends the catalog to existing non-empty content or creates a default global instruction file.

**Back up your global instructions before running the indexer for the first time.**

## Requirements

- macOS, Linux, or another environment that supports the script's filesystem operations.
- Node.js.
- Claude Code.
- Skills installed under `~/.claude/skills/`, with one `SKILL.md` per skill directory.

## Installation

Clone the repository:

```bash
git clone https://github.com/tkatsampanis/claude-skill-progressive-disclosure.git
cd claude-skill-progressive-disclosure
```

Back up your existing global instructions:

```bash
if [ -f "$HOME/.claude/CLAUDE.md" ]; then
  cp "$HOME/.claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md.backup"
fi
```

Install the indexer:

```bash
mkdir -p "$HOME/.claude"
cp ./build-skill-index.js "$HOME/.claude/build-skill-index.js"
```

Generate the catalog:

```bash
node "$HOME/.claude/build-skill-index.js"
```

Review the result:

```bash
cat "$HOME/.claude/CLAUDE.md"
```

Check that the catalog contains the expected skills and that your existing instructions remain intact.

## Skill Metadata

The indexer reads the `name`, `description`, and optional `tags` fields from a skill's YAML frontmatter.

Example:

```markdown
---
name: example-skill
description: Use when working on a specific type of task.
tags:
  - example
  - documentation
---

# Example Skill

Detailed task instructions go here.
```

Tags are optional. When a description is missing, the indexer attempts to use the first suitable non-heading line from the skill body.

The parser is intentionally lightweight; it is not a complete YAML parser.

## Updating the Catalog

Run the indexer again whenever you install, remove, rename, or update skills:

```bash
node "$HOME/.claude/build-skill-index.js"
```

### Optional Session-Start Hook

You can configure Claude Code to refresh the catalog at session startup. Merge a hook like the following into your existing settings rather than replacing the entire settings file:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/build-skill-index.js\" --quiet"
          }
        ]
      }
    ]
  }
}
```

Review the current Claude Code hook documentation and your existing settings before enabling this example.

## Testing

After installation, verify the following:

1. The script runs successfully.
2. The generated catalog contains your expected skills.
3. Running it repeatedly does not duplicate the catalog.
4. Instructions outside the managed section remain intact.
5. Adding or removing a skill changes the generated catalog as expected.

You can check the script's syntax with:

```bash
node --check build-skill-index.js
```

## Limitations

- Skill discovery depends on the expected directory structure.
- The catalog itself consumes context, although it is designed to be smaller than the complete contents of all skills.
- Descriptions and tags influence discoverability; the indexer does not guarantee that Claude will select the right skill for every request.
- The script uses a lightweight frontmatter parser rather than a full YAML implementation.
- Back up important configuration before modifying it.

## Project Structure

```text
claude-skill-progressive-disclosure/
├── .gitignore
├── README.md
├── CLAUDE.example.md
└── build-skill-index.js
```

## Contributing

Contributions are welcome. Useful improvements include better frontmatter parsing, safer marker validation, automated tests, and clearer error handling.

Please test changes against a backed-up configuration before using them with an existing Claude Code setup.

## License

No license has been specified for this project yet.
