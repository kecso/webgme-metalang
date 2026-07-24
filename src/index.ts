export type {
  AttributeDef,
  AttributeMeta,
  CardinalityString,
  ConceptBody,
  MemberRule,
  MembersMap,
  MetaDescriptor,
  TypeRef,
} from "./types.js";
export { isStructuredMemberRule } from "./types.js";

export {
  cardinalityFromMinMax,
  cardinalityToMinMax,
  formatGlobalCardinality,
  formatMemberCardinality,
  parseCardinalityToken,
} from "./cardinality.js";

export { getMemberGlobal, getMemberMap } from "./member-rule.js";

export {
  MetalangParseError,
  bareInDomainRefs,
  parseMetalang,
  parseMetalangFile,
} from "./metalang-to-descriptor.js";
export type {
  MetalangDomain,
  MetalangParseResult,
  ParseMetalangOptions,
} from "./metalang-to-descriptor.js";

export { descriptorToMetalang } from "./descriptor-to-metalang.js";
