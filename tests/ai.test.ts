import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAiInput, validateAiBrief } from "../src/lib/ai";
import { buildDigest } from "../src/lib/digest";
import { NOW, fixture } from "./fixture";

const digest = () => buildDigest(fixture(), NOW);

test("AI input tags every record with a citable ID", () => {
  const { prompt, keys } = buildAiInput(digest());
  assert.ok(keys.has("matter:Estimated Case Value"));
  for (const key of keys) assert.ok(prompt.includes(`[${key}]`), key);
});

test("AI claims without a real source are dropped, and citations are normalised", () => {
  const { keys } = buildAiInput(digest());
  const note = [...keys].find(k => k.startsWith("notes:"))!;
  const out = validateAiBrief({
    overview: [
      { text: "Supported", sources: [`[${note}]`] },
      { text: "Bare id", sources: [note.split(":")[1]] },
      { text: "Invented", sources: ["notes:999999", "made-up"] }
    ],
    injuries: [],
    chronology: [
      { date: "2030-02-01", provider: "B", event: "later", sources: [note] },
      { date: "2030-01-01", provider: "A", event: "earlier", sources: [note] },
      { date: "January", provider: "C", event: "bad date", sources: [note] }
    ],
    gaps: [{ text: "No sources", sources: [] }],
    nextSteps: []
  }, keys);
  assert.deepEqual(out.overview.map(o => o.text), ["Supported", "Bare id"]);
  assert.deepEqual(out.overview[0].sources, [note]);
  assert.deepEqual(out.chronology.map(c => c.event), ["earlier", "later"]);
  assert.equal(out.gaps.length, 0);
  assert.equal(out.dropped, 2);
});
