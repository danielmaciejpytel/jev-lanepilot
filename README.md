# Jev LanePilot

**Small routing decisions. One focused coding worker.**

![Bounded routing for coding agents](assets/overview.svg)

An unofficial, dependency-free Node.js integration that asks TypeSafe Jev to recommend a worker lane for **Codex** or **Claude Code**. The host agent launches the worker and reviews its results. Your main chat keeps its selected model.

> Private review draft. This package has not been published or granted an open-source license. See [provenance and licensing](docs/PROVENANCE.md).

## Why this implementation?

- **Explicit decisions:** distinguish a Jev answer, a local policy override and a service-failure fallback.
- **A real uncertainty branch:** `UNKNOWN` provides no actionable worker; collect missing context first.
- **Small, inspectable runtime:** Node built-ins, a bounded Choice question, a fixed API endpoint and no automatic retries.
- **Host-specific workers:** Codex model/effort lanes and Claude model aliases, with one worker at a time.
- **Useful limits:** skip tiny edits, minimize task context and let tools verify changes.
- **Review before installation:** preview destinations first; existing files are not overwritten.

This is an instruction-driven workflow, not an always-on hook or model-switching proxy. The CLI returns routing data; it does **not** launch an agent by itself. Automatic execution depends on the host loading the skill, following its instructions and exposing a compatible delegation tool.

## Supported lanes

| Host | Normal choices | Local risk / repeated-failure lane | Service-failure fallback |
| --- | --- | --- | --- |
| Codex | Luna Low, Medium, High; Sol High | Sol High | Luna Medium |
| Claude Code | Haiku, Sonnet, Opus | Opus | Sonnet |

Codex profiles use `gpt-6-luna` and `gpt-6-sol`; Claude profiles use aliases `haiku`, `sonnet` and `opus`. Availability depends on the account and host. Unsupported models must be reported, not silently claimed to have run. Update routing mappings and worker profiles together if your host uses different IDs. No lane is guaranteed to be the cheapest adequate choice.

## Requirements

- Node.js **22 or later** on the host's PATH.
- Local Codex or Claude Code with skills and subagent support, already signed in.
- A TypeSafe account and `TYPESAFE_API_KEY` available in that application's environment.
- Permission to send a minimal task summary to TypeSafe. It leaves your machine; see [security and data flow](docs/SECURITY.md).

No npm dependencies need installing. `.env.example` is documentation only; this package does not load `.env` files.

## Quick start

Run commands from the reviewed repository folder:

```sh
node --version
node --test tests/*.test.mjs
```

### 1. Make the key available safely

Use your OS environment-variable UI or secret manager. Set `TYPESAFE_API_KEY` outside this repository, then restart the host application so it inherits the environment. Never paste a real key into chat, source files or a shell command saved in history.

On Windows, open **Edit environment variables for your account**, add the user variable and restart Codex or Claude Code. On macOS/Linux, use your normal secret-manager integration to launch the host with that environment variable. Already-running GUI apps do not necessarily inherit variables set in a terminal.

Check presence in PowerShell without displaying the value:

```powershell
[bool]$env:TYPESAFE_API_KEY
```

Do not relax the host's entire environment or permission policy to expose one variable.

### 2. Preview and install one host

**Codex** (use your configured Codex home if different):

```powershell
node scripts/install.mjs --host codex --target "$HOME/.codex"
node scripts/install.mjs --host codex --target "$HOME/.codex" --apply
```

**Claude Code:**

```powershell
node scripts/install.mjs --host claude --target "$HOME/.claude"
node scripts/install.mjs --host claude --target "$HOME/.claude" --apply
```

These paths also expand in a POSIX shell. Portable paths are intended; this review was performed on Windows, not a macOS/Linux test matrix.

The target host directory must already exist. The installer creates the skill and worker profiles. It does not edit global instructions, credentials or permission settings. Existing destination files cause an error: review or back them up yourself; there is no force-overwrite option. This includes profiles from an earlier private installation.

### 3. Opt in to automatic delegation

Review and manually merge the appropriate fragment into your host's global instructions:

- Codex: [AGENTS fragment](templates/codex/AGENTS.fragment.md) into the active global `AGENTS.md`.
- Claude Code: [CLAUDE fragment](templates/claude/CLAUDE.fragment.md) into `~/.claude/CLAUDE.md`.

Preserve unrelated instructions. Start a new local chat and ask it to use **jev-lanepilot** on a bounded coding task. Ask it to report the route source and worker actually launched. Normal tool approvals still apply. Installing files alone does not guarantee invocation in every conversation. Browser chats and remote/cloud environments do not inherit this installation.

### 4. Optional live router check

This sends the synthetic example to TypeSafe and may incur API usage. It does not launch a worker.

```powershell
Get-Content examples/task.json -Raw | node src/route.mjs --host codex
# Or replace codex with claude.
```

POSIX:

```sh
node src/route.mjs --host claude < examples/task.json
```

## How it works

![Routing decisions and verification](assets/decision-flow.svg)

1. The host skips tiny changes and gathers a minimal task summary.
2. Explicit security/architecture flags or two failed approaches trigger local escalation without an API call. The caller supplies these flags; this is not an automatic security detector.
3. Otherwise Jev selects a lane or `UNKNOWN`.
4. The host launches one matching worker, preserving the main chat model and normal permissions.
5. The parent reviews the real diff and relevant checks. A routing answer never proves completion.

On service failure a labeled local fallback is returned. On `UNKNOWN`, gather evidence before delegating. Do not retry unchanged failed attempts or let workers recursively route more workers.

## Evidence and limits

See [validation notes](docs/VALIDATION.md). The original local implementation completed Jev calls and worker dispatch in both hosts. A small synthetic Codex evaluation matched author-defined expectations in 7/7 Jev cases, plus 3/3 local-policy cases. This is **not** proof of production accuracy, benchmark superiority, cost savings or unlimited coding. The distributable package is tested separately with offline checks.

Main-agent reasoning, worker calls and Jev requests all consume usage. Delegation can add overhead. This repository makes no monthly-cost or savings promise.

## Troubleshooting

- **Missing key:** expose only `TYPESAFE_API_KEY` to the host process and restart the app.
- **UNKNOWN:** clarify scope or requirements; do not force a worker selection.
- **Permission denied:** obtain normal host approval; do not rewrite commands to evade it.
- **Model unavailable:** check host version, account access and supported IDs. Report the limitation.
- **Claude forced model:** host policy or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` can override profiles; report the actual model when known.
- **Existing installation:** installer refuses collisions. Review files before choosing an upgrade strategy.

## Companion skills and references

The official `typesafe-ai` skill teaches application design with TypeSafe. LanePilot guides worker selection. They can coexist; do not duplicate an API request because both are loaded. The official skill is optional and not bundled.

[TypeSafe API](https://docs.typesafe.ai/api) · [Official skill](https://github.com/typesafe-ai/skills) · [Community design guidance](https://github.com/aaddrick/building-with-typesafe-jev) · [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) · [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)

Not affiliated with or endorsed by TypeSafe, OpenAI or Anthropic. Product names identify compatible services only.
