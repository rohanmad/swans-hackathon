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
  assert.deepEqual(desk.liens.map(l => [l.holder, l.amount, l.isLien, l.sourceId]), [["Medicare", 400, true, "matter:Lien Holder"]]);
  assert.equal(desk.signals.find(s => s.id === "liens")?.value, "$400");
  assert.equal(desk.signals.find(s => s.id === "liens")?.sourceId, "matter:Lien Holder");
  assert.equal(desk.payout?.window, undefined);
  assert.ok(desk.payout?.basis.includes("pre-litigation"));
  assert.equal(desk.signals.find(s => s.id === "payout")?.value, "No date");
  assert.ok(desk.appointments.some(i => /PT session/i.test(i.text)));
});

test("lien payout is estimated only from a dated resolution event in Clio", () => {
  const snapshot = fixture();
  snapshot.collections.calendar.records.push({ id: 42, summary: "Mediation, Jane Doe v. Acme", start_at: "2030-09-01T14:00:00Z" });
  const payout = buildBrief(snapshot, buildDigest(snapshot, NOW)).providerDesk.payout;
  assert.deepEqual(payout?.anchor, { label: "Mediation", event: "Mediation, Jane Doe v. Acme", date: "2030-09-01", sourceId: "calendar:42" });
  assert.deepEqual(payout?.window, { from: "2030-10-01", to: "2030-11-30" });
  assert.deepEqual(payout?.blockers, []);
});
