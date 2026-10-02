import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDigest, documentCategory, documentTitle } from "../src/lib/digest";
import { NOW, fixture } from "./fixture";

test("KPIs come from matter custom fields, each with its source", () => {
  const d = buildDigest(fixture(), NOW);
  assert.equal(d.kpis.caseValue?.value, "$90,000");
  assert.deepEqual(d.kpis.caseValue?.source, { kind: "matter", id: "100", field: "Estimated Case Value" });
  assert.deepEqual(d.kpis.coverage.map(f => f.label), ["Policy Limits"]);
  assert.equal(d.kpis.specials?.value, "$1,200");
  assert.equal(d.kpis.liens[0].value, "Medicare $400", "HTML is stripped");
  assert.deepEqual(d.flags.map(f => `${f.label}=${f.value}`), ["Coverage Confirmed=Yes"]);
  assert.ok(!d.facts.some(f => f.label === "Empty Field"));
});

test("firm costs exclude provider charges and time entries", () => {
  const d = buildDigest(fixture(), NOW);
  assert.equal(d.kpis.firmCosts, 25);
  assert.equal(d.kpis.medicalCharges, 1200, "falls back to price × quantity when total is null");
  assert.deepEqual(d.costs.map(c => c.source.id), ["50"]);
});

test("tasks are split into overdue, upcoming and waiting-on", () => {
  const d = buildDigest(fixture(), NOW);
  assert.deepEqual(d.overdue.map(t => t.source.id), ["30"]);
  assert.deepEqual(d.upcoming.map(t => t.source.id), ["31"], "only within 30 days");
  assert.deepEqual(d.waiting.map(t => [t.source.id, t.waitingOn]), [["30", "Northside Physical Therapy"], ["31", "Jane Doe"]]);
  assert.deepEqual(d.limitation.map(t => t.source.id), ["33"]);
});

test("client contact uses the most recent communication with the client", () => {
  const d = buildDigest(fixture(), NOW);
  assert.equal(d.clientContact.last?.source.id, "21");
  assert.equal(d.clientContact.lastInbound?.source.id, "20");
  assert.equal(d.clientContact.daysSince, 3);
});

test("providers are linked to their charges, documents, requests and appointments", () => {
  const d = buildDigest(fixture(), NOW);
  assert.equal(d.providers.length, 1, "adverse carrier is not a provider");
  const p = d.providers[0];
  assert.equal(p.name, "Northside Physical Therapy");
  assert.equal(p.chargesTotal, 1200);
  assert.equal(p.charges[0].label, "Treatment 2029-01-05 to 2029-03-01");
  assert.deepEqual(p.documents.map(x => x.id), ["60"]);
  assert.deepEqual(p.openRequests.map(t => t.source.id), ["30"]);
  assert.deepEqual(p.appointments.map(a => a.source.id), ["40"]);
  assert.equal(p.lastInbound?.source.id, "22");
});

test("key notes rank substantive notes above trivial ones", () => {
  const d = buildDigest(fixture(), NOW);
  const ids = d.keyNotes.map(n => n.source.id);
  assert.equal(ids.length, 3);
  assert.ok(d.keyNotes.find(n => n.source.id === "11")!.tags!.includes("coverage"));
  assert.deepEqual(d.keyNotes.find(n => n.source.id === "10")!.tags, []);
});

test("timeline contains past items only, newest first", () => {
  const d = buildDigest(fixture(), NOW);
  assert.ok(!d.timeline.some(i => i.source.id === "40"), "future calendar entry excluded");
  assert.ok(d.timeline.some(i => i.source.id === "34"), "completed task included");
  assert.deepEqual([...d.timeline].sort((a, b) => b.date.localeCompare(a.date)), d.timeline);
});

test("document names are categorised by their folder prefix", () => {
  assert.equal(documentCategory("04-medical-records__created__x.pdf"), "Medical records");
  assert.equal(documentCategory("loose-file.pdf"), "Other");
  assert.equal(documentTitle("05-medical-bills__created__acme-bill-2024.pdf"), "acme bill 2024");
});
