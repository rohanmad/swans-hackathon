import { documentTitle, type DatedItem, type Digest, type Fact, type Source as DigestSource } from "@/lib/digest";
import { nested, plainText, text, type ClioRecord, type Snapshot } from "@/lib/types";
import type {
  AttentionItem, BriefSegment, CaseData, CaseSignal, CaseStage, Client, DemandDocument, Incident,
  MedicalBill, MedicalProvider, MedicalSummarySection, SearchEntry, Source, SourceKind, StoryEvent, WaitingItem
} from "./types";

export type Brief = {
  case: CaseData; client: Client | null; incident: Incident | null;
  signals: CaseSignal[]; attention: AttentionItem[]; waiting: WaitingItem[];
  providers: MedicalProvider[]; bills: MedicalBill[]; billsSourceId?: string;
  keyNotes: MedicalSummarySection[]; story: StoryEvent[]; documents: DemandDocument[];
  timeline: DatedItem[]; search: SearchEntry[]; sources: Record<string, Source>;
  totalEntries: number; overdueCount: number;
};

export const sourceId = (s: DigestSource) => s.kind === "matter" ? `matter:${s.field}` : `${s.kind}:${s.id}`;
const DOC_TYPE: Record<string, string> = { notes: "Clio note", tasks: "Clio task", calendar: "Clio calendar entry", activities: "Clio expense", contacts: "Clio contact" };
const ORIGIN: Record<string, string> = { notes: "Clio · Notes", communications: "Clio · Communications", tasks: "Clio · Tasks", calendar: "Clio · Calendar", activities: "Clio · Expenses", documents: "Clio · Documents", contacts: "Clio · Contacts", matter: "Clio · Matter custom fields" };
const firstSentence = (value: string, max = 220) => {
  const t = plainText(value).replace(/\s+/g, " ").trim();
  const m = t.match(/^(.{20,}?[.!?])(\s|$)/);
  const s = m ? m[1] : t;
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
};
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const day = (s: string) => s ? s.slice(0, 10) : "";
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const people = (r: ClioRecord, key: string) => Array.isArray(r[key]) ? (r[key] as ClioRecord[]).map(p => text(p, "name") || text(p, "identifier")).filter(Boolean).join(", ") : "";

function sourceKind(kind: string, record: ClioRecord, field?: string): SourceKind {
  if (kind === "matter") return /coverage|policy|insur|carrier|claim/i.test(field ?? "") ? "insurance" : /value|special|lien|wage/i.test(field ?? "") ? "financial" : "legal";
  if (kind === "communications") return "communication";
  if (kind === "activities") return "financial";
  if (kind === "documents") return /medical/i.test(text(record, "name")) ? "medical" : "legal";
  return "internal";
}

export function buildSources(snapshot: Snapshot): Record<string, Source> {
  const out: Record<string, Source> = {};
  const add = (s: Source) => { out[s.id] = s; };
  const m = snapshot.matter;
  for (const field of (Array.isArray(m.custom_field_values) ? m.custom_field_values as ClioRecord[] : [])) {
    const label = text(field, "field_name");
    const body = field.value === true ? "Yes" : field.value === false ? "No" : plainText(String(field.value ?? ""));
    if (!body) continue;
    add({ id: `matter:${label}`, title: label, kind: sourceKind("matter", m, label), docType: `Matter ${text(m, "display_number")} · custom field`, date: day(text(m, "updated_at")), origin: ORIGIN.matter, sections: [{ heading: label, body }], excerpt: firstSentence(body, 260), usedIn: [] });
  }
  for (const [kind, result] of Object.entries(snapshot.collections)) {
    for (const r of result.records) {
      const id = `${kind}:${r.id}`;
      const title = text(r, "subject") || text(r, "name") || text(r, "summary") || (kind === "activities" ? firstSentence(text(r, "note"), 80) : "Record");
      const date = text(r, "date") || text(r, "start_at") || text(r, "due_at") || text(r, "received_at") || text(r, "created_at");
      const body = plainText(text(r, "detail") || text(r, "body") || text(r, "description") || text(r, "note"));
      const sections = [];
      if (kind === "communications") sections.push({ heading: "From → To", body: `${people(r, "senders") || "—"} → ${people(r, "receivers") || "—"}` });
      if (kind === "contacts") sections.push({ heading: "Role", body: text(r, "relationship_name") || "—" }, { heading: "Contact", body: [text(r, "primary_email_address"), text(r, "primary_phone_number")].filter(Boolean).join(" · ") || "—" });
      if (kind === "activities") sections.push({ heading: "Amount", body: usd(Number(r.total ?? Number(r.price) * Number(r.quantity ?? 1)) || 0) });
      if (kind === "tasks") sections.push({ heading: "Status", body: `${text(r, "status")}${text(r, "due_at") ? ` · due ${day(text(r, "due_at"))}` : ""}` });
      if (body) sections.push({ heading: kind === "documents" ? "Description" : "Text", body });
      const author = nested(r, "author") ? text(nested(r, "author")!, "name") : kind === "communications" ? people(r, "senders") : undefined;
      add({
        id, title: kind === "documents" ? documentTitle(title) : title, kind: sourceKind(kind, r), date: day(date), author: author || undefined, origin: ORIGIN[kind] ?? "Clio",
        docType: kind === "documents" ? title : kind === "communications" ? text(r, "type").replace(/Communication$/, "") || "Message" : DOC_TYPE[kind] ?? kind,
        sections, excerpt: body ? firstSentence(body, 260) : "", usedIn: [],
        href: kind === "documents" ? `/api/clio/documents/${r.id}` : undefined
      });
    }
  }
  return out;
}

export function buildBrief(snapshot: Snapshot, digest: Digest): Brief {
  const sources = buildSources(snapshot);
  const sid = sourceId;
  const fact = (pattern: RegExp) => digest.facts.find(f => pattern.test(f.label));
  const incidentFact = fact(/date of (incident|loss|accident)|incident date|accident date/i);
  const location = fact(/location/i);
  const summary = fact(/case summary|summary/i);
  const policy = digest.kpis.coverage.find(f => /limit/i.test(f.label)) ?? digest.kpis.coverage[0];
  const confirmed = digest.flags.find(f => /limit|coverage/i.test(f.label));
  const sol = digest.limitation[0];
  const now = Date.now();
  const yearsAgo = (d: string) => { const y = (now - Date.parse(d)) / (365.25 * 86_400_000); return y >= 1 ? `${y.toFixed(1)} years ago` : `${Math.round(y * 12)} months ago`; };

  const clientContact = snapshot.collections.contacts.records.find(c => c.is_client);
  const signals: CaseSignal[] = [];
  if (incidentFact) signals.push({ id: "doi", label: "Date of incident", value: fmt(incidentFact.value), qualifier: location?.value.split(",")[0] ?? digest.matter.description, sub: `${yearsAgo(incidentFact.value)}${sol ? ` · SOL ${fmt(sol.date)} ${sol.status === "complete" ? "satisfied" : "OPEN"}` : ""}`, sourceId: sid(incidentFact.source), tone: "default" });
  if (digest.kpis.caseValue) signals.push({ id: "value", label: "Case value", value: digest.kpis.caseValue.value, qualifier: "Recorded estimate in Clio", sub: digest.kpis.specials ? `Medical specials ${digest.kpis.specials.value}` : undefined, sourceId: sid(digest.kpis.caseValue.source) });
  if (policy) { const [first, ...rest] = policy.value.split("\n"); signals.push({ id: "coverage", label: "Coverage", value: first.replace(/^[^:]*:\s*/, ""), qualifier: first.includes(":") ? first.split(":")[0] : policy.label, sub: [confirmed && confirmed.value === "Yes" ? "Confirmed" : null, ...rest].filter(Boolean).join(" · ") || undefined, sourceId: sid(policy.source), tone: confirmed?.value === "Yes" ? "default" : undefined }); }
  if (digest.costs.length) signals.push({ id: "spend", label: "Firm spend", value: usd(digest.kpis.firmCosts), qualifier: `${digest.costs.length} case expenses`, sub: `Excludes ${usd(digest.kpis.medicalCharges)} provider charges`, sourceId: sid(digest.costs[0].source) });

  const stages: CaseStage[] = [];
  if (incidentFact) stages.push({ id: "incident", label: "Incident", detail: location?.value.split(",")[0] ?? "Date of incident", date: incidentFact.value, status: "complete" });
  if (digest.matter.openDate) stages.push({ id: "retained", label: "Retained", detail: "Matter opened", date: digest.matter.openDate, status: "complete" });
  if (digest.recent[0]) stages.push({ id: "latest", label: "Latest", detail: digest.recent[0].title.slice(0, 40), date: day(digest.recent[0].date), status: "complete" });
  stages.push({ id: "current", label: digest.matter.stage || "Current", detail: digest.matter.status === "Open" ? "Active" : digest.matter.status, status: "current" });
  const next = [...digest.overdue, ...digest.upcoming][0];
  if (next) stages.push({ id: "next", label: next.overdue ? "Overdue" : "Next", detail: next.title.replace(/^By medical provider:[^-]*-\s*/i, "").slice(0, 40), date: next.date, status: "upcoming" });

  const caseData: CaseData = {
    id: digest.matter.number, title: digest.matter.description || digest.matter.number,
    status: digest.matter.status === "Open" ? "active" : "closed", clientName: digest.client?.name ?? "—", defendantName: "",
    lastUpdated: snapshot.syncedAt, stages, signals
  };

  const last = digest.clientContact.last;
  const client: Client | null = digest.client ? {
    name: digest.client.name, initials: initials(digest.client.name),
    age: digest.client.dateOfBirth ? Math.floor((now - Date.parse(digest.client.dateOfBirth)) / (365.25 * 86_400_000)) : null,
    phone: clientContact ? text(clientContact, "primary_phone_number") || undefined : undefined,
    email: clientContact ? text(clientContact, "primary_email_address") || undefined : undefined,
    representedSince: digest.matter.openDate,
    lastContact: last ? { date: day(last.date), channel: `${last.tags?.[0] ?? "Message"} · ${last.title}`, sourceId: sid(last.source) } : { date: digest.matter.openDate, channel: "No communication logged", sourceId: sid(digest.client.source) }
  } : null;

  const incident: Incident | null = incidentFact || summary ? {
    date: incidentFact?.value ?? "", type: digest.matter.description, location: location?.value ?? "",
    description: summary ? [{ text: summary.value, kind: "incident", sourceId: sid(summary.source) }] : [],
    sourceId: sid((summary ?? incidentFact)!.source)
  } : null;

  const strip = (t: string) => t.replace(/^By medical provider:[^-]*-\s*/i, "");
  const attention: AttentionItem[] = [
    ...digest.overdue.map(t => ({ t, urgency: "overdue" as const })),
    ...digest.upcoming.map(t => ({ t, urgency: "soon" as const }))
  ].map(({ t, urgency }) => ({
    id: t.source.id, urgency, title: strip(t.title), description: firstSentence(t.detail ?? "") || (t.waitingOn ? `Waiting on ${t.waitingOn}.` : "Open task in Clio."),
    dueLabel: `${urgency === "overdue" ? "Was due" : "Due"} ${fmt(t.date)}`, owner: t.waitingOn ?? undefined,
    sourceId: sid(t.source), sourceLabel: `Task · ${fmt(t.date)}`, action: "Open task"
  }));
  const role = (name: string) => name === digest.client?.name ? "Client" : digest.providers.some(p => p.name === name) ? "Provider" : "Other";
  const waiting: WaitingItem[] = digest.waiting.map(t => ({
    id: t.source.id, party: t.waitingOn ?? "", partyRole: role(t.waitingOn ?? ""), item: strip(t.title),
    requested: t.date, sourceId: sid(t.source)
  }));

  const nextAppt = (appts: DatedItem[]) => appts.find(a => Date.parse(a.date) >= now);
  const providers: MedicalProvider[] = digest.providers.map(p => {
    const contact = snapshot.collections.contacts.records.find(c => String(c.id) === p.id);
    const upcoming = nextAppt(p.appointments);
    const recent = p.appointments.some(a => now - Date.parse(a.date) < 90 * 86_400_000);
    return {
      id: p.id, name: p.name, office: p.name, specialty: cap(p.role.replace(/^(treating provider|medical provider)[,:]\s*/i, "")),
      phone: contact ? text(contact, "primary_phone_number") || undefined : undefined,
      treatment: upcoming || recent ? "active" : "complete",
      treatmentDetail: upcoming ? `Next visit ${fmt(upcoming.date)}` : p.lastInbound ? `Last heard from ${fmt(p.lastInbound.date)}` : p.openRequests.length ? `${p.openRequests.length} open request` : "No recent contact",
      recordIds: p.documents.map(d => `documents:${d.id}`), billSourceId: p.charges[0] ? sid(p.charges[0].source) : undefined
    };
  });
  const bills: MedicalBill[] = digest.providers.filter(p => p.chargesTotal > 0).map(p => ({
    id: p.id, providerId: p.id, payee: p.name, amount: p.chargesTotal, status: "unknown", sourceId: sid(p.charges[0].source)
  }));

  const keyNotes: MedicalSummarySection[] = digest.keyNotes.slice(0, 5).map(n => ({
    id: n.source.id, label: n.title,
    body: [{ text: firstSentence(n.detail ?? "", 240), kind: tagKind(n.tags?.[0]), sourceId: sid(n.source) } as BriefSegment],
    sourceIds: [sid(n.source)]
  }));

  const story: StoryEvent[] = [];
  if (incidentFact) story.push({ id: "incident", date: incidentFact.value, category: "Incident", title: summary ? firstSentence(summary.value, 60) : "Incident", summary: summary?.value ?? "", sourceId: sid((summary ?? incidentFact).source) });
  const storyNotes = [...digest.keyNotes].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);
  for (const n of storyNotes) story.push({ id: n.source.id, date: day(n.date), category: cap(n.tags?.[0] ?? "Note"), title: n.title.length > 48 ? n.title.slice(0, 47) + "…" : n.title, summary: firstSentence(n.detail ?? "", 200), sourceId: sid(n.source) });
  const latest = digest.recent[0];
  if (latest) story.push({ id: "now", date: new Date(now).toISOString().slice(0, 10), category: "Now", title: digest.matter.stage || "Today", summary: `Latest: ${latest.title} (${fmt(latest.date)})`, sourceId: sid(latest.source), isNow: true });
  story.sort((a, b) => a.date.localeCompare(b.date));

  const documents: DemandDocument[] = [
    ...digest.documents.flatMap(g => g.items.map(d => ({
      id: d.id, title: cap(documentTitle(d.name)), category: /medical/i.test(g.category) ? "medical" : /expert/i.test(g.category) ? "experts" : "case file",
      group: g.category, status: "ready" as const, date: d.date, sourceId: `documents:${d.id}`
    }))),
    ...digest.waiting.map(t => ({
      id: `req-${t.source.id}`, title: strip(t.title), category: t.waitingOn && role(t.waitingOn) === "Provider" ? "medical" : "case file",
      group: "Requested", status: "requested" as const, note: `from ${t.waitingOn} · due ${fmt(t.date)}`, sourceId: sid(t.source)
    }))
  ];

  const timeline = digest.timeline.map(i => i.kind === "documents" ? { ...i, title: documentTitle(i.title) } : i);
  const search: SearchEntry[] = [];
  const seen = new Set<string>();
  const q = (id: string, question: string, keywords: string[], answer: string, s?: DigestSource) => {
    if (!s || seen.has(sid(s) + answer)) return;
    seen.add(sid(s) + answer);
    search.push({ id, question, keywords, answer, sourceId: sid(s) });
  };
  if (policy) q("q-coverage", "What is the coverage?", ["coverage", "policy", "limits", "insurance"], policy.value.replace(/\n/g, " · "), policy.source);
  if (last) q("q-contact", "When was the client last contacted?", ["last client contact", "contact", "client", "call"], `${fmt(last.date)}: ${last.title} (${digest.clientContact.daysSince} days ago).`, last.source);
  if (digest.kpis.caseValue) q("q-value", "What is the case worth?", ["value", "worth", "estimate"], `${digest.kpis.caseValue.value} recorded estimate.`, digest.kpis.caseValue.source);
  if (digest.costs[0]) q("q-spend", "How much has the firm spent?", ["spent", "expenses", "costs", "firm spend"], `${usd(digest.kpis.firmCosts)} across ${digest.costs.length} case expenses.`, digest.costs[0].source);
  for (const l of digest.kpis.liens) q(`q-lien-${l.label}`, `${l.label}?`, ["lien", "liens", "medicaid", "medicare"], firstSentence(l.value, 240), l.source);
  if (digest.recent[0]) q("q-recent", "What happened recently?", ["what happened last week", "recent", "latest", "last week"], digest.recent.slice(0, 4).map(r => `${r.title} (${fmt(r.date)})`).join("; "), digest.recent[0].source);
  if (next) q("q-next", "What's due next?", ["deadline", "due", "overdue", "next"], `${strip(next.title)}, ${next.overdue ? "overdue since" : "due"} ${fmt(next.date)}.`, next.source);
  for (const f of digest.facts) q(`q-fact-${f.label}`, f.label, f.label.toLowerCase().split(/\s+/), firstSentence(f.value, 240), f.source);
  for (const item of timeline) q(`q-${item.kind}-${item.source.id}`, item.title, item.title.toLowerCase().split(/\W+/).filter(w => w.length > 3), item.detail ? firstSentence(item.detail, 200) : `${KIND[item.kind] ?? item.kind} · ${fmt(item.date)}`, item.source);

  return {
    case: caseData, client, incident, signals, attention, waiting, providers, bills,
    billsSourceId: digest.kpis.specials ? sid(digest.kpis.specials.source) : undefined,
    keyNotes, story, documents, timeline, search, sources,
    totalEntries: digest.timeline.length, overdueCount: digest.overdue.length
  };
}

const KIND: Record<string, string> = { notes: "Note", communications: "Communication", calendar: "Calendar", documents: "Document", tasks: "Task" };
function tagKind(tag?: string): Exclude<BriefSegment, string>["kind"] {
  switch (tag) {
    case "coverage": return "coverage";
    case "surgery": return "treatment";
    case "lien": case "value": case "negotiation": return "money";
    case "liability": case "risk": return "liability";
    case "deadline": case "open issue": return "activity";
    default: return "status";
  }
}
function fmt(value: string) {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export type { Fact };
