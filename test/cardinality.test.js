import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardinalityFromMinMax,
  cardinalityToMinMax,
  formatGlobalCardinality,
  formatMemberCardinality,
  parseCardinalityToken,
} from "../dist/cardinality.js";

test("cardinalityFromMinMax maps core limits", () => {
  assert.equal(cardinalityFromMinMax(-1, -1), undefined);
  assert.equal(cardinalityFromMinMax(null, undefined), undefined);
  assert.equal(cardinalityFromMinMax(0, -1), "*");
  assert.equal(cardinalityFromMinMax(1, -1), "+");
  assert.equal(cardinalityFromMinMax(-1, 1), "0..1");
  assert.equal(cardinalityFromMinMax(0, 1), "0..1");
  assert.equal(cardinalityFromMinMax(2, 5), "2..5");
  assert.equal(cardinalityFromMinMax(3, 3), "3");
  assert.equal(cardinalityFromMinMax(10, 100), "10..100");
  assert.equal(cardinalityFromMinMax(-1, 8), "0..8");
  assert.equal(cardinalityFromMinMax(2, -1), undefined);
});

test("formatMemberCardinality for MetaLang suffixes", () => {
  assert.equal(formatMemberCardinality(undefined), "*");
  assert.equal(formatMemberCardinality("*"), "*");
  assert.equal(formatMemberCardinality("+"), "+");
  assert.equal(formatMemberCardinality("0..1"), "?");
  assert.equal(formatMemberCardinality("?"), "?");
  assert.equal(formatMemberCardinality("3"), ":3");
  assert.equal(formatMemberCardinality("2..5"), ":2..5");
});

test("formatGlobalCardinality for bracket syntax", () => {
  assert.equal(formatGlobalCardinality("*"), "0..*");
  assert.equal(formatGlobalCardinality("+"), "1..*");
  assert.equal(formatGlobalCardinality("0..1"), "0..1");
  assert.equal(formatGlobalCardinality("?"), "0..1");
  assert.equal(formatGlobalCardinality("0..100"), "0..100");
});

test("parseCardinalityToken accepts MetaLang suffixes and tokens", () => {
  assert.equal(parseCardinalityToken("*"), "*");
  assert.equal(parseCardinalityToken("+"), "+");
  assert.equal(parseCardinalityToken("?"), "0..1");
  assert.equal(parseCardinalityToken("3"), "3");
  assert.equal(parseCardinalityToken("2..5"), "2..5");
  assert.equal(parseCardinalityToken("0..*"), "*");
  assert.equal(parseCardinalityToken("1..*"), "+");
  assert.equal(parseCardinalityToken("2..*"), "2..*");
  assert.throws(() => parseCardinalityToken("nope"), /Invalid cardinality/);
});

test("cardinalityToMinMax round-trips common tokens", () => {
  assert.deepEqual(cardinalityToMinMax("*"), { min: 0, max: -1 });
  assert.deepEqual(cardinalityToMinMax("+"), { min: 1, max: -1 });
  assert.deepEqual(cardinalityToMinMax("?"), { min: 0, max: 1 });
  assert.deepEqual(cardinalityToMinMax("0..1"), { min: 0, max: 1 });
  assert.deepEqual(cardinalityToMinMax("3"), { min: 3, max: 3 });
  assert.deepEqual(cardinalityToMinMax("2..5"), { min: 2, max: 5 });
  assert.deepEqual(cardinalityToMinMax("2..*"), { min: 2, max: -1 });
  assert.throws(() => cardinalityToMinMax("nope"), /Unsupported cardinality/);
});
