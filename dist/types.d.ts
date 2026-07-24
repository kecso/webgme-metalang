export type CardinalityString = string;
export type TypeRef = string | string[];
export interface AttributeMeta {
    type: string;
    hidden?: boolean;
    readOnly?: boolean;
    values?: string[];
    min?: number;
    max?: number;
    default?: unknown;
}
export type AttributeDef = string | AttributeMeta;
export type MembersMap = Record<string, CardinalityString>;
export type MemberRule = MembersMap | {
    global?: CardinalityString;
    members: MembersMap;
};
export interface ConceptBody {
    extends?: string;
    contains?: MemberRule;
    pointers?: Record<string, TypeRef>;
    sets?: Record<string, MemberRule>;
    attributes?: Record<string, AttributeDef>;
}
export interface MetaDescriptor {
    version: 1;
    concepts: Record<string, ConceptBody>;
}
export declare function isStructuredMemberRule(rule: MemberRule): rule is {
    global?: CardinalityString;
    members: MembersMap;
};
//# sourceMappingURL=types.d.ts.map