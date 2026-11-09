# Validation scope

Commands and results for the initial public package are recorded after local execution. Checks cover skill metadata, Python/shell syntax, JSON assets, tenant identifier scan, environment detection, and the included SVG fixture's local check/conversion/render. They do not certify every legacy chart type or actual cloud edit/export. Use references/feishu-operations.md in a user-authorized task to finish that check.

## Initial public package — 2026-11-02

- Skill validator: passed. Python AST, shell syntax and bundled JSON: passed.
- Read-only online preflight: passed on Node 25.2.1, Python 3.14.7, lark-cli 1.0.85, whiteboard-cli 0.2.13. This records one host, not all OS combinations.
- Generic quickstart SVG: 14 nodes, 2 connectors; static errors=0, warnings=0. OpenAPI conversion and PNG render succeeded; image reviewed for Chinese text, card boundaries and arrows.
- Tenant URL/identifier and author machine path scan: no private source locators in published files. Raw boards, tenant previews and fetch scripts excluded.
- Cloud writes and actual Feishu image round trip: not run as part of package validation. Current user task publishes a skill, not a new test document.

- Remote installation: `npx skills add https://github.com/chengjialu8888/design_lark_chart --skill design-lark-chart --agent codex --copy -y` completed successfully in an isolated temporary project; installed-copy local preflight passed. No existing user skill installation was overwritten.

## Dense visual preset — 2026-11-09

- Added `mck-dense-consulting` as an opt-in visual preset; linked `mck-ppt-design` as the content-framework layer. No Mck engine code is bundled and no executable rendering logic changed.
- Verified the six exact colors are readable by both the existing style-seed loader and `plan.style_budget` color loader, with no fallback notes.
- Verified the original supplied prompt is preserved exactly, relative Markdown links resolve, JSON assets parse, and `git diff --check` passes.
- Reviewed changed public files for private tenant URLs, local user paths, transient login parameters and private document identifiers; none included.
- No cloud write, new rendered example, font verification or visual round trip was performed for this documentation/preset update. Per-artifact checks remain required when the preset is used.
