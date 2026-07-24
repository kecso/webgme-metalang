# MetaLang

Human-readable metamodel surface syntax. **Target semantics:** MetaDescriptor v1 (same as compact JSON). Not a second canonical model.

## Specification

| Artifact | Purpose |
|----------|---------|
| [`grammar.ebnf`](grammar.ebnf) | Concrete syntax (EBNF). Langium/TextMate can derive from this later. |
| [`RULES.md`](RULES.md) | Statement-level edit rules ↔ descriptor patches |

## Design principles

1. **Concise** — omit FCO/META system nodes; `name` attribute is implicit on all concepts.
2. **Inheritance explicit** — primary base via `extends` when ≠ FCO; **mixins** exist in WebGME but are not in MetaLang v0 yet (IR keeps them).
3. **Pointer-first** — all references in `concepts.*.pointers`; no connection/relationship layer in descriptor JSON.
4. **Readable** — `contains[0..10] Child*`; `set ports[1..10] -> Pin*`; `dst -> A | B`.
5. **Rules separate from grammar** — grammar defines parsing; RULES define meaning and mapping to JSON Patch / descriptor ops.

## Inheritance (`extends` + mixins)

WebGME meta supports **both**:

| Mechanism | Engine | In MetaLang / descriptor v1? |
|-----------|--------|------------------------------|
| **Primary base** | `core.getBase` (one parent) | Yes — `extends Base` when base ≠ `FCO` |
| **Mixins** | mixin targets on the meta node (additional bases → multiple inheritance) | **Not yet** — retained in IR; lossy in descriptor/MetaLang (future `add-mixin` in [`RULES.md`](RULES.md)) |

Primary base maps as:

| Base (from `getBase`) | MetaLang | Descriptor `extends` |
|-----------------------|----------|----------------------|
| FCO | `concept Foo;` or `concept Foo { … }` | omitted |
| Any other concept | `concept Pin extends PortBase;` | `"extends": "PortBase"` |

**Renderer rule (F16c):** `irToDescriptor` / `descriptorToMetalang` use `core.getBase`; emit `extends` only when base name ≠ `FCO`. Never print `extends FCO`. Mixins are not emitted.

**Parser rule:** `concept X;` with no `extends` ⇒ base FCO. `concept X extends Y` ⇒ descriptor `concepts.X.extends = "Y"`. Mixin authoring waits on a later MetaLang revision once the descriptor carries them.

## Pointers vs connections

See [`../CONNECTIONS.md`](../CONNECTIONS.md). MetaLang does **not** use `connect` as canonical syntax. List pointers by name:

```metalang
concept ElectricalConnection extends ConnectionBase {
  src -> Pin;
  dst -> Pin;
}
```

Descriptor JSON lists the same pointers — no separate connection block. Domain tools decide edge rendering ([`../CONNECTIONS.md`](../CONNECTIONS.md)).

## Planned tooling

| Stage | Approach |
|-------|----------|
| Now | Hand-rolled `metalang → descriptor` parser (`src/meta/metalang-to-descriptor.ts`); canonical emit uses `library` blocks |
| Now | `ImportMetaLang` plugin / `importMetaLangToWebgmex` — create-only `.webgmex` (GUI-like `addLibrary` for libraries) |
| Extract (F44) | Langium grammar + LSP in `webgme-metalang` package |

## Libraries in MetaLang

A file may define **multiple domains**. Each domain is a closed scope (bare concept names only). Domains do **not** cross-reference until one attaches another as a library.

**Host rule:** the **last** `domain` in the file is the host. Import / materialize uses only that domain plus domains it attaches with `library`. Any other domains in the file (or pulled in via `import`) are **ignored**.

```metalang
domain UnusedScratch
concept Scratch;                 // ignored — not attached by Host

domain SharedMeta

concept State {
  isInitial: bool;
}

concept Machine {
  contains State*;            // bare — same domain
}

domain Host                   // last domain = host

library SharedMeta            // optional: `as Alias` (default namespace = domain name)
# or: library SharedMeta from "./shared-meta.metalang"
# or: import SharedMeta from "./shared-meta.metalang"  then  library SharedMeta

concept App {
  contains SharedMeta.State*; // FQN — only after library attach
}
```

| Form | Meaning |
|------|---------|
| `library Dom` | Attach domain `Dom` as library namespace `Dom` |
| `library Dom as Alias` | Attach with namespace `Alias` |
| `import Dom from "…"` | Load domains from another `.metalang` |
| `library Dom from "…" [as Alias]` | Sugar: import + attach |

**Canonical emit** for a host+lib seed: library domains first (`domain Lib` + bare concepts), then host `domain` + `library Lib` directives + host concepts (FQNs to libs).

Descriptor JSON stays flat FQNs (`SharedMeta.State`).

## Examples

- [`../examples/state-machine.metalang`](../examples/state-machine.metalang) — StaMS (all concepts extend FCO — no `extends` lines)
- [`../examples/modelica-base.metalang`](../examples/modelica-base.metalang) — DSS core with `extends PortBase` / `extends ConnectionBase`
- [`../examples/modelica-domain.metalang`](../examples/modelica-domain.metalang) — full library pattern (`extends ComponentBase`)
