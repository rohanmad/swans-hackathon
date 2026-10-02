import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBrief } from "../src/ui/adapter";
import { buildDigest } from "../src/lib/digest";
import { NOW, fixture } from "./fixture";

test("provider desk is sourced from the imported matter, not invented", () => {
  const snapshot = fixture();
  const desk = buildBrief(snapshot, buildDigest(snapshot, NOW)).providerDesk;
  assert.ok(desk.stillNeeded.some(i => /pay stubs/i.test(i.text)));
  assert.equal(desk.stillNeeded[0].sourceId, "tasks:31");
  assert.ok(desk.patientProvided.some(i => /Checking in/i.test(i.text)));
  assert.ok(desk.liens.some(i => /Medicare/i.test(i.text) && i.sourceId === "matter:Lien Holder"));
  assert.ok(desk.payment?.text.toLowerCase().includes("pre-litigation"));
  assert.ok(desk.appointments.some(i => /PT session/i.test(i.text)));
});
