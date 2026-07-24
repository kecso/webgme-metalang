# Cardinality

WebGME relational meta rules — **containment**, **set membership**, and (structurally) **pointers** — use a **two-level** limit model. **`-1` in IR means “no bound”** (unset).

Verified in [`webgme-engine` `metacore.js`](https://github.com/webgme/webgme-engine/blob/v2.32.0/src/common/core/metacore.js): `getJsonMeta` reads global `min`/`max` and per-type `minItems`/`maxItems` from the same meta-node attributes.

## Two levels: global and per-type

| Level | Core API | Meaning |
|-------|----------|---------|
| **Global** | `set_children_meta_limits`, `set_pointer_meta_limits` | Total count across **all** types in that rule |
| **Per-type** | `set_child_meta`, `set_pointer_meta_target` | Count for **each** allowed child/member/target type |

When reading or writing meta, apply **both** levels.

### Sentinel: `-1`

At any level in IR, **`-1`** (or omitted attribute) means no rule at that bound. Per-type defaults from `set_child_meta` / `set_pointer_meta_target` use `-1` when not specified.

## IR (`getJsonMeta`) shape

| Rule | Global in IR | Per-type in IR |
|------|--------------|----------------|
| `meta.children` | `min`, `max` (omitted when unset) | `items[]`, `minItems[]`, `maxItems[]` |
| `meta.pointers.{name}` | `min`, `max` | `items[]`, `minItems[]`, `maxItems[]` |

Sets are stored under `meta.pointers` in IR; core treats `max === 1` as a pointer, otherwise a set ([`metarules.js` `filterPointerRules`](https://github.com/webgme/webgme-engine/blob/v2.32.0/src/common/core/users/metarules.js)).

### Pointer global limits (structural)

StaMS `Transition.src` (actual seed):

```json
"src": {
  "min": 1,
  "max": 1,
  "items": ["/G/z"],
  "minItems": [-1],
  "maxItems": [1]
}
```

Core [`getPointerMeta` example](https://github.com/webgme/webgme-engine/blob/v2.32.0/src/common/core/core.js): global **`min: 1`, `max: 1`**; per-target **`min: -1`, `max: 1`**. Global `max: 1` is what distinguishes a pointer from a set. Pointers are **not** surfaced in descriptor/MetaLang cardinality; rebuild with `setPointerMetaLimits(…, 1, 1)` and per-target `-1`/`1` defaults.

### Containment example

StaMS `Machine` (no global cap set — `min`/`max` absent):

```json
"children": {
  "items": ["/G/g", "/G/z", "/G/v", "/G/p", "/G/W"],
  "minItems": [-1, -1, -1, -1, -1],
  "maxItems": [-1, -1, -1, -1, -1]
}
```

## Descriptor / MetaLang — global + per-type (contains / sets)

**Domain cardinality** for containment and sets is modeled at **both** levels in descriptor v1 and MetaLang v0.

### Containment

```metalang
contains[0..100] State*, Event*, Guard*, Action*, Constraint*;
```

```json
"contains": {
  "global": "0..100",
  "members": {
    "State": "*",
    "Event": "*",
    "Guard": "*",
    "Action": "*",
    "Constraint": "*"
  }
}
```

Flat map when no global cap (same as MetaLang `contains State*, …`):

```json
"contains": { "State": "*", "Event": "*" }
```

### Sets

Flat member map when no global limit:

```json
"sets": { "ports": { "Pin": "*", "HeatPort": "1" } }
```

With global limit:

```metalang
set ports[0..8] -> Pin*, HeatPort:1, FlowPort:0..2;
```

```json
"sets": {
  "ports": {
    "global": "0..8",
    "members": { "Pin": "*", "HeatPort": "1", "FlowPort": "0..2" }
  }
}
```

### Per-type only (unchanged)

```metalang
contains State*, Port:2..5, Label:0..1;
set ports -> Pin*, HeatPort:1;
```

## String form

| String | Core (per bound) |
|--------|------------------|
| `0..1` | min=0, max=1 |
| `2..5` | min=2, max=5 |
| `3` | min=max=3 |
| `*` | min=0, max=-1 |
| `+` | min=1, max=-1 |
| `?` | min=0, max=1 |

IR → string: map **`-1`** to unbounded at that bound, then mcp-style `cardinalityFromParsed`.

## Translator checklist (F16b+)

| IR field | Descriptor / MetaLang |
|----------|------------------------|
| `children.min/max` | `contains.global` (omit if unset) |
| `children.minItems[i]` / `maxItems[i]` | `contains` flat map or `contains.members` |
| `pointers.{set}.min/max` (set, max≠1) | `sets.{name}.global` |
| `pointers.{set}.minItems/maxItems` | `sets.{name}` flat map or `.members` |
| `pointers.{ptr}` (max=1) | target types only; rebuild global `1..1` |

Details: [`ir/README.md`](ir/README.md).
