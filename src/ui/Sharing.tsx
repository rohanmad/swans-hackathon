"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Lock } from "lucide-react";
import { documentTitle, type Digest, type Provider } from "@/lib/digest";
import type { Share } from "@/lib/shares";
import { SectionHeader } from "./components/SectionHeader";
import { cx, fmtDate, fmtMoney } from "./lib/format";

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
const strip = (t: string) => t.replace(/^By medical provider:[^-]*-\s*/i, "");

function Check_({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-baseline gap-2.5 py-1.5 text-[13px] text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="translate-y-[2px] accent-[var(--color-swan)]" />
      <span className="min-w-0">{children}</span>
    </label>
  );
}
const area = "mt-1 mb-2 w-full rounded-[5px] border border-line bg-surface px-2.5 py-2 text-[13px] outline-none focus:border-line-strong";

export function Sharing({ digest, providerId, onPick }: { digest: Digest; providerId: string | null; onPick: (id: string) => void }) {
  const provider = digest.providers.find(p => p.id === providerId) ?? null;
  const [shares, setShares] = useState<Share[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/shares", { cache: "no-store" });
    if (res.ok) setShares((await res.json()).data);
  }, []);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => { setLink(null); setError(null); setCopied(false); setDraft(provider ? defaults(digest, provider) : null); }, [provider, digest]);

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
  async function revoke(id: string) { await fetch(`/api/shares/${id}`, { method: "DELETE" }); await load(); }

  const d = draft, p = provider;
  return (
    <div className="mx-auto max-w-[1400px] px-10 pt-7 pb-24">
      <h1 className="text-[26px] leading-none font-semibold tracking-[-0.025em]">Provider sharing</h1>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
        <Lock size={12} strokeWidth={1.8} /> Each update is a frozen snapshot you approve. Providers see only what you tick, never notes, strategy, valuation or other providers&apos; records.
      </p>

      <div className="mt-8 grid grid-cols-[240px_minmax(0,1fr)] gap-10">
        <div>
          <SectionHeader title="Providers" />
          <ul className="mt-1">
            {digest.providers.map(x => (
              <li key={x.id}>
                <button type="button" onClick={() => onPick(x.id)} className={cx("w-full rounded-[4px] px-2 py-2 text-left text-[13px] transition-colors", x.id === providerId ? "bg-ink/[0.055] font-medium text-ink" : "text-ink-2 hover:bg-ink/[0.03]")}>
                  {x.name}
                  <span className="block text-[11px] text-muted">{x.documents.length} records · {x.openRequests.length} requests</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {!p || !d ? <p className="pt-2 text-[13.5px] text-muted">Choose a provider to prepare an update.</p> : (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10">
              <div>
                <SectionHeader title={`Update for ${p.name}`} meta="Choose what to include" />
                <div className="mt-3">
                  <Check_ checked={d.status} onChange={() => setDraft({ ...d, status: !d.status })}>Case status</Check_>
                  {d.status && <textarea rows={2} className={area} value={d.statusNote} onChange={e => setDraft({ ...d, statusNote: e.target.value })} />}
                  <Check_ checked={d.coverage} onChange={() => setDraft({ ...d, coverage: !d.coverage })}>Coverage statement</Check_>
                  {d.coverage && <textarea rows={2} className={area} placeholder="e.g. Coverage confirmed." value={d.coverageText} onChange={e => setDraft({ ...d, coverageText: e.target.value })} />}
                  {p.charges.length > 0 && <Check_ checked={d.charges} onChange={() => setDraft({ ...d, charges: !d.charges })}>Their bills on file <span className="text-muted">· {fmtMoney(p.chargesTotal)}</span></Check_>}
                  {p.openRequests.length > 0 && <div className="label mt-4">What the firm needs from them</div>}
                  {p.openRequests.map(t => <Check_ key={t.source.id} checked={d.requests.includes(t.source.id)} onChange={() => setDraft({ ...d, requests: toggle(d.requests, t.source.id) })}>{strip(t.title)} <span className="text-muted">· due {fmtDate(t.date, true)}</span></Check_>)}
                  {p.appointments.length > 0 && <div className="label mt-4">Patient appointments</div>}
                  {p.appointments.map(a => <Check_ key={a.source.id} checked={d.appointments.includes(a.source.id)} onChange={() => setDraft({ ...d, appointments: toggle(d.appointments, a.source.id) })}>{fmtDate(a.date, true)} · {a.title}</Check_>)}
                  {p.documents.length > 0 && <div className="label mt-4">Their records and bills</div>}
                  {p.documents.map(doc => <Check_ key={doc.id} checked={d.documents.includes(doc.id)} onChange={() => setDraft({ ...d, documents: toggle(d.documents, doc.id) })}>{documentTitle(doc.name)} <span className="text-muted">· {doc.category}</span></Check_>)}
                  <div className="label mt-4">Message to the provider</div>
                  <textarea rows={3} className={area} placeholder="Optional note from the attorney" value={d.message} onChange={e => setDraft({ ...d, message: e.target.value })} />
                </div>
              </div>

              <div>
                <SectionHeader title="Preview" meta={`What ${p.name} will see`} />
                <div className="mt-3 rounded-[6px] border border-line bg-surface p-4 text-[13px] leading-relaxed">
                  <div className="label">Patient</div>
                  <div className="text-[15px] font-semibold">{digest.client?.name}</div>
                  {d.message && <p className="mt-3 rounded-[4px] border-l-2 border-swan bg-swan-soft/50 px-3 py-2 whitespace-pre-wrap">{d.message}</p>}
                  {d.status && <p className="mt-3"><span className="label mr-2">Status</span>{d.statusNote}</p>}
                  {d.coverage && d.coverageText && <p className="mt-2"><span className="label mr-2">Coverage</span>{d.coverageText}</p>}
                  {d.charges && p.charges.length > 0 && <p className="mt-2"><span className="label mr-2">Bills</span>{p.charges.length} on file · {fmtMoney(p.chargesTotal)}</p>}
                  {d.requests.length > 0 && <p className="mt-2"><span className="label mr-2">Requests</span>{d.requests.length}</p>}
                  {d.appointments.length > 0 && <p className="mt-2"><span className="label mr-2">Appointments</span>{d.appointments.length}</p>}
                  {d.documents.length > 0 && <p className="mt-2"><span className="label mr-2">Documents</span>{d.documents.length}</p>}
                </div>
                <button type="button" onClick={publish} disabled={busy} className="mt-4 rounded-[5px] bg-ink px-4 py-2 text-[13px] text-paper transition-opacity hover:opacity-90 disabled:opacity-50">
                  {busy ? "Publishing…" : "Approve and publish"}
                </button>
                {error && <p className="mt-2 text-[12.5px] text-high">{error}</p>}
                {link && (
                  <div className="animate-fade-in mt-4 rounded-[6px] border border-ok/30 bg-ok-soft/60 p-3">
                    <div className="text-[12.5px] font-medium text-ok">Published. Send this private link to the provider; it is shown only once.</div>
                    <div className="mt-2 flex items-center gap-2">
                      <input readOnly value={link} onFocus={e => e.target.select()} className="min-w-0 flex-1 rounded-[4px] border border-line bg-surface px-2 py-1 font-mono text-[11px]" />
                      <button type="button" onClick={() => { void navigator.clipboard.writeText(link); setCopied(true); }} className="flex items-center gap-1 rounded-[4px] border border-line bg-surface px-2 py-1 text-[11.5px]">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}</button>
                      <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-[4px] border border-line bg-surface px-2 py-1 text-[11.5px]">Open <ExternalLink size={11} /></a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {shares.length > 0 && (
            <div className="mt-12">
              <SectionHeader title="Shared updates" meta={`${shares.filter(s => !s.revokedAt).length} active`} />
              <table className="mt-1 w-full text-[13px]">
                <thead><tr className="border-b border-line text-left"><th className="label py-2 font-normal">Provider</th><th className="label py-2 font-normal">Published</th><th className="label py-2 font-normal">Includes</th><th className="label py-2 font-normal">Opened</th><th /></tr></thead>
                <tbody>
                  {shares.map(s => (
                    <tr key={s.id} className={cx("border-b border-line/70", s.revokedAt && "opacity-50")}>
                      <td className="py-2.5">{s.providerName}</td>
                      <td className="tabular py-2.5 text-ink-2">{fmtDate(s.createdAt, true)}</td>
                      <td className="py-2.5 text-[12px] text-muted">{[s.content.status && "status", s.content.coverage && "coverage", s.content.charges && "bills", s.content.requests && `${s.content.requests.length} requests`, s.content.appointments && `${s.content.appointments.length} appointments`, s.content.documents && `${s.content.documents.length} documents`].filter(Boolean).join(" · ")}</td>
                      <td className="py-2.5">{s.views ? <span className="text-ok">{s.views}× · last {new Date(s.lastViewedAt!).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span> : <span className="text-muted">Not yet opened</span>}</td>
                      <td className="py-2.5 text-right">{s.revokedAt ? <span className="text-[12px] text-muted">Revoked</span> : <button type="button" onClick={() => revoke(s.id)} className="rounded-[4px] border border-line px-2 py-0.5 text-[11.5px] text-ink-2 hover:border-high/40 hover:text-high">Revoke</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
