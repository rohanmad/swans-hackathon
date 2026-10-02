"use client";
import { ArrowUpRight, Lock } from "lucide-react";
import type { ProviderView } from "@/lib/shares";
import { SectionHeader } from "../components/SectionHeader";
import { SwanMark } from "../components/SwanMark";
import { cx, fmtDate, fmtMoney } from "../lib/format";

type Doc = NonNullable<ProviderView["documents"]>[number] & { title: string; href: string };

export function ProviderPortal({ view, documents }: { view: ProviderView; documents: Doc[] }) {
  const caseLabel = view.status ? (view.status.caseStatus === "Open" ? "Active" : view.status.caseStatus) : null;
  return (
    <div className="flex min-h-screen min-w-[1100px]">
      <aside className="sticky top-0 flex h-screen w-[212px] shrink-0 flex-col border-r border-line bg-paper-2/60 px-3 py-5">
        <div className="mb-7 px-2.5">
          <div className="flex items-center gap-2">
            <SwanMark />
            <span className="text-[14px] font-semibold tracking-[0.18em]">SWANS</span>
          </div>
          <div className="mt-1 pl-[26px] text-[11.5px] text-muted">Provider update</div>
        </div>
        <div className="px-2.5">
          <div className="label">Prepared for</div>
          <div className="mt-1.5 text-[13px] font-medium text-ink">{view.providerName}</div>
          <div className="text-[11.5px] text-muted">Published {fmtDate(view.publishedAt, true)}</div>
        </div>
        <div className="mt-auto border-t border-line px-2.5 pt-4">
          <div className="flex items-start gap-1.5 text-[11px] leading-snug text-muted">
            <Lock size={11} strokeWidth={1.8} className="mt-[2px] shrink-0" />
            Shared by the law firm handling this case. Only what the attorney approved for your office.
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
          <div className="flex items-start justify-between gap-6 px-10 pt-5 pb-4">
            <div>
              <div className="label">Patient</div>
              <h1 className="mt-1 text-[17px] font-semibold tracking-[0.04em] uppercase">{view.patientName}</h1>
              {view.status?.stage && <div className="mt-1.5 text-[12.5px] text-ink-2"><span className="text-muted">Stage</span> {view.status.stage}</div>}
            </div>
            {caseLabel && (
              <div className="text-right">
                <div className="label">Case status</div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-[3px] border border-ok/25 bg-ok-soft px-1.5 py-[1px] font-mono text-[10px] tracking-[0.08em] text-ok uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                  Case {caseLabel}
                </div>
                {view.status?.lastActivity && <div className="mt-1 text-[11.5px] text-muted">Last activity {fmtDate(view.status.lastActivity, true)}</div>}
              </div>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-[1100px] px-10 pt-8 pb-24">
          {view.message && (
            <section className="rounded-[6px] border border-swan/20 bg-swan-soft/60 px-5 py-4">
              <div className="label text-swan">Message from the firm</div>
              <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-wrap text-ink">{view.message}</p>
            </section>
          )}

          <div className="mt-10 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12 max-[1240px]:gap-8">
            <div className="space-y-12">
              {view.requests && view.requests.length > 0 && (
                <section>
                  <SectionHeader title="What the firm needs from your office" meta={`${view.requests.length} open`} />
                  <ul>
                    {view.requests.map((r, i) => (
                      <li key={i} className="grid grid-cols-[96px_1fr] items-baseline gap-3 border-b border-line py-2.5">
                        <span className={cx("tabular font-mono text-[10.5px] uppercase", r.overdue ? "text-high" : "text-muted")}>{r.overdue ? "Overdue" : "Due"} {fmtDate(r.due)}</span>
                        <span className="text-[13px] leading-snug text-ink">{r.title.replace(/^By medical provider:[^-]*-\s*/i, "")}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {documents.length > 0 && <Records documents={documents} officeName={view.providerName} />}
              {view.appointments && view.appointments.length > 0 && <Appointments items={view.appointments} />}
            </div>
            <div className="space-y-12">
              {view.charges && view.charges.length > 0 && <Bills charges={view.charges} />}
              {view.status?.note && (
                <section>
                  <SectionHeader title="Case update" />
                  <p className="py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">{view.status.note}</p>
                </section>
              )}
              {view.coverage && (
                <section>
                  <SectionHeader title="Coverage" />
                  <p className="py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">{view.coverage}</p>
                </section>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Records({ documents, officeName }: { documents: Doc[]; officeName: string }) {
  const groups = [...new Set(documents.map(d => d.category))];
  return (
    <section>
      <SectionHeader title="Records" meta={`${documents.length} shared with your office`} />
      <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted">
        <Lock size={11} strokeWidth={1.8} />
        Documents shared with {officeName}. Other case documents are not visible to your office.
      </div>
      {groups.map(g => (
        <div key={g} className="mt-5">
          <div className="text-[12px] font-semibold tracking-[0.08em] uppercase">{g}</div>
          <ul className="mt-1 divide-y divide-line border-y border-line">
            {documents.filter(d => d.category === g).map(d => (
              <li key={d.id}>
                <a href={d.href} target="_blank" rel="noreferrer" className="group grid grid-cols-[1fr_auto_auto] items-baseline gap-4 py-2 hover:bg-surface">
                  <span className="min-w-0 truncate text-[13px] text-ink group-hover:text-swan">{d.title}</span>
                  <span className="tabular font-mono text-[10.5px] text-muted">{fmtDate(d.date)}</span>
                  <ArrowUpRight size={12} className="text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Appointments({ items }: { items: NonNullable<ProviderView["appointments"]> }) {
  const now = new Date().toISOString();
  const upcoming = items.filter(a => a.date >= now);
  const past = items.filter(a => a.date < now).reverse();
  return (
    <section>
      <SectionHeader title="Appointments with your office" meta={`${upcoming.length} upcoming · ${past.length} past`} />
      {[["Upcoming", upcoming], ["Past", past]].map(([label, list]) => (list as typeof items).length > 0 && (
        <div key={label as string} className="mt-4">
          <div className="label mb-1">{label as string}</div>
          <ul>
            {(list as typeof items).map((a, i) => (
              <li key={i} className="grid grid-cols-[96px_1fr] items-baseline gap-3 border-b border-line py-2">
                <span className="tabular font-mono text-[10.5px] text-muted">{fmtDate(a.date, true)}</span>
                <span className="text-[13px] text-ink-2">{a.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Bills({ charges }: { charges: NonNullable<ProviderView["charges"]> }) {
  const total = charges.reduce((s, c) => s + c.amount, 0);
  return (
    <section>
      <SectionHeader title="Your bills on file" meta="Your office only" />
      <div className="mt-4">
        <div className="label">Total billed</div>
        <div className="tabular mt-1.5 text-[30px] leading-none font-medium tracking-[-0.02em]">{fmtMoney(total)}</div>
      </div>
      <dl className="mt-4 divide-y divide-line border-y border-line text-[13px]">
        {charges.map((c, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="min-w-0 text-ink-2"><span className="tabular mr-2 font-mono text-[10.5px] text-muted">{fmtDate(c.date)}</span>{c.label}</dt>
            <dd className="tabular text-ink">{fmtMoney(c.amount)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
