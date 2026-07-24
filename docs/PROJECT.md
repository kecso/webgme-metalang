# Project plan — webgme-metalang

Living tracker for this package. Companion to [`webgme-domain-tools`](https://github.com/kecso/webgme-domain-tools) Phase 9 **F44**.

## Goals

1. **Shared language core** — Same MetaLang grammar/semantics for `webdot` and any other tool that wants a textual WebGME metamodel (CI, generators, custom CLIs).
2. **Editor speed** — Language server features so authors can edit `.metalang` in VS Code (diagnostics, completion, navigation) without the GUI.
3. **Automated packaging** — Publish **npm** (`webgme-metalang`) and a **VS Code** extension (`.vsix` / Marketplace); research other LSP hosts later.
4. **Optional later** — Host WebGME-facing plugins here (e.g. ImportMetaLang) once the library boundary is stable. **Not** in the first cut.

## Current milestone

**M0 — Core library** — `in progress`

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| ML1 | MetaDescriptor types + member helpers | `done` | Extracted from webdot |
| ML2 | Cardinality helpers | `done` | Parse / format / min-max |
| ML3 | Hand-rolled parser (`metalang → descriptor`) | `done` | Multi-domain; host = last domain; unused ignored |
| ML4 | Canonical emit (`descriptor → metalang`) | `done` | `library` directives; bare in-domain refs |
| ML5 | Tests + c8 (node:test) | `done` | Same style as webdot |
| ML6 | CI on push/PR | `done` | GitHub Actions |
| ML7 | webdot depends on this package | `pending` | `github:kecso/webgme-metalang` then npm |

**Review gate:** `npm test` · examples under `docs/examples/` parse · webdot green after dependency swap.

---

## Roadmap

### M1 — npm publish

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| ML8 | Trusted Publishing / release workflow | `pending` | Mirror webdot `publish.yml` on GitHub Release |
| ML9 | Semver + changelog | `pending` | Align with webdot consumer bumps |
| ML10 | Document install for consumers | `pending` | README + webdot docs |

### M2 — Langium grammar

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| ML11 | Langium grammar from [`docs/grammar/grammar.ebnf`](grammar/grammar.ebnf) | `pending` | Keep hand-rolled parser until parity proven, or replace |
| ML12 | Generated AST ↔ MetaDescriptor bridge | `pending` | Single semantic model |

### M3 — Language server (F43)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| ML13 | Diagnostics (syntax + unknown refs / libraries) | `pending` | |
| ML14 | Completion (concepts, domains, `library` targets) | `pending` | Prefer inserting FQNs for attached libs |
| ML15 | Hover / go-to-definition / find refs | `pending` | Cross-file `import` |
| ML16 | Document symbols / outline | `pending` | Domains + concepts |

### M4 — VS Code extension

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| ML17 | Extension package (`vscode/` or monorepo workspace) | `pending` | TextMate/semantic tokens for `.metalang` |
| ML18 | Bundle / talk to LSP | `pending` | |
| ML19 | CI: build `.vsix` on release | `pending` | Optional Marketplace publish |
| ML20 | Research: Cursor / other VS Code forks | `pending` | Usually same `.vsix` |

### M5 — Other editor integrations (research)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| ML21 | Neovim / coc.nvim / lspconfig recipe | `pending` | Document stdio LSP start command |
| ML22 | JetBrains (LSP4IJ) | `pending` | Research only until demand |
| ML23 | Helix / Zed | `pending` | Research only |

### M6 — Plugins & WebGME I/O (optional)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| ML24 | Move ImportMetaLang (create-only) here | `deferred` | Needs `webgme-engine`; keep in webdot until packaging story clear |
| ML25 | Shared “apply descriptor” helpers | `deferred` | Only if multiple CLIs need them |

---

## Architecture

```
.metalang ──parse──► MetalangParseResult ──descriptor──► consumers (webdot, CI, …)
                ▲                              │
                │                              ▼
           Langium/LSP (M3)              descriptorToMetalang (canonical emit)
                │
           VS Code ext (M4)
```

- **No** `.webgmex` / session code in M0–M5.
- **webdot** keeps: IR↔descriptor (engine), apply-descriptor, ImportMetaLang plugin, library CLI.

## Packaging notes

| Artifact | Channel | Trigger (planned) |
|----------|---------|-------------------|
| `webgme-metalang` npm | npmjs.com | GitHub Release + OIDC Trusted Publishing |
| VS Code extension | Marketplace and/or `.vsix` asset | Same release or `vscode-v*` tag |
| LSP binary / node entry | shipped inside npm and/or extension | `webgme-metalang-ls` bin (TBD) |

## Backlog

| ID | Task | Priority |
|----|------|----------|
| B1 | Raise parser coverage (error paths, `set`, unions, enums) — needs fixtures; see webdot **B15** | medium |
| B2 | Dual-publish grammar docs only vs full package | low |
| B3 | Monorepo (`packages/core`, `packages/lsp`, `packages/vscode`) if tree grows | medium |

---

## Review log

| Date | Milestone | Outcome | Notes |
|------|-----------|---------|-------|
| 2026-07-24 | M0 scaffold | started | Extracted from webdot Phase 9; empty repo seeded |
