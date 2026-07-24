import type { CardinalityString } from "./types.js";
export declare function cardinalityFromMinMax(min: number | undefined | null, max: number | undefined | null): CardinalityString | undefined;
export declare function formatMemberCardinality(card: CardinalityString | undefined): string;
export declare function formatGlobalCardinality(card: CardinalityString): string;
/** Parse MetaLang member suffix (`*`, `+`, `?`, `:3`, `:2..5`) or bare token (`0..1`). */
export declare function parseCardinalityToken(raw: string): CardinalityString;
/** Map cardinality string to core min/max (`-1` = unbound). */
export declare function cardinalityToMinMax(card: CardinalityString | undefined): {
    min: number;
    max: number;
};
//# sourceMappingURL=cardinality.d.ts.map