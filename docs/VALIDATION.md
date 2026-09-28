# Validation and evidence

## Historical local implementation

Before packaging, local Codex and Claude Code integrations each completed a real Jev call followed by worker dispatch. Codex used Luna Low; Claude used Haiku. This does not prove every configured model is available on every account.

A one-shot Codex routing evaluation used ten synthetic task descriptions and acceptable lanes assigned before calls:

| Task | Observed lane | Source |
| --- | --- | --- |
| Comment correction | Luna Low | Jev |
| Exact HUD label change | Luna Low | Jev |
| Pagination boundary bug | Luna Medium | Jev |
| Bounded localization extension | Luna Medium | Jev |
| Intermittent asynchronous save bug | Luna High | Jev |
| Bug with no reproduction/context | UNKNOWN | Jev |
| Missing integration specification | UNKNOWN | Jev |
| Authentication flaw with risk flag | Sol High | Local policy |
| Unresolved architecture with flag | Sol High | Local policy |
| Two failed attempts | Sol High | Local policy |

Seven Jev choices matched the predefined acceptable sets; three policy cases matched fixed rules. Tiny cases deliberately exercised the router although the normal workflow skips them. Labels were authored by the same assistant that prepared the integration. There were no independent experts, repetitions, blind evaluation or execution/cost comparison. No accuracy or savings claim should be extrapolated from this sample.

## Portable package

Run `node --test tests/*.test.mjs` for offline checks. Tests do not require a real key or contact TypeSafe. Installation tests use temporary destinations and leave active host configuration alone.

The delivery review includes code inspection, offline tests, instruction/profile validation, SVG inspection and a file-by-file release scan. Its exact inventory and results are provided separately with the private review bundle. Fresh end-to-end dispatch of this portable package in both hosts and testing on Linux/macOS remain unverified unless separately recorded.
