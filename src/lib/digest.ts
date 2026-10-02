import { nested, plainText, text, type ClioRecord, type Collection, type Snapshot } from "./types";

export type SourceKind = Collection | "matter";
export type Source = { kind: SourceKind; id: string; field?: string };
export type Fact = { label: string; value: string; type: string; source: Source };
export type Money = { amount: number; label: string; date: string; source: Source };
export type DatedItem = { date: string; title: string; kind: SourceKind; source: Source; detail?: string; tags?: string[] };
export type TaskItem = DatedItem & { status: string; overdue: boolean; waitingOn: string | null; limitation: boolean };
export type Provider = {
  id: string; name: string; role: string; source: Source;
  charges: Money[]; chargesTotal: number;
  documents: { id: string; name: string; category: string; date: string }[];
  openRequests: TaskItem[]; appointments: DatedItem[];
  lastContact: DatedItem | null; lastInbound: DatedItem | null;
};
export type Digest = {
  generatedAt: string;
  client: { name: string; dateOfBirth: string; source: Source } | null;
  matter: { number: string; description: string; stage: string; status: string; openDate: string; lastActivity: string };
  kpis: { caseValue: Fact | null; coverage: Fact[]; specials: Fact | null; liens: Fact[]; firmCosts: number; medicalCharges: number };
  facts: Fact[];
  flags: Fact[];
  overdue: TaskItem[]; upcoming: TaskItem[]; waiting: TaskItem[]; limitation: TaskItem[];
  upcomingEvents: DatedItem[];
  clientContact: { last: DatedItem | null; lastInbound: DatedItem | null; daysSince: number | null };
  keyNotes: DatedItem[];
  recent: DatedItem[];
  timeline: DatedItem[];
  costs: Money[];
  providers: Provider[];
  documents: { category: string; items: { id: string; name: string; date: string }[] }[];
};

const DAY = 86_400_000;
const PROVIDER_ROLE = /provider|hospital|surgeon|treating|chiropract|therap|radiolog|neurolog|imaging|physician|clinic|medical|doctor/i;
const MEDICAL_CHARGE = /^\s*medical (treatment )?charges|^\s*medical bill/i;
const SIGNAL_WORDS: [RegExp, string][] = [
  [/coverage|policy limit|self-insured|\bcarrier/i, "coverage"],
  [/surgery|surgical|arthroscop|operative/i, "surgery"],
  [/\bliens?\b|medicaid|medicare|collateral source/i, "lien"],
  [/limitations? (date|period)|deadline|statute/i, "deadline"],
  [/\bdemand\b|\boffer|settle|negotiat|adjuster/i, "negotiation"],
  [/case value|\bworth\b|evaluation|specials|damages/i, "value"],
  [/liabilit|scope of employment|mechanism|\bfault\b/i, "liability"],
  [/discrepan|contradict|inconsisten|\bdenied\b|different accounts/i, "risk"],
  [/\bstuck\b|missing|outstanding|still not|open question|no date|unreconciled/i, "open issue"]
];
const STOP = new Set(["the", "and", "of", "inc", "llc", "pllc", "pc", "p.c.", "md", "m.d.", "dc", "d.c.", "offices", "office", "services", "associates", "group", "company"]);

const id = (r: ClioRecord) => String(r.id);
const day = (value: string) => value ? value.slice(0, 10) : "";
const parties = (r: ClioRecord, key: string) => (Array.isArray(r[key]) ? r[key] as ClioRecord[] : []);
const amountOf = (r: ClioRecord) => {
  const total = Number(r.total);
  if (r.total !== null && r.total !== undefined && Number.isFinite(total)) return total;
  const price = Number(r.price), quantity = r.quantity === null || r.quantity === undefined ? 1 : Number(r.quantity);
  return Number.isFinite(price) && Number.isFinite(quantity) ? price * quantity : 0;
};
const firstLine = (value: string) => plainText(value).split("\n")[0].trim();
const chargeLabel = (note: string) => {
  const span = note.match(/services\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i);
  return span ? `Treatment ${span[1]} to ${span[2]}` : firstLine(note);
};
export const documentTitle = (name: string) => name.replace(/^[^_]*__[^_]*__/, "").replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[-_]+/g, " ");

function nameKeys(name: string) {
  const words = name.toLowerCase().replace(/[,&()]/g, " ").split(/\s+/).filter(w => w && !STOP.has(w) && !/^[a-z]\.?$/.test(w));
  const keys = new Set<string>();
  if (words.length >= 2) keys.add(`${words[0]}-${words[1]}`);
  if (words[0] && words[0].length >= 8) keys.add(words[0]);
  return [...keys];
}
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const mentions = (haystack: string, name: string) => haystack.toLowerCase().includes(name.toLowerCase());

export function documentCategory(name: string) {
  const prefix = name.includes("__") ? name.split("__")[0] : "";
  const label = prefix.replace(/^\d+[-_]?/, "").replace(/[-_]+/g, " ").trim();
  return label ? label[0].toUpperCase() + label.slice(1) : "Other";
}

function scoreNote(note: ClioRecord, now: number) {
  const body = `${text(note, "subject")} ${text(note, "detail")}`;
  const tags = SIGNAL_WORDS.filter(([pattern]) => pattern.test(body)).map(([, tag]) => tag);
  const age = (now - Date.parse(text(note, "date") || text(note, "created_at"))) / DAY;
  const recency = Number.isFinite(age) ? Math.max(0, 3 - age / 120) : 0;
  return { score: tags.length * 2 + recency + Math.min(2, body.length / 800), tags };
}

export function buildDigest(snapshot: Snapshot, now = Date.now()): Digest {
  const { matter, collections } = snapshot;
  const today = new Date(now).toISOString().slice(0, 10);
  const matterId = id(matter);
  const clientRecord = nested(matter, "client");
  const clientId = clientRecord ? id(clientRecord) : null;

  const facts: Fact[] = [];
  const flags: Fact[] = [];
  for (const field of (Array.isArray(matter.custom_field_values) ? matter.custom_field_values as ClioRecord[] : [])) {
    const label = text(field, "field_name"), type = text(field, "field_type");
    const raw = field.value;
    if (raw === null || raw === undefined || raw === "") continue;
    const source: Source = { kind: "matter", id: matterId, field: label };
    const value = type === "currency" && Number.isFinite(Number(raw)) ? `$${Number(raw).toLocaleString("en-US")}` : type === "checkbox" ? (raw === true || raw === "true" ? "Yes" : "No") : plainText(String(raw));
    (type === "checkbox" ? flags : facts).push({ label, value, type, source });
  }
  const find = (pattern: RegExp, types?: string[]) => facts.filter(f => pattern.test(f.label) && (!types || types.includes(f.type)));

  const costs: Money[] = [];
  let medicalCharges = 0, firmCosts = 0;
  for (const activity of collections.activities.records) {
    if (text(activity, "type") !== "ExpenseEntry") continue;
    const amount = amountOf(activity);
    const note = text(activity, "note");
    if (MEDICAL_CHARGE.test(note)) { medicalCharges += amount; continue; }
    firmCosts += amount;
    costs.push({ amount, label: firstLine(note), date: text(activity, "date"), source: { kind: "activities", id: id(activity) } });
  }

  const contactNames = collections.contacts.records.filter(c => !c.is_client).map(c => text(c, "name")).filter(Boolean);
  const clientName = clientRecord ? text(clientRecord, "name") : "";
  const tasks: TaskItem[] = collections.tasks.records.map(task => {
    const name = text(task, "name"), status = text(task, "status"), due = day(text(task, "due_at"));
    const open = status !== "complete";
    const provider = contactNames.find(n => mentions(name, n));
    const waitingOn = !open ? null : provider ?? (/\bclient\b/i.test(name) && /obtain|from|await|waiting|receive/i.test(name) ? clientName || "Client" : null);
    return {
      date: due, title: name, kind: "tasks", source: { kind: "tasks", id: id(task) }, detail: text(task, "description"),
      status, overdue: open && Boolean(due) && due < today, waitingOn, limitation: task.statute_of_limitations === true
    };
  });
  const openTasks = tasks.filter(t => t.status !== "complete").sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const horizon = new Date(now + 30 * DAY).toISOString().slice(0, 10);

  const events: DatedItem[] = collections.calendar.records.map(entry => ({
    date: text(entry, "start_at"), title: text(entry, "summary"), kind: "calendar", source: { kind: "calendar", id: id(entry) }, detail: text(entry, "description")
  }));
  const nowIso = new Date(now).toISOString();
  const upcomingEvents = events.filter(e => Date.parse(e.date) >= now).sort((a, b) => a.date.localeCompare(b.date));

  const comms: (DatedItem & { from: string[]; to: string[] })[] = collections.communications.records.map(c => ({
    date: text(c, "date") || text(c, "received_at") || text(c, "created_at"), title: text(c, "subject"), kind: "communications",
    source: { kind: "communications", id: id(c) }, detail: text(c, "body"),
    tags: [text(c, "type").replace(/Communication$/, "") || "Message"],
    from: parties(c, "senders").map(p => String(p.id)), to: parties(c, "receivers").map(p => String(p.id))
  }));
  const latest = <T extends DatedItem>(items: T[]) => items.reduce<T | null>((best, item) => !best || item.date > best.date ? item : best, null);
  const withClient = clientId ? comms.filter(c => c.from.includes(clientId) || c.to.includes(clientId)) : [];
  const lastClient = latest(withClient);
  const strip = (c: (typeof comms)[number] | null): DatedItem | null => c && { date: c.date, title: c.title, kind: c.kind, source: c.source, detail: c.detail, tags: c.tags };

  const notes: DatedItem[] = collections.notes.records.map(n => {
    const { tags } = scoreNote(n, now);
    return { date: text(n, "date") || day(text(n, "created_at")), title: text(n, "subject"), kind: "notes", source: { kind: "notes", id: id(n) }, detail: text(n, "detail"), tags };
  });
  const keyNotes = collections.notes.records
    .map((n, i) => ({ item: notes[i], score: scoreNote(n, now).score }))
    .sort((a, b) => b.score - a.score).slice(0, 10).map(x => x.item)
    .sort((a, b) => b.date.localeCompare(a.date));

  const docs = collections.documents.records.map(d => ({
    id: id(d), name: text(d, "name") || text(d, "filename"), category: documentCategory(text(d, "name") || text(d, "filename")),
    date: day(text(d, "received_at") || text(d, "created_at"))
  }));
  const docItems: DatedItem[] = docs.map(d => ({ date: d.date, title: d.name, kind: "documents", source: { kind: "documents", id: d.id }, tags: [d.category] }));

  const timeline = [...notes, ...comms.map(c => strip(c)!), ...events.filter(e => e.date <= nowIso), ...docItems,
    ...tasks.filter(t => t.status === "complete").map(t => ({ ...t, tags: ["task completed"] }))]
    .filter(item => item.date).sort((a, b) => b.date.localeCompare(a.date));
  const recentCutoff = new Date(now - 45 * DAY).toISOString();
  const recent = timeline.filter(item => item.date >= recentCutoff.slice(0, 10)).slice(0, 15);

  const providers: Provider[] = collections.contacts.records
    .filter(c => !c.is_client && PROVIDER_ROLE.test(text(c, "relationship_name")))
    .map(contact => {
      const name = text(contact, "name"), cid = id(contact), keys = nameKeys(name);
      const charges: Money[] = collections.activities.records
        .filter(a => text(a, "type") === "ExpenseEntry" && MEDICAL_CHARGE.test(text(a, "note")) && mentions(text(a, "note"), name))
        .map(a => ({ amount: amountOf(a), label: chargeLabel(text(a, "note")), date: text(a, "date"), source: { kind: "activities", id: id(a) } }));
      const documents = docs.filter(d => keys.some(k => slug(d.name).includes(k)) || mentions(d.name, name));
      const theirs = comms.filter(c => c.from.includes(cid) || c.to.includes(cid));
      return {
        id: cid, name, role: text(contact, "relationship_name"), source: { kind: "contacts", id: cid },
        charges, chargesTotal: charges.reduce((s, c) => s + c.amount, 0), documents,
        openRequests: openTasks.filter(t => t.waitingOn === name),
        appointments: events.filter(e => mentions(e.title, name) || mentions(e.detail ?? "", name)).sort((a, b) => a.date.localeCompare(b.date)),
        lastContact: strip(latest(theirs)), lastInbound: strip(latest(theirs.filter(c => c.from.includes(cid))))
      };
    });

  const grouped = new Map<string, { id: string; name: string; date: string }[]>();
  for (const d of docs) grouped.set(d.category, [...(grouped.get(d.category) ?? []), { id: d.id, name: d.name, date: d.date }]);

  return {
    generatedAt: new Date(now).toISOString(),
    client: clientRecord ? { name: clientName, dateOfBirth: text(clientRecord, "date_of_birth"), source: { kind: "contacts", id: id(clientRecord) } } : null,
    matter: {
      number: text(matter, "display_number"), description: text(matter, "description"),
      stage: nested(matter, "matter_stage") ? text(nested(matter, "matter_stage")!, "name") : "",
      status: text(matter, "status"), openDate: text(matter, "open_date"), lastActivity: text(matter, "last_activity_date")
    },
    kpis: {
      caseValue: find(/case value|estimated value|settlement value/i, ["currency"])[0] ?? find(/case value|estimated value/i)[0] ?? null,
      coverage: find(/policy limit|coverage|insurance carrier|insurer/i),
      specials: find(/special/i, ["currency"])[0] ?? find(/special/i)[0] ?? null,
      liens: find(/lien/i),
      firmCosts, medicalCharges
    },
    facts, flags,
    overdue: openTasks.filter(t => t.overdue),
    upcoming: openTasks.filter(t => !t.overdue && t.date && t.date <= horizon),
    waiting: openTasks.filter(t => t.waitingOn),
    limitation: tasks.filter(t => t.limitation),
    upcomingEvents,
    clientContact: {
      last: strip(lastClient),
      lastInbound: strip(latest(withClient.filter(c => clientId !== null && c.from.includes(clientId)))),
      daysSince: lastClient ? Math.floor((now - Date.parse(lastClient.date)) / DAY) : null
    },
    keyNotes, recent, timeline, costs, providers,
    documents: [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => ({ category, items: items.sort((a, b) => b.date.localeCompare(a.date)) }))
  };
}
