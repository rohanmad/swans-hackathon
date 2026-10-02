import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { documentTitle } from "@/lib/digest";
import { openShare } from "@/lib/shares";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Case update", robots: { index: false, follow: false } };

const date = (value: string) => value ? new Date(value.length === 10 ? value + "T12:00:00" : value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ProviderShare({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const opened = openShare(token, true);
  if (!opened) notFound();
  const v = opened.share.content;
  const now = new Date().toISOString();
  const upcoming = v.appointments?.filter(a => a.date >= now) ?? [];
  const past = v.appointments?.filter(a => a.date < now) ?? [];

  return (
    <main className="provider">
      <p className="eyebrow">Secure case update for {v.providerName}</p>
      <h1>Patient: {v.patientName}</h1>
      <p className="muted">Published by the firm on {date(v.publishedAt)}. This page shows only what the attorney approved for your office.</p>

      {v.message && <section className="callout"><h2>Message from the firm</h2><p className="pre">{v.message}</p></section>}

      <div className="grid">
        {v.status && (
          <section>
            <h2>Case status</h2>
            <dl>
              <dt>Case</dt><dd>{v.status.caseStatus === "Open" ? "Active" : v.status.caseStatus}</dd>
              {v.status.stage && <><dt>Stage</dt><dd>{v.status.stage}</dd></>}
              {v.status.lastActivity && <><dt>Last activity</dt><dd>{date(v.status.lastActivity)}</dd></>}
            </dl>
            {v.status.note && <p className="pre">{v.status.note}</p>}
          </section>
        )}
        {v.coverage && <section><h2>Coverage</h2><p className="pre">{v.coverage}</p></section>}
      </div>

      {v.requests && (
        <section>
          <h2>What the firm needs from your office</h2>
          <ul className="list">{v.requests.map((r, i) => <li key={i}><span className={r.overdue ? "pill bad" : "pill"}>{r.overdue ? "Overdue" : "Due"} {date(r.due)}</span> {r.title.replace(/^By medical provider:[^-]*-\s*/i, "")}</li>)}</ul>
        </section>
      )}

      {v.appointments && (
        <section>
          <h2>Patient appointments with your office</h2>
          {upcoming.length > 0 && <><h3>Upcoming</h3><ul className="list">{upcoming.map((a, i) => <li key={i}><b>{date(a.date)}</b> {a.title}</li>)}</ul></>}
          {past.length > 0 && <><h3>Past</h3><ul className="list">{past.map((a, i) => <li key={i}><b>{date(a.date)}</b> {a.title}</li>)}</ul></>}
        </section>
      )}

      {v.charges && (
        <section>
          <h2>Your bills on file with the firm</h2>
          <table><tbody>
            {v.charges.map((c, i) => <tr key={i}><td>{date(c.date)}</td><td>{c.label}</td><td className="num">{usd(c.amount)}</td></tr>)}
            <tr><td /><td><b>Total</b></td><td className="num"><b>{usd(v.charges.reduce((s, c) => s + c.amount, 0))}</b></td></tr>
          </tbody></table>
        </section>
      )}

      {v.documents && (
        <section>
          <h2>Records and bills shared with you</h2>
          <ul className="list">{v.documents.map(d => <li key={d.id}><a href={`/api/share/${token}/documents/${d.id}`} target="_blank" rel="noreferrer">{documentTitle(d.name)}</a> <span className="muted">· {d.category} · {date(d.date)}</span></li>)}</ul>
        </section>
      )}
    </main>
  );
}
