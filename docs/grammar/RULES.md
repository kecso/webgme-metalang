# MetaLang edit rules

Each rule: **statement form** → **descriptor effect** → **JSON Patch** (see [`../descriptor/RULES.md`](../descriptor/RULES.md)).

## add-domain

Declares the studio/seed namespace for documentation; does not appear in MetaDescriptor JSON.

```metalang
domain StaMS.StateMachine
```

## add-concept

Bare concept (extends FCO — **do not** write `extends FCO`):

```metalang
concept Event;
```

```json
{ "op": "add", "path": "/concepts/Event", "value": {} }
```

With inheritance (base ≠ FCO — **required** in MetaLang when rendering):

```metalang
concept Pin extends PortBase;
concept InitialState extends State;
```

```json
[
  { "op": "add", "path": "/concepts/Pin", "value": { "extends": "PortBase" } },
  { "op": "add", "path": "/concepts/InitialState", "value": { "extends": "State" } }
]
```

**Source of truth:** `core.getBase(metaNode)`; emit `extends` only when base name ≠ `FCO`.

## set-base / change-inheritance

```metalang
concept Resistor extends ComponentBase;
```

```json
{ "op": "add", "path": "/concepts/Resistor", "value": { "extends": "ComponentBase" } }
```

Or replace on existing concept:

```json
{ "op": "replace", "path": "/concepts/Resistor/extends", "value": "ComponentBase" }
```

## add-attribute

```metalang
concept State {
  isInitial: bool;
  isFinal: bool;
}
```

```json
[
  { "op": "add", "path": "/concepts/State/attributes/isInitial", "value": "bool" },
  { "op": "add", "path": "/concepts/State/attributes/isFinal", "value": "bool" }
]
```

## add-pointer

Pointers name allowed target type(s). **No cardinality** in MetaLang. IR pointer global is **`1..1`**, per-target **`min: -1`, `max: 1`** (core + StaMS seeds); translators emit type names only.

```metalang
concept State {
  entry -> Action;
  run -> Action;
  exit -> Action;
}

concept Transition {
  src -> State;
  dst -> State;
  event -> Event;
  guard -> Guard;
  action -> Action;
}

concept RealValueFlow extends ConnectionBase {
  src -> RealOutput;
  dst -> RealInput | RealVectorInput;
}
```

Maps to `concepts.*.pointers` (type string or string array). No separate connection type — see [`../CONNECTIONS.md`](../CONNECTIONS.md).

## add-containment

Optional **global** total-child limit — brackets on `contains`:

```metalang
concept Machine {
  contains[0..100] State*, Event*, Guard*, Action*, Constraint*, Port:2..5;
  description: string;
}
```

Per-type only (no global cap):

```metalang
concept Machine {
  contains State*, Event*, Guard*, Action*, Constraint*;
}
```

```json
{
  "op": "add",
  "path": "/concepts/Machine",
  "value": {
    "contains": {
      "global": "0..100",
      "members": {
        "State": "*",
        "Event": "*",
        "Guard": "*",
        "Action": "*",
        "Constraint": "*",
        "Port": "2..5"
      }
    },
    "attributes": { "description": "string" }
  }
}
```

Per-type patch on flat map:

```json
{ "op": "add", "path": "/concepts/Machine/contains/Port", "value": "2..5" }
```

Any non-negative `min..max` with `min ≤ max` is valid. See [`../CARDINALITY.md`](../CARDINALITY.md).

## add-set

Per-member cardinality; optional **global** limit — brackets on set name:

```metalang
concept Component {
  set ports[0..8] -> Pin*, HeatPort:1, FlowPort:0..2;
}
```

Flat map (no global):

```metalang
concept Component {
  set ports -> Pin*, HeatPort:1;
}
```

```json
{
  "op": "add",
  "path": "/concepts/Component/sets/ports",
  "value": {
    "global": "0..8",
    "members": { "Pin": "*", "HeatPort": "1", "FlowPort": "0..2" }
  }
}
```

## Transition example (pointers only)

```metalang
concept Transition {
  src -> State;
  dst -> State;
  event -> Event;
  guard -> Guard;
  action -> Action;
}
```

```json
[
  { "op": "add", "path": "/concepts/Transition", "value": {} },
  { "op": "add", "path": "/concepts/Transition/pointers/src", "value": "State" },
  { "op": "add", "path": "/concepts/Transition/pointers/dst", "value": "State" },
  { "op": "add", "path": "/concepts/Transition/pointers/event", "value": "Event" },
  { "op": "add", "path": "/concepts/Transition/pointers/guard", "value": "Guard" },
  { "op": "add", "path": "/concepts/Transition/pointers/action", "value": "Action" }
]
```

Multi-target `dst` (Modelica `RealValueFlow`):

```metalang
concept RealValueFlow extends ConnectionBase {
  src -> RealOutput;
  dst -> RealInput | RealVectorInput;
}
```

```json
{
  "op": "add",
  "path": "/concepts/RealValueFlow/pointers/dst",
  "value": ["RealInput", "RealVectorInput"]
}
```

## remove-* / replace-*

Parser/editor emits the inverse JSON Patch operations (`remove`, `replace`) per [`../descriptor/RULES.md`](../descriptor/RULES.md).

## Future rules (not in v0 grammar)

| Rule | WebGME feature |
|------|----------------|
| `add-mixin` | Mixins (multiple inheritance beyond primary `extends` / `getBase`) |
| `add-constraint` | Meta constraints |
| `add-aspect` | Aspects |
| `add-sheet` | Meta aspect sheets |

These will extend grammar + RULES while IR remains the lossless fallback.
