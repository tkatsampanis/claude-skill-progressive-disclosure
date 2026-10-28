
# Claude Code Skill Progressive Disclosure Indexer

A lightweight, local-first, zero-dependency indexing system that makes locally installed Claude Code skills easier to discover without placing every skill's complete instructions into the global context upfront.

The indexer generates a compact catalog of available skills and synchronizes it into a designated section of Claude Code's global instructions. This gives Claude a concise overview of available capabilities while keeping detailed skill documentation separate until it is relevant to a task.

The goal is to make growing skill libraries easier to discover, maintain, and scale without introducing a custom router that intercepts every user prompt.

## Table of Contents

- [The Problem](#the-problem)
- [The Core Idea](#the-core-idea)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Design Principles](#design-principles)
- [Installation](#installation)
- [Configuration](#configuration)
- [Keeping the Index Updated](#keeping-the-index-updated)
- [Verification and Testing](#verification-and-testing)
- [Limitations and Considerations](#limitations-and-considerations)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

---

## The Problem

Claude Code skills provide specialized instructions, workflows, conventions, and tooling guidance for particular tasks. As a personal skill library grows, making those capabilities consistently discoverable becomes increasingly important.

A library containing dozens or hundreds of skills may cover programming, debugging, research, writing, documentation, productivity, integrations, and many other domains.

Several challenges emerge as the library grows.

### 1. Loading too much instruction upfront

Skill documents can contain extensive instructions, examples, workflows, and tool-specific guidance. Loading all of that information into the initial context would consume tokens even when most skills are unrelated to the current task.

Keeping the initial context focused helps reduce unnecessary overhead and makes the active instructions easier to manage.

### 2. Discovering relevant capabilities

Users should not need to memorize every installed skill or remember its exact name.

A useful discovery mechanism should expose enough information about available skills for Claude Code to recognize potentially relevant capabilities, including when a request describes a task without explicitly naming the corresponding skill.

### 3. Avoiding unnecessary routing infrastructure

One possible solution is a custom router that intercepts each prompt, evaluates keywords or patterns, and decides which skills to activate.

Such a router can be useful in some environments, but it introduces additional execution paths, maintenance requirements, and potential matching errors.

For a local skill library, a compact catalog within the existing global instruction file provides a simpler approach to explore.

### 4. Preserving existing configuration

A user's global instruction file may contain important behavioral rules, preferences, conventions, and other configuration.

An indexing system should not replace the entire file just to update a generated skill catalog.

Instead, it should manage a clearly delimited section while preserving user-authored content outside that section.

### 5. Keeping maintenance simple

Manually maintaining a list of installed skills becomes inconvenient as skills are added, removed, renamed, or updated.

The catalog should be generated from the available skill documents rather than requiring a separate list to be maintained by hand.

---

## The Core Idea

The project uses progressive disclosure: expose a compact description of available skills first, then consult detailed instructions when a skill is relevant to the task.

Rather than copying the full contents of every skill into the global instruction file, the indexer generates a concise catalog intended to help Claude identify potentially relevant capabilities.

The catalog is maintained between two explicit markers:

<!-- SKILL-INDEX:START -->
<!-- SKILL-INDEX:END -->

These markers define the section managed by the indexer. The intended design is to replace the generated content inside that section while preserving instructions outside it.

Each catalog entry can describe a skill's name, purpose, and relevant discovery information, depending on the metadata supported by the implementation.

This separates two concerns:

- **Discoverability:** A compact overview of available capabilities.
- **Detailed instructions:** The complete documentation for a skill, consulted when appropriate.

The approach is designed to work with different types of locally installed skills without hardcoding individual skill names or task categories.

---

## How It Works

The workflow consists of four stages.

### Stage 1: Discover installed skills

The indexer examines the configured skills directory and identifies supported skill documents.

A conventional local skills directory is:

`~/.claude/skills/`

Each skill typically resides in its own subdirectory and contains a `SKILL.md` file.

The exact discovery rules, supported metadata, and handling of unusual directory structures depend on the implementation of `build-skill-index.js`.

### Stage 2: Generate a compact catalog

The indexer creates a concise entry for each recognized skill.

An illustrative entry might look like this:

- **example-skill**: Use when working on a particular category of task.

The purpose is to preserve useful discovery information without copying the complete skill document into the catalog.

The exact entry format depends on the implementation.

### Stage 3: Synchronize the global instruction file

The generated catalog is written into the designated section of:

`~/.claude/CLAUDE.md`

The marker-bounded design allows the generated catalog to coexist with existing global instructions.

When the index is regenerated, the intended behavior is to update the managed section rather than repeatedly append duplicate entries.

Users should verify that the implementation preserves content outside the managed region before relying on it with important configuration files.

### Stage 4: Discover relevant instructions

Claude Code receives the compact catalog as part of its global instructions.

When a user requests a task related to an installed skill, Claude can use the available descriptions to identify potentially relevant documentation and consult the corresponding `SKILL.md` when appropriate.

Unrelated tasks do not inherently require every skill document to be loaded merely because the skill exists.

Tasks can also involve multiple complementary skills when their instructions are relevant.

The index improves discoverability; it does not guarantee that Claude will select the correct skill for every request.


---

## Architecture

The design consists of three main components.

### 1. Local skill collection

Individual skills reside in the local skills directory. Each skill contains its own documentation and task-specific instructions.

The indexer discovers supported skill documents rather than maintaining a hardcoded list of skill names.

### 2. Index compiler

`build-skill-index.js` is the indexing script.

Its intended responsibilities are to:

- Discover installed skills.
- Extract or construct compact catalog entries.
- Generate the skill index.
- Synchronize the managed section of the global instruction file.

The project is designed to run locally through Node.js without requiring a separate framework, database, or hosted indexing service.

### 3. Global instruction file

`~/.claude/CLAUDE.md` contains the user's global instructions and the generated catalog.

The catalog supplements those instructions by providing a compact overview of available capabilities.

### Architectural overview

```text
~/.claude/skills/
        |
        | Discover supported skill documents
        v
build-skill-index.js
        |
        | Generate compact catalog
        v
~/.claude/CLAUDE.md
        |
        | Claude uses catalog for discovery
        v
Relevant SKILL.md files
        |
        v
Task-specific execution
```

This architecture uses the existing instruction mechanism rather than requiring a separate service to intercept every prompt.

---

## Design Principles

### Minimal dependencies

The indexer is designed to use Node.js built-in functionality rather than requiring a separate framework, database, or external LLM service.

The zero-dependency claim assumes the implementation uses only built-in Node.js modules.

### Compact global context

The generated catalog contains concise descriptions and discovery metadata rather than the complete bodies of every skill document.

The catalog still consumes context, and its size increases as more skills are indexed.

### Non-destructive synchronization

Explicit start and end markers identify the section managed by the indexer.

The intended behavior is to preserve user-authored instructions outside this section. Marker validation and error handling should be verified before using the script with important configuration files.

### Repeatable generation

Running the indexer repeatedly with unchanged inputs should produce a consistent catalog without duplicate entries.

Whether unchanged output avoids unnecessary file writes depends on the implementation.

### General-purpose discovery

The indexing mechanism is intended to support different skill categories rather than a fixed set of predefined tasks.

Skills may describe programming workflows, research processes, creative work, integrations, document handling, or other capabilities.

### Minimal runtime intervention

The approach does not require a custom router to process every user prompt.

An optional session-start hook may be used to refresh the index automatically, provided the script supports the required invocation and the hook is configured correctly.

### Local-first operation

Skill discovery and catalog generation take place locally.

The indexing process does not inherently require sending skill documentation to a remote indexing service. Individual skills may still use network services or external tools.

---

## Installation

### Requirements

- Node.js installed and available through the `node` command.
- Claude Code installed and configured.
- A local Claude Code configuration directory at `~/.claude/`.
- A skills directory containing supported skill documents.

### 1. Obtain the project

Clone the repository after it has been published to GitHub:

```bash
git clone https://github.com/YOUR_USERNAME/claude-skill-progressive-disclosure.git
cd claude-skill-progressive-disclosure
```

Replace `YOUR_USERNAME` with the GitHub account that hosts the repository.

Alternatively, download the repository and open a terminal in its root directory.

### 2. Back up your global instructions

The indexer is intended to update the global instruction file. Before running it, create a backup:

```bash
cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.backup
```

If the file does not exist, verify the configuration path expected by your installation before proceeding.

### 3. Install the indexer

Copy the script into the global Claude configuration directory:

```bash
mkdir -p ~/.claude
cp ./build-skill-index.js ~/.claude/build-skill-index.js
```

Run this command from the repository root.

### 4. Generate the initial catalog

Execute the indexer:

```bash
node ~/.claude/build-skill-index.js
```

Review the command output and inspect the resulting global instruction file.

### 5. Verify the generated index

Inspect the file:

```bash
cat ~/.claude/CLAUDE.md
```

Check that:

- The expected start and end markers are present.
- The catalog contains the skills you expect.
- Existing instructions outside the managed section remain intact.
- Generated descriptions are concise and useful.

The exact output depends on the implementation and the skills installed on the machine.

---

## Configuration

The global instruction file should explain how Claude Code is expected to use the catalog.

The following is an illustrative example of the intended structure, not a replacement for an existing configuration:

```markdown
# Claude Code Global Configuration

You have access to the locally installed skills indexed below.

- Do not load all skill documentation upfront.
- When a task matches a skill's purpose, inspect its `SKILL.md`
  and follow the relevant instructions.
- Use multiple complementary skills when appropriate.
- For unrelated tasks, proceed without unnecessarily consulting
  specialized skill documentation.

<!-- SKILL-INDEX:START -->
Generated skill catalog goes here.
<!-- SKILL-INDEX:END -->
```

Use the actual generated catalog in place of the illustrative text.

### Configuration considerations

- Preserve existing global instructions that remain useful.
- Avoid manually editing the generated region unless manual overrides are explicitly supported.
- Confirm that the indexer and Claude Code use the same skills directory.
- Verify that generated entries correspond to actual installed skills.
- Review the implementation's supported metadata and marker-handling rules.
- Back up important configuration before testing changes.


---

## Keeping the Index Updated

The catalog should reflect the skills currently installed on the machine.

Run the indexer manually whenever skills are added, removed, renamed, or updated:

```bash
node ~/.claude/build-skill-index.js
```

### Optional automatic synchronization

An optional session-start hook can refresh the catalog when a new Claude Code session begins.

The following is an illustrative configuration pattern:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/build-skill-index.js\""
          }
        ]
      }
    ]
  }
}
```

Merge the relevant hook into your existing settings configuration rather than replacing the entire file.

Before enabling the hook, verify the current Claude Code hook schema and confirm that the indexer supports the command and arguments being used. Add options such as `--quiet` only if the script implements them.

Automatic synchronization is optional. The basic workflow can operate with manual index generation.

---

## Verification and Testing

Successful index generation does not by itself guarantee correct skill selection. Testing should cover both the catalog and its interaction with Claude Code.

### 1. Index generation

Run the indexer and verify that the catalog contains the expected installed skills.

Check for missing entries, duplicated records, and malformed descriptions.

### 2. Repeatability

Run the indexer more than once without changing the installed skills.

The output should remain consistent and should not accumulate duplicate entries.

### 3. Preservation of custom instructions

Back up the global instruction file before testing.

Add custom text outside the managed section, regenerate the catalog, and verify that the custom text remains unchanged.

### 4. Skill discovery

Try representative tasks that correspond to different installed skills.

Test both explicit references to a capability and natural-language descriptions of the same task.

Observe whether Claude identifies and consults the appropriate skill documentation.

### 5. Unrelated tasks

Ask general questions that do not require specialized skills.

The intended behavior is to avoid unnecessary consultation of unrelated skill documentation.

### 6. Multiple relevant skills

Test a task that genuinely requires multiple complementary skills.

Verify that the catalog and global instructions do not unnecessarily restrict discovery to a single skill.

### 7. Automatic synchronization

If a session-start hook is enabled, start a new Claude Code session and verify that the hook runs successfully.

Inspect the generated catalog and check for errors.

These tests should be performed with representative skills and configuration files before relying on the indexer in a large or important environment.

---

## Limitations and Considerations

### Discovery quality depends on descriptions

The catalog must communicate each skill's purpose accurately. Vague or incomplete descriptions can make relevant skills harder to identify.

### Discovery does not guarantee activation

The index exposes available capabilities to Claude Code, but it does not guarantee that a particular skill will be selected for every relevant request.

Actual behavior depends on the model, global instructions, skill descriptions, and Claude Code's skill-loading behavior.

### Context overhead is reduced, not eliminated

A compact catalog still consumes context. Its size grows with the number of installed skills and the amount of metadata included in each entry.

The approach avoids placing every complete skill document into the initial catalog; it does not eliminate the cost of discovery.

### File-system assumptions matter

The indexer must correctly identify supported skill directories, interpret their documentation, and handle missing or malformed files.

Review the implementation's discovery and error-handling behavior before relying on it in a complex environment.

### Automatic synchronization is optional

A session-start hook can make updates more convenient, but it is not required for manual operation.

Hook configuration should be tested independently from index generation.

### Performance claims require measurement

The design avoids the need for a custom per-turn routing service, but actual latency, context usage, and model costs depend on the environment and workload.

Quantified performance or cost-saving claims should be supported by measurements rather than assumptions.

---

## Project Structure

The repository is intended to contain the indexer and its documentation:

```text
claude-skill-progressive-disclosure/
├── build-skill-index.js
├── CLAUDE.example.md
├── README.md
└── .gitignore
```

The example configuration file illustrates the structure of global instructions and the generated catalog. It is not intended to replace a user's actual global configuration.

Do not publish private configuration, credentials, personal instructions, or local history in the example file.

---

## Contributing

Contributions are welcome, particularly improvements that make skill discovery more reliable, index generation safer, and configuration easier to maintain.

Useful areas for contribution include:

- Improving skill discovery and metadata extraction.
- Handling malformed files and unusual directory structures.
- Preserving user-authored instructions during index updates.
- Improving repeatability and avoiding unnecessary file writes.
- Adding tests for generated output and synchronization behavior.
- Improving installation guidance and error messages.
- Supporting larger skill libraries without unnecessarily expanding the catalog.
- Documenting limitations and testing behavior across different configurations.

Prefer simple, verifiable improvements that preserve the project's local-first and low-dependency design.
