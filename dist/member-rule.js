import { isStructuredMemberRule } from "./types.js";
export function getMemberMap(rule) {
    return isStructuredMemberRule(rule) ? rule.members : rule;
}
export function getMemberGlobal(rule) {
    return isStructuredMemberRule(rule) ? rule.global : undefined;
}
//# sourceMappingURL=member-rule.js.map