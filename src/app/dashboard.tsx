"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { documentTitle, type DatedItem, type Digest, type Fact, type Provider, type Source, type TaskItem } from "@/lib/digest";
import { nested, plainText, text, type ClioRecord, type Snapshot } from "@/lib/types";
import { fmtDate, usd } from "./format";
import { SharePanel } from "./share-panel";
const KIND_LABEL: Record<string, string> = { notes: "Note", communications: "Communication", calendar: "Calendar", documents: "Document", tasks: "Task", activities: "Expense", contacts: "Contact", matter: "Matter field" };

function recordFor(snapshot: Snapshot, source: Source): ClioRecord | null {
  if (source.kind === "matter") return snapshot.matter;
  return snapshot.collections[source.kind]?.records.find(r => String(r.id) === source.id) ?? null;
}
const ageFrom = (dob: string) => {
  const d = new Date(dob + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86_400_000));
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

function Evidence({ snapshot, source, onClose }: { snapshot: Snapshot; source: Source; onClose: () => void }) {
  const record = recordFor(snapshot, source);
  const body = (() => {
    if (!record) return "";
    if (source.kind === "matter" && source.field) {
      const field = (record.custom_field_values as ClioRecord[] | undefined)?.find(f => text(f, "field_name") === source.field);
      return field ? plainText(String(field.value ?? "")) : "";
    }
    return plainText(text(record, "detail") || text(record, "body") || text(record, "description") || text(record, "note") || "");
  })();
  const title = source.kind === "matter" ? source.field ?? text(record ?? { id: 0 }, "display_number") : text(record ?? { id: 0 }, "subject") || text(record ?? { id: 0 }, "name") || text(record ?? { id: 0 }, "summary") || "Record";
  const date = record && (text(record, "date") || text(record, "start_at") || text(record, "due_at") || text(record, "received_at"));
  const people = (key: string) => record && Array.isArray(record[key]) ? (record[key] as ClioRecord[]).map(p => text(p, "name") || text(p, "identifier")).join(", ") : "";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()} aria-label="Source record">
        <div className="row spread"><span className="pill">{KIND_LABEL[source.kind]} · Clio ID {source.id}</span><button className="secondary" onClick={onClose}>Close</button></div>
        <h2>{title}</h2>
        {!record ? <p className="error">This record is not in the imported snapshot.</p> : <>
          <dl className="meta">
            {date && <><dt>Date</dt><dd>{fmtDate(date)}</dd></>}
            {people("senders") && <><dt>From</dt><dd>{people("senders")}</dd></>}
            {people("receivers") && <><dt>To</dt><dd>{people("receivers")}</dd></>}
            {source.kind === "matter" && <><dt>Source</dt><dd>Custom field on matter {text(record, "display_number")}</dd></>}
            {source.kind !== "matter" && text(record, "type") && <><dt>Type</dt><dd>{text(record, "type")}</dd></>}
            {source.kind !== "matter" && text(record, "status") && <><dt>Status</dt><dd>{text(record, "status")}</dd></>}
            {nested(record, "author") && <><dt>Author</dt><dd>{text(nested(record, "author")!, "name")}</dd></>}
            {source.kind === "contacts" && <><dt>Role</dt><dd>{text(record, "relationship_name")}</dd><dt>Email</dt><dd>{text(record, "primary_email_address") || "—"}</dd><dt>Phone</dt><dd>{text(record, "primary_phone_number") || "—"}</dd></>}
            {source.kind === "activities" && <><dt>Amount</dt><dd>{usd(Number(record.total ?? Number(record.price) * Number(record.quantity ?? 1)) || 0)}</dd></>}
          </dl>
          {body ? <p className="pre source-text">{body}</p> : source.kind !== "documents" && <p className="muted">No text body on this record.</p>}
          {source.kind === "documents" && <a className="button" href={`/api/clio/documents/${source.id}`} target="_blank" rel="noreferrer">Open document from Clio</a>}
        </>}
      </aside>
    </div>
  );
}

function Item({ item, open, isNew }: { item: DatedItem; open: (s: Source) => void; isNew?: boolean }) {
  return (
    <li>
      <button className="link" onClick={() => open(item.source)}>
        <span className="date">{fmtDate(item.date)}</span>
        <span className={`kind k-${item.kind}`}>{KIND_LABEL[item.kind]}</span>
        <span className="title">{item.title}</span>
        {isNew && <span className="pill new">New</span>}
        {item.tags?.map(t => <span key={t} className="tag">{t}</span>)}
      </button>
    </li>
  );
}

function TaskRow({ task, open }: { task: TaskItem; open: (s: Source) => void }) {
  return (
    <li>
      <button className="link" onClick={() => open(task.source)}>
        <span className={task.overdue ? "pill bad" : "pill"}>{task.overdue ? "Overdue" : "Due"} {fmtDate(task.date)}</span>
        <span className="title">{task.title}</span>
        {task.waitingOn && <span className="tag">waiting on {task.waitingOn}</span>}
      </button>
    </li>
  );
}

function Kpi({ label, value, sub, onClick }: { label: string; value: string; sub?: string; onClick?: () => void }) {
  return (
    <button className="kpi" onClick={onClick} disabled={!onClick}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </button>
  );
}

export function Dashboard({ snapshot, digest }: { snapshot: Snapshot; digest: Digest }) {
  const [source, setSource] = useState<Source | null>(null);
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [shareFor, setShareFor] = useState<Provider | null>(null);
  const [mode, setMode] = useState<"brief" | "full">("brief");

  const visitRecorded = useRef(false);
  useEffect(() => {
    if (visitRecorded.current) return;
    visitRecorded.current = true;
    const key = `casebrief:lastVisit:${snapshot.matter.id}`;
    setLastVisit(localStorage.getItem(key));
    localStorage.setItem(key, new Date().toISOString());
  }, [snapshot.matter.id]);
  const isNew = (s: Source) => {
    if (!lastVisit) return false;
    const r = recordFor(snapshot, s);
    return Boolean(r && text(r, "updated_at") && Date.parse(text(r, "updated_at")) > Date.parse(lastVisit));
  };
  const changed = useMemo(() => lastVisit ? digest.timeline.filter(i => isNew(i.source)) : [], [lastVisit, digest]); // eslint-disable-line react-hooks/exhaustive-deps

  const fact = (pattern: RegExp) => digest.facts.find(f => pattern.test(f.label));
  const incident = fact(/date of (incident|loss|accident)|incident date|accident date/i);
  const summary = fact(/case summary|summary/i);
  const policy = digest.kpis.coverage.find(f => /limit/i.test(f.label)) ?? digest.kpis.coverage[0];
  const coverageConfirmed = digest.flags.find(f => /limit|coverage/i.test(f.label));
  const open = (s: Source) => setSource(s);
  const age = digest.client ? ageFrom(digest.client.dateOfBirth) : null;
  const timeline = digest.timeline.filter(i => (kindFilter === "all" || i.kind === kindFilter) && (!query || `${i.title} ${i.detail ?? ""}`.toLowerCase().includes(query.toLowerCase())));
  const factLine = (f: Fact) => <tr key={f.label}><th>{f.label}</th><td><button className="link block" onClick={() => open(f.source)}><span className="pre clamp">{f.value}</span></button></td></tr>;

  return (
    <>
      <section className="hero">
        <div className="avatar" aria-hidden>{digest.client ? initials(digest.client.name) : "?"}</div>
        <div className="hero-main">
          <h1>{digest.client?.name ?? digest.matter.description}</h1>
          <p className="muted">
            {digest.matter.number} · {digest.matter.stage || "No stage"} · {digest.matter.status}
            {age !== null && <> · Age {age}</>}
            {incident && <> · Incident <button className="link inline" onClick={() => open(incident.source)}>{fmtDate(incident.value.length === 10 ? incident.value : incident.value)}</button></>}
            {" "}· Opened {fmtDate(digest.matter.openDate)}
          </p>
          {summary && <p className="summary"><button className="link inline" onClick={() => open(summary.source)}>{summary.value}</button></p>}
        </div>
        <div className="mode">
          <button className={mode === "brief" ? "" : "secondary"} onClick={() => setMode("brief")}>2-minute brief</button>
          <button className={mode === "full" ? "" : "secondary"} onClick={() => setMode("full")}>Everything</button>
        </div>
      </section>

      <div className="kpis">
        <Kpi label="Case value (recorded)" value={digest.kpis.caseValue?.value ?? "Not recorded"} onClick={digest.kpis.caseValue ? () => open(digest.kpis.caseValue!.source) : undefined} />
        <Kpi label="Coverage" value={policy ? policy.value.split("\n")[0] : "Not recorded"} sub={coverageConfirmed ? `${coverageConfirmed.label}: ${coverageConfirmed.value}` : policy?.value.split("\n").slice(1).join(" · ")} onClick={policy ? () => open(policy.source) : undefined} />
        <Kpi label="Medical specials" value={digest.kpis.specials?.value ?? usd(digest.kpis.medicalCharges)} sub={`${usd(digest.kpis.medicalCharges)} in itemised provider charges`} onClick={digest.kpis.specials ? () => open(digest.kpis.specials!.source) : undefined} />
        <Kpi label="Firm has spent" value={usd(digest.kpis.firmCosts)} sub={`${digest.costs.length} case expenses`} onClick={() => document.getElementById("costs")?.scrollIntoView({ behavior: "smooth" })} />
        <Kpi label="Last client contact" value={digest.clientContact.daysSince === null ? "None found" : `${digest.clientContact.daysSince} days ago`} sub={digest.clientContact.lastInbound ? `Client last reached out ${fmtDate(digest.clientContact.lastInbound.date)}` : undefined} onClick={digest.clientContact.last ? () => open(digest.clientContact.last!.source) : undefined} />
      </div>

      {lastVisit && (
        <section>
          <h2>Changed since your last visit <span className="muted small">({fmtDate(lastVisit)})</span></h2>
          {changed.length ? <ul className="items">{changed.slice(0, 15).map(i => <Item key={i.kind + i.source.id} item={i} open={open} />)}</ul> : <p className="muted">Nothing in Clio has changed since you last opened this matter.</p>}
        </section>
      )}

      <div className="grid">
        <section>
          <h2>Needs attention</h2>
          {digest.limitation.map(t => (
            <p key={t.source.id} className={t.status === "complete" ? "ok" : "error"}>
              <button className="link inline" onClick={() => open(t.source)}>Statute of limitations {fmtDate(t.date)}: {t.status === "complete" ? "satisfied" : "OPEN"}</button>
            </p>
          ))}
          <h3>Overdue ({digest.overdue.length})</h3>
          {digest.overdue.length ? <ul className="items">{digest.overdue.map(t => <TaskRow key={t.source.id} task={t} open={open} />)}</ul> : <p className="muted">Nothing overdue.</p>}
          <h3>Due in the next 30 days ({digest.upcoming.length})</h3>
          {digest.upcoming.length ? <ul className="items">{digest.upcoming.map(t => <TaskRow key={t.source.id} task={t} open={open} />)}</ul> : <p className="muted">Nothing due.</p>}
          <h3>Waiting on someone else ({digest.waiting.length})</h3>
          {digest.waiting.length ? <ul className="items">{digest.waiting.map(t => <li key={t.source.id}><button className="link" onClick={() => open(t.source)}><span className="tag">{t.waitingOn}</span><span className="title">{t.title.replace(/^By medical provider:[^-]*-\s*/i, "")}</span></button></li>)}</ul> : <p className="muted">No open requests.</p>}
        </section>
        <section>
          <h2>Coming up</h2>
          {digest.upcomingEvents.length ? <ul className="items">{digest.upcomingEvents.slice(0, mode === "brief" ? 6 : 50).map(e => <Item key={e.source.id} item={e} open={open} />)}</ul> : <p className="muted">No upcoming calendar entries.</p>}
        </section>
      </div>

      <div className="grid">
        <section>
          <h2>What happened recently</h2>
          <ul className="items">{digest.recent.slice(0, mode === "brief" ? 8 : 15).map(i => <Item key={i.kind + i.source.id} item={i} open={open} isNew={isNew(i.source)} />)}</ul>
        </section>
        <section>
          <h2>The {digest.keyNotes.length} notes that matter <span className="muted small">of {snapshot.collections.notes.records.length}</span></h2>
          <ul className="items">{digest.keyNotes.slice(0, mode === "brief" ? 6 : 10).map(i => <Item key={i.source.id} item={i} open={open} />)}</ul>
          <p className="muted small">Ranked by recency and signals: coverage, surgery, liens, deadlines, negotiation, value, liability, risk, open issues.</p>
        </section>
      </div>

      <section>
        <h2>Medical providers</h2>
        <table className="providers">
          <thead><tr><th>Provider</th><th>Bills on file</th><th>Records / bills</th><th>Open requests</th><th>Last heard from</th><th /></tr></thead>
          <tbody>
            {digest.providers.map(p => (
              <tr key={p.id}>
                <td><button className="link block" onClick={() => open(p.source)}><b>{p.name}</b><br /><span className="muted small">{p.role}</span></button></td>
                <td className="num">{p.charges.length ? <button className="link inline" onClick={() => open(p.charges[0].source)}>{usd(p.chargesTotal)}</button> : "—"}</td>
                <td>{p.documents.length || "—"}</td>
                <td>{p.openRequests.length ? p.openRequests.map(t => <button key={t.source.id} className="link inline" onClick={() => open(t.source)}><span className={t.overdue ? "pill bad" : "pill"}>{t.overdue ? "Overdue" : "Due"} {fmtDate(t.date)}</span></button>) : "—"}</td>
                <td>{p.lastInbound ? <button className="link inline" onClick={() => open(p.lastInbound!.source)}>{fmtDate(p.lastInbound.date)}</button> : <span className="muted">never</span>}</td>
                <td><button className="secondary small-btn" onClick={() => setShareFor(p)}>Share update</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <SharePanel digest={digest} provider={shareFor} onClose={() => setShareFor(null)} onPick={setShareFor} />

      {mode === "full" && <>
        <div className="grid">
          <section>
            <h2>Case facts from Clio</h2>
            <table className="facts"><tbody>{digest.facts.map(factLine)}{digest.flags.map(factLine)}</tbody></table>
          </section>
          <section id="costs">
            <h2>Firm case expenses · {usd(digest.kpis.firmCosts)}</h2>
            <table><tbody>{digest.costs.map(c => <tr key={c.source.id}><td>{fmtDate(c.date)}</td><td><button className="link block" onClick={() => open(c.source)}>{c.label}</button></td><td className="num">{usd(c.amount)}</td></tr>)}</tbody></table>
            <p className="muted small">Firm-paid costs only. Provider treatment charges ({usd(digest.kpis.medicalCharges)}) are counted separately under medical specials.</p>
          </section>
        </div>

        <section>
          <div className="row spread">
            <h2>Full timeline · {timeline.length} entries</h2>
            <div className="row">
              <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} className="narrow">
                <option value="all">All sources</option>
                {["notes", "communications", "calendar", "documents", "tasks"].map(k => <option key={k} value={k}>{KIND_LABEL[k]}s</option>)}
              </select>
              <input placeholder="Search the case…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
          <ul className="items">{timeline.map(i => <Item key={i.kind + i.source.id} item={i} open={open} isNew={isNew(i.source)} />)}</ul>
        </section>

        <section>
          <h2>Documents · {digest.documents.reduce((n, g) => n + g.items.length, 0)}</h2>
          <div className="doc-groups">
            {digest.documents.map(g => (
              <div key={g.category}>
                <h3>{g.category} ({g.items.length})</h3>
                <ul className="plain">{g.items.map(d => <li key={d.id}><button className="link inline" onClick={() => open({ kind: "documents", id: d.id })}>{documentTitle(d.name)}</button> <span className="muted small">{fmtDate(d.date)}</span></li>)}</ul>
              </div>
            ))}
          </div>
        </section>
      </>}

      {mode === "brief" && <p className="center"><button className="secondary" onClick={() => setMode("full")}>Show everything: case facts, expenses, full timeline, documents</button></p>}

      {source && <Evidence snapshot={snapshot} source={source} onClose={() => setSource(null)} />}
    </>
  );
}
