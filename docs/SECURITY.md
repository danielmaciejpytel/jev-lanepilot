# Security and data flow

## What leaves the machine

Only caller-supplied task context, question criteria and the requested Jev model are sent to `https://api.typesafe.ai/v1/systemone`. The environment key is used in the Authorization header. Local policy decisions need no API request. The router does not need an OpenAI or Anthropic key; the host authenticates its own workers.

The integration does not crawl repositories or conversations. The host selects context, so the caller must remove secrets and unnecessary personal data. A guard against the configured TypeSafe key is not a universal secret detector. Source code may be confidential even without credentials.

## Boundaries

- Credentials come from the process environment; no credential files are loaded.
- Fixed HTTPS endpoint; redirects are rejected.
- Errors use fixed messages/codes rather than raw exceptions or provider response bodies.
- UNKNOWN is not permission to act. Policy flags are explicit inputs, not automatic threat detection.
- Host permissions and project instructions remain in force. Jev cannot authorize publishing, commits, pushes or destructive actions.
- No telemetry or automatic background hook is included. Hosts and API providers may have their own logs and retention policies.
- Tests use synthetic data and mocked network calls by default.

## Before sharing a fork

Inspect tracked/untracked files, staged content and Git history. Exclude credentials, `.env`, transcripts, raw logs, local settings and user paths. Use a secret scanner and review findings manually. A clean scan reduces risk; it cannot prove absence of every possible secret.

If a key is exposed, revoke or rotate it through its provider. Deleting the visible file alone does not remove history or copies already fetched.
