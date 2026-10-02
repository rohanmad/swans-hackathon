"use client";
import { useCallback, useEffect, useState } from "react";
import { documentTitle, type Digest, type Provider } from "@/lib/digest";
import type { Share } from "@/lib/shares";
import { fmtDate, usd } from "./format";

type Draft = {
  status: boolean; statusNote: string; coverage: boolean; coverageText: string; message: string; charges: boolean;
  documents: string[]; requests: string[]; appointments: string[];
};

function defaults(digest: Digest, p: Provider): Draft {
  const confirmed = digest.flags.find(f => /limit|coverage/i.test(f.label) && f.value === "Yes");
  return {
    status: true,
    statusNote: `The case is ${digest.matter.status === "Open" ? "active" : digest.matter.status.toLowerCase()}${digest.matter.stage ? ` and in the ${digest.matter.stage.toLowerCase()} stage` : ""}.`,
    coverage: Boolean(confirmed), coverageText: confirmed ? "Insurance coverage on this claim has been confirmed by the firm." : "",
    message: "", charges: p.charges.length > 0,
    documents: p.documents.map(d => d.id), requests: p.openRequests.map(t => t.source.id), appointments: p.appointments.map(a => a.source.id)
  };
}
const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

export function SharePanel({ digest, provider, onClose, onPick }: { digest: Digest; provider: Provider | null; onClose: () => void; onPick: (p: Provider) => void }) {
  const [shares, setShares] = useState<Share[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/shares", { cache: "no-store" });
    if (res.ok) setShares((await res.json()).data);
  }, []);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 10_000); return () => clearInterval(t); }, [load]);
  useEffect(() => { setLink(null); setError(null); setDraft(provider ? defaults(digest, provider) : null); }, [provider, digest]);

  async function publish() {
    if (!provider || !draft) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/shares", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId: provider.id, ...draft }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not publish.");
      setLink(new URL(body.path, window.location.origin).href);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not publish."); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    await load();
  }

  const d = draft, p = provider;
  return (
    <section id="sharing">
      <h2>Provider sharing</h2>
      <p className="muted small">Each update is a frozen snapshot that you approve. Providers see only the items you tick, never notes, strategy, valuation or other providers&apos; records.</p>

      {p && d && (
        <div className="composer">
          <div className="row spread"><h3>New update for {p.name}</h3><button className="secondary" onClick={onClose}>Cancel</button></div>
          <div className="grid">
            <div>
              <label className="check"><input type="checkbox" checked={d.status} onChange={e => setDraft({ ...d, status: e.target.checked })} /> Case status</label>
              {d.status && <textarea value={d.statusNote} onChange={e => setDraft({ ...d, statusNote: e.target.value })} rows={2} />}
              <label className="check"><input type="checkbox" checked={d.coverage} onChange={e => setDraft({ ...d, coverage: e.target.checked })} /> Coverage statement</label>
              {d.coverage && <textarea value={d.coverageText} placeholder="e.g. Coverage confirmed." onChange={e => setDraft({ ...d, coverageText: e.target.value })} rows={2} />}
              {p.charges.length > 0 && <label className="check"><input type="checkbox" checked={d.charges} onChange={e => setDraft({ ...d, charges: e.target.checked })} /> Their bills on file ({usd(p.chargesTotal)})</label>}
              {p.openRequests.length > 0 && <h4>What we need from them</h4>}
              {p.openRequests.map(t => <label key={t.source.id} className="check"><input type="checkbox" checked={d.requests.includes(t.source.id)} onChange={() => setDraft({ ...d, requests: toggle(d.requests, t.source.id) })} /> {t.title.replace(/^By medical provider:[^-]*-\s*/i, "")} <span className="muted small">due {fmtDate(t.date)}</span></label>)}
              {p.appointments.length > 0 && <h4>Patient appointments</h4>}
              {p.appointments.map(a => <label key={a.source.id} className="check"><input type="checkbox" checked={d.appointments.includes(a.source.id)} onChange={() => setDraft({ ...d, appointments: toggle(d.appointments, a.source.id) })} /> {fmtDate(a.date)} · {a.title}</label>)}
              {p.documents.length > 0 && <h4>Their records and bills</h4>}
              {p.documents.map(doc => <label key={doc.id} className="check"><input type="checkbox" checked={d.documents.includes(doc.id)} onChange={() => setDraft({ ...d, documents: toggle(d.documents, doc.id) })} /> {documentTitle(doc.name)} <span className="muted small">{doc.category}</span></label>)}
              <h4>Message to the provider</h4>
              <textarea value={d.message} onChange={e => setDraft({ ...d, message: e.target.value })} rows={3} placeholder="Optional note from the attorney" />
            </div>
            <div className="preview">
              <p className="eyebrow">Preview: what {p.name} will see</p>
              <p><b>Patient:</b> {digest.client?.name}</p>
              {d.message && <p className="pre">{d.message}</p>}
              {d.status && <p><b>Status:</b> {d.statusNote}</p>}
              {d.coverage && d.coverageText && <p><b>Coverage:</b> {d.coverageText}</p>}
              {d.charges && p.charges.length > 0 && <p><b>Bills:</b> {p.charges.length} on file, {usd(p.chargesTotal)}</p>}
              {d.requests.length > 0 && <p><b>Requests:</b> {d.requests.length}</p>}
              {d.appointments.length > 0 && <p><b>Appointments:</b> {d.appointments.length}</p>}
              {d.documents.length > 0 && <p><b>Documents:</b> {d.documents.length}</p>}
              <button onClick={publish} disabled={busy}>Approve and publish</button>
              {error && <p className="error">{error}</p>}
              {link && <div className="link-box"><p className="ok">Published. Send this private link to the provider. It is shown only once.</p><input readOnly value={link} onFocus={e => e.target.select()} /><a href={link} target="_blank" rel="noreferrer">Open provider view</a></div>}
            </div>
          </div>
        </div>
      )}

      {!p && <p className="muted small">Choose &quot;Share update&quot; next to a provider above{digest.providers[0] && <>, e.g. <button className="link inline" onClick={() => onPick(digest.providers[0])}>{digest.providers[0].name}</button></>}.</p>}

      {shares.length > 0 && (
        <table>
          <thead><tr><th>Shared with</th><th>Published</th><th>Includes</th><th>Opened</th><th /></tr></thead>
          <tbody>
            {shares.map(s => (
              <tr key={s.id} className={s.revokedAt ? "revoked" : ""}>
                <td>{s.providerName}</td>
                <td>{fmtDate(s.createdAt)}</td>
                <td className="small">{[s.content.status && "status", s.content.coverage && "coverage", s.content.charges && "bills", s.content.requests && `${s.content.requests.length} requests`, s.content.appointments && `${s.content.appointments.length} appointments`, s.content.documents && `${s.content.documents.length} documents`].filter(Boolean).join(", ")}</td>
                <td>{s.views ? <>{s.views}× · last {new Date(s.lastViewedAt!).toLocaleString()}</> : <span className="muted">Not yet opened</span>}</td>
                <td>{s.revokedAt ? <span className="muted">Revoked</span> : <button className="secondary small-btn" onClick={() => revoke(s.id)}>Revoke</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
