import type { ConceptBody, MetaDescriptor } from "./types.js";
/** One domain scope: bare concept names only; libraries attached via `library` directives. */
export interface MetalangDomain {
    name: string;
    concepts: Record<string, ConceptBody>;
    /** Attached libraries: source domain name → namespace used in FQNs. */
    libraries: Array<{
        domain: string;
        as: string;
    }>;
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
export declare class MetalangParseError extends Error {
    readonly line: number;
    readonly column: number;
    constructor(message: string, line: number, column: number);
}
/** Strip `Lib.` prefix from type refs that point at the same library (for in-domain emit). */
export declare function bareInDomainRefs(body: ConceptBody, library: string): ConceptBody;
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
export declare function parseMetalang(source: string, options?: ParseMetalangOptions): MetalangParseResult;
export declare function parseMetalangFile(filePath: string): MetalangParseResult;
//# sourceMappingURL=metalang-to-descriptor.d.ts.map