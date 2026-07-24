import type { MemberRule, MembersMap } from "./types.js";
import { isStructuredMemberRule } from "./types.js";

export function getMemberMap(rule: MemberRule): MembersMap {
  return isStructuredMemberRule(rule) ? rule.members : rule;
}

export function getMemberGlobal(rule: MemberRule): string | undefined {
  return isStructuredMemberRule(rule) ? rule.global : undefined;
}
