export function isStructuredMemberRule(rule) {
    return typeof rule === "object" && rule !== null && "members" in rule;
}
//# sourceMappingURL=types.js.map