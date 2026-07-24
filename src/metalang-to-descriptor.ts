import fs from "node:fs";
import path from "node:path";
import { parseCardinalityToken } from "./cardinality.js";
import type {
  AttributeDef,
  ConceptBody,
  MemberRule,
  MetaDescriptor,
  TypeRef,
} from "./types.js";
import { isStructuredMemberRule } from "./types.js";

/** One domain scope: bare concept names only; libraries attached via `library` directives. */
export interface MetalangDomain {
  name: string;
  concepts: Record<string, ConceptBody>;
  /** Attached libraries: source domain name → namespace used in FQNs. */
  libraries: Array<{ domain: string; as: string }>;
}

export interface MetalangParseResult {
  /** Host / primary domain — always the **last** `domain` in the document. */
  domain: string;
  /** All domains parsed (including unused). Import/materialize only uses {@link domain} + its libraries. */
  domains: Record<string, MetalangDomain>;
  /** Flat MetaDescriptor for the primary domain + libraries it attaches (FQN keys). */
  descriptor: MetaDescriptor;
  /** Namespace names attached to the primary domain (sorted). */
  libraries: string[];
  /**
   * Domains present in the file (or pulled in via import) but **not** attached by the
   * primary domain's `library` directives — ignored by ImportMetaLang / flatten.
   */
  ignoredDomains: string[];
}

export class MetalangParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
  ) {
    super(message + " at " + line + ":" + column);
    this.name = "MetalangParseError";
  }
}

class Scanner {
  readonly source: string;
  i = 0;
  line = 1;
  column = 1;

  constructor(source: string) {
    this.source = source.replace(/^\uFEFF/, "");
  }

  peek(): string {
    return this.source[this.i] ?? "";
  }

  eof(): boolean {
    return this.i >= this.source.length;
  }

  advance(): string {
    const ch = this.source[this.i++] ?? "";
    if (ch === "\n") {
      this.line += 1;
      this.column = 1;
    } else if (ch !== "") {
      this.column += 1;
    }
    return ch;
  }

  match(expected: string): boolean {
    if (this.source.startsWith(expected, this.i)) {
      for (let n = 0; n < expected.length; n++) this.advance();
      return true;
    }
    return false;
  }

  skipTrivia(): void {
    for (;;) {
      while (!this.eof() && /[ \t\r\n]/.test(this.peek())) this.advance();
      if (this.match("//")) {
        while (!this.eof() && this.peek() !== "\n") this.advance();
        continue;
      }
      if (this.match("/*")) {
        while (!this.eof() && !this.match("*/")) this.advance();
        continue;
      }
      break;
    }
  }

  expect(ch: string): void {
    this.skipTrivia();
    if (!this.match(ch)) {
      throw new MetalangParseError('Expected "' + ch + '"', this.line, this.column);
    }
  }

  readIdentifier(): string {
    this.skipTrivia();
    if (!/[A-Za-z]/.test(this.peek())) {
      throw new MetalangParseError("Expected identifier", this.line, this.column);
    }
    let out = this.advance();
    while (/[A-Za-z0-9_]/.test(this.peek())) out += this.advance();
    return out;
  }

  readQualifiedName(): string {
    let name = this.readIdentifier();
    this.skipTrivia();
    while (this.peek() === ".") {
      this.advance();
      name += "." + this.readIdentifier();
      this.skipTrivia();
    }
    return name;
  }

  readString(): string {
    this.skipTrivia();
    if (this.peek() !== '"') {
      throw new MetalangParseError("Expected string literal", this.line, this.column);
    }
    this.advance();
    let out = "";
    while (!this.eof() && this.peek() !== '"') {
      const ch = this.advance();
      if (ch === "\\" && !this.eof()) out += this.advance();
      else out += ch;
    }
    if (this.peek() !== '"') {
      throw new MetalangParseError("Unterminated string", this.line, this.column);
    }
    this.advance();
    return out;
  }

  tryKeyword(word: string): boolean {
    this.skipTrivia();
    const start = this.i;
    const line = this.line;
    const column = this.column;
    if (!this.match(word)) return false;
    const next = this.peek();
    if (/[A-Za-z0-9_]/.test(next)) {
      this.i = start;
      this.line = line;
      this.column = column;
      return false;
    }
    return true;
  }
}

function qualifyRef(ref: string, library: string | null, localNames: Set<string>): string {
  if (ref.includes(".")) return ref;
  if (library && localNames.has(ref)) return library + "." + ref;
  return ref;
}

function qualifyTypeRef(
  ref: TypeRef,
  library: string | null,
  localNames: Set<string>,
): TypeRef {
  if (typeof ref === "string") return qualifyRef(ref, library, localNames);
  return ref.map((r) => qualifyRef(r, library, localNames));
}

function qualifyMemberRule(
  rule: MemberRule,
  library: string | null,
  localNames: Set<string>,
): MemberRule {
  const qualifyMap = (members: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [typeName, card] of Object.entries(members)) {
      out[qualifyRef(typeName, library, localNames)] = card;
    }
    return out;
  };
  if (isStructuredMemberRule(rule)) {
    return {
      ...(rule.global ? { global: rule.global } : {}),
      members: qualifyMap(rule.members),
    };
  }
  return qualifyMap(rule);
}

function qualifyConceptBody(
  body: ConceptBody,
  library: string | null,
  localNames: Set<string>,
): ConceptBody {
  const next: ConceptBody = { ...body };
  if (next.extends) next.extends = qualifyRef(next.extends, library, localNames);
  if (next.pointers) {
    const pointers: Record<string, TypeRef> = {};
    for (const [name, target] of Object.entries(next.pointers)) {
      pointers[name] = qualifyTypeRef(target, library, localNames);
    }
    next.pointers = pointers;
  }
  if (next.contains) next.contains = qualifyMemberRule(next.contains, library, localNames);
  if (next.sets) {
    const sets: Record<string, MemberRule> = {};
    for (const [name, rule] of Object.entries(next.sets)) {
      sets[name] = qualifyMemberRule(rule, library, localNames);
    }
    next.sets = sets;
  }
  return next;
}

/** Strip `Lib.` prefix from type refs that point at the same library (for in-domain emit). */
export function bareInDomainRefs(body: ConceptBody, library: string): ConceptBody {
  const prefix = library + ".";
  const strip = (ref: string) => (ref.startsWith(prefix) ? ref.slice(prefix.length) : ref);
  const stripRef = (ref: TypeRef): TypeRef =>
    typeof ref === "string" ? strip(ref) : ref.map(strip);
  const stripRule = (rule: MemberRule): MemberRule => {
    const members = isStructuredMemberRule(rule) ? rule.members : rule;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(members)) next[strip(k)] = v;
    if (isStructuredMemberRule(rule)) {
      return rule.global ? { global: rule.global, members: next } : { members: next };
    }
    return next;
  };
  const out: ConceptBody = { ...body };
  if (out.extends) out.extends = strip(out.extends);
  if (out.pointers) {
    const pointers: Record<string, TypeRef> = {};
    for (const [k, v] of Object.entries(out.pointers)) pointers[k] = stripRef(v);
    out.pointers = pointers;
  }
  if (out.contains) out.contains = stripRule(out.contains);
  if (out.sets) {
    const sets: Record<string, MemberRule> = {};
    for (const [k, v] of Object.entries(out.sets)) sets[k] = stripRule(v);
    out.sets = sets;
  }
  return out;
}

function parseAttributeType(sc: Scanner): AttributeDef {
  sc.skipTrivia();
  if (sc.tryKeyword("enum")) {
    sc.expect("[");
    const values: string[] = [];
    for (;;) {
      sc.skipTrivia();
      if (sc.peek() === '"') values.push(sc.readString());
      else values.push(sc.readIdentifier());
      sc.skipTrivia();
      if (sc.peek() === "]") break;
      sc.expect(",");
    }
    sc.expect("]");
    return { type: "enum", values };
  }
  const typeName = sc.readIdentifier();
  const allowed = ["string", "bool", "float", "integer", "asset"];
  if (!allowed.includes(typeName)) {
    throw new MetalangParseError(
      'Unknown attribute type "' + typeName + '"',
      sc.line,
      sc.column,
    );
  }
  return typeName;
}

function parseMemberCardinality(sc: Scanner): string {
  sc.skipTrivia();
  if (sc.peek() === "*" || sc.peek() === "+" || sc.peek() === "?") {
    return parseCardinalityToken(sc.advance());
  }
  if (sc.peek() === ":") {
    sc.advance();
    sc.skipTrivia();
    let token = "";
    while (/[0-9.*]/.test(sc.peek())) token += sc.advance();
    return parseCardinalityToken(token);
  }
  return "*";
}

function parseGlobalCardSuffix(sc: Scanner): string | undefined {
  sc.skipTrivia();
  if (sc.peek() !== "[") return undefined;
  sc.advance();
  sc.skipTrivia();
  let token = "";
  while (!sc.eof() && sc.peek() !== "]") token += sc.advance();
  sc.expect("]");
  return parseCardinalityToken(token.trim());
}

function parseTypedMemberList(sc: Scanner): Record<string, string> {
  const members: Record<string, string> = {};
  for (;;) {
    const typeName = sc.readQualifiedName();
    const card = parseMemberCardinality(sc);
    members[typeName] = card;
    sc.skipTrivia();
    if (sc.peek() !== ",") break;
    sc.advance();
  }
  return members;
}

function parseTypeRefList(sc: Scanner): TypeRef {
  const parts = [sc.readQualifiedName()];
  sc.skipTrivia();
  while (sc.peek() === "|") {
    sc.advance();
    parts.push(sc.readQualifiedName());
    sc.skipTrivia();
  }
  return parts.length === 1 ? parts[0]! : parts;
}

function parseConceptBody(sc: Scanner): ConceptBody {
  const body: ConceptBody = {};
  sc.expect("{");
  for (;;) {
    sc.skipTrivia();
    if (sc.peek() === "}") {
      sc.advance();
      break;
    }
    if (sc.tryKeyword("contains")) {
      const global = parseGlobalCardSuffix(sc);
      const members = parseTypedMemberList(sc);
      sc.expect(";");
      body.contains = global ? { global, members } : members;
      continue;
    }
    if (sc.tryKeyword("set")) {
      const setName = sc.readIdentifier();
      const global = parseGlobalCardSuffix(sc);
      sc.expect("-");
      if (!sc.match(">")) {
        throw new MetalangParseError('Expected "->"', sc.line, sc.column);
      }
      const members = parseTypedMemberList(sc);
      sc.expect(";");
      if (!body.sets) body.sets = {};
      body.sets[setName] = global ? { global, members } : members;
      continue;
    }

    const name = sc.readIdentifier();
    sc.skipTrivia();
    if (sc.match("->")) {
      const target = parseTypeRefList(sc);
      sc.expect(";");
      if (!body.pointers) body.pointers = {};
      body.pointers[name] = target;
      continue;
    }
    sc.expect(":");
    const attr = parseAttributeType(sc);
    sc.expect(";");
    if (!body.attributes) body.attributes = {};
    body.attributes[name] = attr;
  }
  return body;
}

function ensureDomain(
  domains: Record<string, MetalangDomain>,
  name: string,
): MetalangDomain {
  if (!domains[name]) {
    domains[name] = { name, concepts: {}, libraries: [] };
  }
  return domains[name]!;
}

function loadImportedDomains(
  fromPath: string,
  baseDir: string,
  seen: Set<string>,
): Record<string, MetalangDomain> {
  const abs = path.resolve(baseDir, fromPath);
  if (seen.has(abs)) {
    throw new Error('Circular metalang import: "' + abs + '"');
  }
  seen.add(abs);
  if (!fs.existsSync(abs)) {
    throw new Error('Imported metalang not found: "' + abs + '"');
  }
  const source = fs.readFileSync(abs, "utf8");
  const nested = parseMetalang(source, { baseDir: path.dirname(abs), seenImports: seen });
  return nested.domains;
}

function flattenPrimaryDomain(
  domains: Record<string, MetalangDomain>,
  primaryName: string,
): { descriptor: MetaDescriptor; libraries: string[] } {
  const primary = domains[primaryName];
  if (!primary) {
    return { descriptor: { version: 1, concepts: {} }, libraries: [] };
  }

  const concepts: Record<string, ConceptBody> = {};
  const libNamespaces: string[] = [];

  for (const attach of primary.libraries) {
    const src = domains[attach.domain];
    if (!src) {
      throw new Error(
        'library "' +
          attach.domain +
          '" on domain "' +
          primaryName +
          '" — unknown domain (define it in this file or import it)',
      );
    }
    libNamespaces.push(attach.as);
    const localNames = new Set(Object.keys(src.concepts));
    for (const [bare, body] of Object.entries(src.concepts)) {
      const qName = attach.as + "." + bare;
      concepts[qName] = qualifyConceptBody(body, attach.as, localNames);
    }
  }

  for (const [bare, body] of Object.entries(primary.concepts)) {
    concepts[bare] = body;
  }

  return {
    descriptor: { version: 1, concepts },
    libraries: [...new Set(libNamespaces)].sort((a, b) => a.localeCompare(b)),
  };
}

export interface ParseMetalangOptions {
  /** Directory used to resolve `import` / `library … from` paths. */
  baseDir?: string;
  /** Internal: track import cycles. */
  seenImports?: Set<string>;
}

/**
 * Parse MetaLang into domains.
 *
 * **Host rule:** the last `domain` declaration is the host/primary domain.
 * Only that domain's concepts and the domains it attaches via `library` appear in
 * {@link MetalangParseResult.descriptor}. Other domains in the file (or loaded via
 * `import`) are kept on {@link MetalangParseResult.domains} but listed in
 * {@link MetalangParseResult.ignoredDomains} and ignored by ImportMetaLang.
 */
export function parseMetalang(
  source: string,
  options: ParseMetalangOptions = {},
): MetalangParseResult {
  const sc = new Scanner(source);
  const domains: Record<string, MetalangDomain> = {};
  let current: MetalangDomain | null = null;
  let primaryName = "Domain";
  const baseDir = options.baseDir ?? process.cwd();
  const seen = options.seenImports ?? new Set<string>();

  const requireCurrent = (): MetalangDomain => {
    if (!current) {
      // Implicit domain if concepts appear before any domain_decl.
      current = ensureDomain(domains, "Domain");
      primaryName = "Domain";
    }
    return current;
  };

  sc.skipTrivia();
  while (!sc.eof()) {
    if (sc.tryKeyword("domain")) {
      const name = sc.readQualifiedName();
      current = ensureDomain(domains, name);
      primaryName = name;
      sc.skipTrivia();
      continue;
    }

    if (sc.tryKeyword("import")) {
      const domainName = sc.readIdentifier();
      if (!sc.tryKeyword("from")) {
        throw new MetalangParseError('Expected "from"', sc.line, sc.column);
      }
      const fromPath = sc.readString();
      const loaded = loadImportedDomains(fromPath, baseDir, seen);
      if (!loaded[domainName]) {
        const available = Object.keys(loaded).sort().join(", ") || "<none>";
        throw new MetalangParseError(
          'import "' +
            domainName +
            '" — domain not found in "' +
            fromPath +
            '" (available: ' +
            available +
            ")",
          sc.line,
          sc.column,
        );
      }
      // Merge imported domains (do not overwrite same-file definitions).
      for (const [name, dom] of Object.entries(loaded)) {
        if (!domains[name]) domains[name] = dom;
      }
      sc.skipTrivia();
      continue;
    }

    if (sc.tryKeyword("library")) {
      const dom = requireCurrent();
      const domainName = sc.readIdentifier();
      let fromPath: string | undefined;
      let asName = domainName;
      sc.skipTrivia();
      if (sc.tryKeyword("from")) {
        fromPath = sc.readString();
      }
      if (sc.tryKeyword("as")) {
        asName = sc.readIdentifier();
      }
      if (fromPath) {
        const loaded = loadImportedDomains(fromPath, baseDir, seen);
        if (!loaded[domainName]) {
          throw new MetalangParseError(
            'library from "' + fromPath + '" — missing domain "' + domainName + '"',
            sc.line,
            sc.column,
          );
        }
        for (const [name, d] of Object.entries(loaded)) {
          if (!domains[name]) domains[name] = d;
        }
      }
      if (dom.libraries.some((l) => l.as === asName)) {
        throw new MetalangParseError(
          'Duplicate library namespace "' + asName + '" on domain "' + dom.name + '"',
          sc.line,
          sc.column,
        );
      }
      dom.libraries.push({ domain: domainName, as: asName });
      sc.skipTrivia();
      continue;
    }

    if (sc.tryKeyword("concept")) {
      const dom = requireCurrent();
      const name = sc.readQualifiedName();
      if (name.includes(".")) {
        throw new MetalangParseError(
          'Concept names inside a domain must be bare (got "' +
            name +
            '"); use `library` to attach other domains',
          sc.line,
          sc.column,
        );
      }
      let extendsName: string | undefined;
      if (sc.tryKeyword("extends")) extendsName = sc.readQualifiedName();
      sc.skipTrivia();
      let body: ConceptBody;
      if (sc.peek() === "{") body = parseConceptBody(sc);
      else {
        sc.expect(";");
        body = {};
      }
      if (extendsName) body.extends = extendsName;
      if (dom.concepts[name]) {
        throw new MetalangParseError(
          'Duplicate concept "' + name + '" in domain "' + dom.name + '"',
          sc.line,
          sc.column,
        );
      }
      dom.concepts[name] = body;
      sc.skipTrivia();
      continue;
    }

    if (sc.eof()) break;
    throw new MetalangParseError(
      'Unexpected token near "' + sc.peek() + '"',
      sc.line,
      sc.column,
    );
  }

  if (!domains[primaryName]) {
    ensureDomain(domains, primaryName);
  }

  const flat = flattenPrimaryDomain(domains, primaryName);
  const used = new Set<string>([primaryName]);
  for (const attach of domains[primaryName]?.libraries ?? []) {
    used.add(attach.domain);
  }
  const ignoredDomains = Object.keys(domains)
    .filter((name) => !used.has(name))
    .sort((a, b) => a.localeCompare(b));

  return {
    domain: primaryName,
    domains,
    descriptor: flat.descriptor,
    libraries: flat.libraries,
    ignoredDomains,
  };
}

export function parseMetalangFile(filePath: string): MetalangParseResult {
  const abs = path.resolve(filePath);
  const source = fs.readFileSync(abs, "utf8");
  return parseMetalang(source, { baseDir: path.dirname(abs) });
}
