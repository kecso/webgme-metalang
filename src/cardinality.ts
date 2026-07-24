import type { CardinalityString } from "./types.js";

export function cardinalityFromMinMax(
  min: number | undefined | null,
  max: number | undefined | null,
): CardinalityString | undefined {
  const lo = min ?? -1;
  const hi = max ?? -1;

  if (lo === -1 && hi === -1) return undefined;
  if (lo === 0 && hi === -1) return "*";
  if (lo === 1 && hi === -1) return "+";
  if ((lo === 0 || lo === -1) && hi === 1) return "0..1";
  if (lo >= 0 && hi >= 0 && lo === hi) return String(lo);
  if (lo >= 0 && hi >= 0 && lo <= hi) return `${lo}..${hi}`;
  if (lo === -1 && hi >= 0) return `0..${hi}`;
  return undefined;
}

export function formatMemberCardinality(card: CardinalityString | undefined): string {
  if (!card || card === "*") return "*";
  if (card === "+") return "+";
  if (card === "0..1" || card === "?") return "?";
  if (/^\d+$/.test(card)) return `:${card}`;
  return `:${card}`;
}

export function formatGlobalCardinality(card: CardinalityString): string {
  if (card === "*") return "0..*";
  if (card === "+") return "1..*";
  if (card === "0..1" || card === "?") return "0..1";
  return card;
}

/** Parse MetaLang member suffix (`*`, `+`, `?`, `:3`, `:2..5`) or bare token (`0..1`). */
export function parseCardinalityToken(raw: string): CardinalityString {
  const token = raw.trim();
  if (token === "*" || token === "+" || token === "?") return token === "?" ? "0..1" : token;
  if (/^\d+$/.test(token)) return token;
  if (/^\d+\.\.\d+$/.test(token)) return token;
  if (/^\d+\.\.\*$/.test(token)) {
    const lo = Number(token.slice(0, token.indexOf("..")));
    if (lo === 0) return "*";
    if (lo === 1) return "+";
    return `${lo}..*`;
  }
  throw new Error('Invalid cardinality: "' + token + '"');
}

/** Map cardinality string to core min/max (`-1` = unbound). */
export function cardinalityToMinMax(card: CardinalityString | undefined): {
  min: number;
  max: number;
} {
  if (!card || card === "*") return { min: 0, max: -1 };
  if (card === "+") return { min: 1, max: -1 };
  if (card === "?" || card === "0..1") return { min: 0, max: 1 };
  if (/^\d+$/.test(card)) {
    const n = Number(card);
    return { min: n, max: n };
  }
  const range = /^(\d+)\.\.(\d+|\*)$/.exec(card);
  if (range) {
    const min = Number(range[1]);
    const max = range[2] === "*" ? -1 : Number(range[2]);
    return { min, max };
  }
  throw new Error('Unsupported cardinality for core limits: "' + card + '"');
}
