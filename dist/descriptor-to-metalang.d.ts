import type { MetaDescriptor } from "./types.js";
/**
 * Canonical MetaLang emit: each library is its own `domain` (bare names inside),
 * then the host `domain` with `library Lib` directives and host concepts (FQN to libs).
 */
export declare function descriptorToMetalang(descriptor: MetaDescriptor, domain: string): string;
//# sourceMappingURL=descriptor-to-metalang.d.ts.map