# webgme-metalang

Textual **MetaLang** for WebGME metamodels: parse ↔ MetaDescriptor, canonical emit, and (planned) language-server / editor tooling.

Used by [`webgme-domain-tools`](https://github.com/kecso/webgme-domain-tools) (`webdot`) and available for other CLIs, CI, and editors that want a git-friendly metamodel surface.

## Install

```bash
npm install webgme-metalang
# or until first npm release:
npm install github:kecso/webgme-metalang
```

## Library API

```js
import {
  parseMetalang,
  parseMetalangFile,
  descriptorToMetalang,
} from "webgme-metalang";

const parsed = parseMetalang(`
domain SharedMeta
concept State { isInitial: bool; }

domain Host
library SharedMeta
concept Machine { contains SharedMeta.State*; }
`);

console.log(parsed.domain);           // Host (last domain)
console.log(parsed.libraries);        // ["SharedMeta"]
console.log(parsed.ignoredDomains); // []
console.log(descriptorToMetalang(parsed.descriptor, parsed.domain));
```

**Host rule:** the last `domain` in a file is the host. Domains not attached via `library` are listed in `ignoredDomains` and omitted from the flattened descriptor.

## Docs

| Path | Purpose |
|------|---------|
| [`docs/PROJECT.md`](docs/PROJECT.md) | Milestones: core lib → npm → Langium/LSP → VS Code → other editors |
| [`docs/grammar/`](docs/grammar/) | EBNF, RULES, language notes |
| [`docs/examples/`](docs/examples/) | Sample `.metalang` files |
| [`docs/CARDINALITY.md`](docs/CARDINALITY.md) | Cardinality tokens |

## Scripts

```bash
npm test          # build + c8 coverage
npm run build
```

## Scope (this repo)

| In scope | Out of scope (for now) |
|----------|------------------------|
| Grammar, parse, emit, MetaDescriptor types | WebGME `.webgmex` I/O |
| Future Langium LSP + VS Code extension | `ImportMetaLang` / other webdot plugins (may move later) |
| npm + VS Code packaging automation | Browser GUI |

WebGME attach / import stays in **webdot** until plugins are deliberately relocated here.
