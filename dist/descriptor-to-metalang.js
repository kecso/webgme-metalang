import { formatGlobalCardinality, formatMemberCardinality } from "./cardinality.js";
import { getMemberGlobal, getMemberMap } from "./member-rule.js";
import { bareInDomainRefs } from "./metalang-to-descriptor.js";
function formatTypeRef(ref) {
    if (typeof ref === "string")
        return ref;
    return ref.join(" | ");
}
function formatAttributeDef(name, def) {
    if (typeof def === "string") {
        return `  ${name}: ${def};`;
    }
    if (def.type === "enum" && def.values) {
        return `  ${name}: enum[${def.values.join(", ")}];`;
    }
    return `  ${name}: ${def.type};`;
}
function formatTypedMemberList(members) {
    return Object.entries(members)
        .map(([typeName, card]) => `${typeName}${formatMemberCardinality(card)}`)
        .join(", ");
}
function formatMemberRuleKeyword(keyword, name, rule) {
    const global = getMemberGlobal(rule);
    const members = getMemberMap(rule);
    const memberList = formatTypedMemberList(members);
    let globalSuffix = "";
    if (global && global !== "*") {
        globalSuffix = `[${formatGlobalCardinality(global)}]`;
    }
    if (keyword === "contains") {
        return `  contains${globalSuffix} ${memberList};`;
    }
    return `  set ${name}${globalSuffix} -> ${memberList};`;
}
function renderConceptBody(body) {
    const lines = [];
    if (body.attributes) {
        for (const [name, def] of Object.entries(body.attributes)) {
            lines.push(formatAttributeDef(name, def));
        }
    }
    if (body.pointers) {
        for (const [name, target] of Object.entries(body.pointers)) {
            lines.push(`  ${name} -> ${formatTypeRef(target)};`);
        }
    }
    if (body.contains) {
        lines.push(formatMemberRuleKeyword("contains", undefined, body.contains));
    }
    if (body.sets) {
        for (const [setName, rule] of Object.entries(body.sets)) {
            lines.push(formatMemberRuleKeyword("set", setName, rule));
        }
    }
    return lines;
}
function renderConcept(displayName, body) {
    const members = renderConceptBody(body);
    if (members.length === 0) {
        if (body.extends) {
            return [`concept ${displayName} extends ${body.extends};`];
        }
        return [`concept ${displayName};`];
    }
    const head = body.extends
        ? `concept ${displayName} extends ${body.extends} {`
        : `concept ${displayName} {`;
    return [head, ...members, "}"];
}
function libraryOf(conceptName) {
    const dot = conceptName.indexOf(".");
    return dot === -1 ? null : conceptName.slice(0, dot);
}
function bareName(conceptName) {
    const dot = conceptName.lastIndexOf(".");
    return dot === -1 ? conceptName : conceptName.slice(dot + 1);
}
/**
 * Canonical MetaLang emit: each library is its own `domain` (bare names inside),
 * then the host `domain` with `library Lib` directives and host concepts (FQN to libs).
 */
export function descriptorToMetalang(descriptor, domain) {
    const lines = [];
    const host = [];
    const byLibrary = new Map();
    for (const [name, body] of Object.entries(descriptor.concepts)) {
        const lib = libraryOf(name);
        if (!lib) {
            host.push([name, body]);
            continue;
        }
        const list = byLibrary.get(lib) ?? [];
        list.push([name, body]);
        byLibrary.set(lib, list);
    }
    const libNames = [...byLibrary.keys()].sort((a, b) => a.localeCompare(b));
    for (const lib of libNames) {
        lines.push(`domain ${lib}`);
        lines.push("");
        for (const [fqn, body] of byLibrary.get(lib)) {
            const bareBody = bareInDomainRefs(body, lib);
            lines.push(...renderConcept(bareName(fqn), bareBody));
            lines.push("");
        }
    }
    lines.push(`domain ${domain}`);
    lines.push("");
    for (const lib of libNames) {
        lines.push(`library ${lib}`);
    }
    if (libNames.length > 0)
        lines.push("");
    for (const [name, body] of host) {
        lines.push(...renderConcept(name, body));
        lines.push("");
    }
    return lines.join("\n").replace(/\n+$/, "\n");
}
//# sourceMappingURL=descriptor-to-metalang.js.map