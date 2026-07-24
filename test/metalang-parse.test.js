import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { descriptorToMetalang } from "../dist/descriptor-to-metalang.js";
import { parseMetalang, parseMetalangFile } from "../dist/metalang-to-descriptor.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const docsExamples = path.join(here, "..", "docs", "examples");

test("parseMetalang round-trips StateMachine example", () => {
  const source = fs.readFileSync(path.join(docsExamples, "state-machine.metalang"), "utf8");
  const expected = JSON.parse(
    fs.readFileSync(path.join(docsExamples, "state-machine.descriptor.json"), "utf8"),
  );
  const parsed = parseMetalang(source);
  assert.equal(parsed.domain, "StaMS.StateMachine");
  assert.deepEqual(parsed.descriptor.concepts, expected.concepts);
});

test("parseMetalang multi-domain + library directive", () => {
  const parsed = parseMetalang(`
domain SharedMeta

concept State {
  isInitial: bool;
}

domain Host

library SharedMeta

concept Machine {
  contains SharedMeta.State*;
}
`);
  assert.equal(parsed.domain, "Host");
  assert.deepEqual(parsed.libraries, ["SharedMeta"]);
  assert.ok(parsed.domains.SharedMeta);
  assert.ok(parsed.domains.Host);
  assert.equal(parsed.domains.SharedMeta.concepts.State.attributes.isInitial, "bool");
  assert.ok(parsed.descriptor.concepts["SharedMeta.State"]);
  assert.ok(parsed.descriptor.concepts.Machine);
  assert.deepEqual(parsed.descriptor.concepts.Machine.contains, {
    "SharedMeta.State": "*",
  });
});

test("parseMetalang library as renames namespace", () => {
  const parsed = parseMetalang(`
domain SharedMeta
concept State;

domain Host
library SharedMeta as SM
concept Machine { contains SM.State*; }
`);
  assert.deepEqual(parsed.libraries, ["SM"]);
  assert.ok(parsed.descriptor.concepts["SM.State"]);
  assert.deepEqual(parsed.descriptor.concepts.Machine.contains, { "SM.State": "*" });
});

test("parseMetalang import loads sibling domain file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metalang-import-"));
  try {
    fs.writeFileSync(
      path.join(dir, "SharedMeta.metalang"),
      `domain SharedMeta\n\nconcept State {\n  isInitial: bool;\n}\n`,
    );
    fs.writeFileSync(
      path.join(dir, "Host.metalang"),
      `domain Host\n\nimport SharedMeta from "./SharedMeta.metalang"\nlibrary SharedMeta\n\nconcept Machine {\n  contains SharedMeta.State*;\n}\n`,
    );
    const parsed = parseMetalangFile(path.join(dir, "Host.metalang"));
    assert.deepEqual(parsed.libraries, ["SharedMeta"]);
    assert.ok(parsed.descriptor.concepts["SharedMeta.State"]);
    assert.ok(parsed.descriptor.concepts.Machine);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("parseMetalang library from is import+attach sugar", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metalang-libfrom-"));
  try {
    fs.writeFileSync(
      path.join(dir, "SharedMeta.metalang"),
      `domain SharedMeta\nconcept State;\n`,
    );
    const parsed = parseMetalang(
      `domain Host\nlibrary SharedMeta from "./SharedMeta.metalang"\nconcept M { contains SharedMeta.State*; }\n`,
      { baseDir: dir },
    );
    assert.deepEqual(parsed.libraries, ["SharedMeta"]);
    assert.ok(parsed.descriptor.concepts["SharedMeta.State"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("last domain is host; unused domains are ignored on flatten", () => {
  const parsed = parseMetalang(`
domain UnusedScratch
concept Scratch { note: string; }

domain SharedMeta
concept State { isInitial: bool; }

domain Host
library SharedMeta
concept Machine { contains SharedMeta.State*; }
`);
  assert.equal(parsed.domain, "Host");
  assert.deepEqual(parsed.libraries, ["SharedMeta"]);
  assert.deepEqual(parsed.ignoredDomains, ["UnusedScratch"]);
  assert.ok(parsed.domains.UnusedScratch);
  assert.ok(parsed.descriptor.concepts.Machine);
  assert.ok(parsed.descriptor.concepts["SharedMeta.State"]);
  assert.equal(parsed.descriptor.concepts.Scratch, undefined);
  assert.equal(parsed.descriptor.concepts["UnusedScratch.Scratch"], undefined);
});

test("descriptorToMetalang emits multi-domain + library directives (canonical)", () => {
  const metalang = descriptorToMetalang(
    {
      version: 1,
      concepts: {
        Machine: { contains: { "SharedMeta.State": "*" } },
        "SharedMeta.State": {
          attributes: { isInitial: "bool" },
          pointers: { next: "SharedMeta.State" },
        },
      },
    },
    "Host",
  );
  assert.match(metalang, /domain SharedMeta/);
  assert.match(metalang, /domain Host/);
  assert.match(metalang, /^library SharedMeta$/m);
  assert.match(metalang, /concept State \{/);
  assert.match(metalang, /next -> State;/);
  assert.match(metalang, /contains SharedMeta\.State\*/);
  assert.doesNotMatch(metalang, /library SharedMeta \{/);
  assert.doesNotMatch(metalang, /concept SharedMeta\.State/);
});

test("docs examples host-with-sharedmeta and shared-meta parse", () => {
  const shared = parseMetalangFile(path.join(docsExamples, "shared-meta.metalang"));
  assert.equal(shared.domain, "SharedMeta");
  assert.ok(shared.descriptor.concepts.State);

  const host = parseMetalangFile(path.join(docsExamples, "host-with-sharedmeta.metalang"));
  assert.equal(host.domain, "Host");
  assert.deepEqual(host.libraries, ["SharedMeta"]);
  assert.ok(host.descriptor.concepts["SharedMeta.State"]);
});
