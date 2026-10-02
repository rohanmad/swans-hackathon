"use client";
import { useEffect, useMemo, useState } from "react";
import type { Digest } from "@/lib/digest";
import type { Snapshot } from "@/lib/types";
import { buildBrief, sourceId, type Brief } from "./adapter";
import { SourceProvider, useSource } from "./context/SourceContext";
import { AttentionCenter, WaitingOn } from "./components/AttentionCenter";
import { CaseHeader } from "./components/CaseHeader";
import { CaseSignals } from "./components/CaseSignals";
import { CaseStory } from "./components/CaseStory";
import { ClientCard } from "./components/ClientCard";
import { DemandDocuments } from "./components/DemandDocuments";
import { GlobalSearch } from "./components/GlobalSearch";
import { IncidentCard } from "./components/IncidentCard";
import { MedicalBills } from "./components/MedicalBills";
import { MedicalProviders } from "./components/MedicalProviders";
import { MedicalRecordSummary } from "./components/MedicalRecordSummary";
import { SectionHeader } from "./components/SectionHeader";
import { Sidebar, type PageId } from "./components/Sidebar";
import { SourceDrawer } from "./components/SourceDrawer";
import { cx, fmtDate } from "./lib/format";
import { Sharing } from "./Sharing";

type Props = { snapshot: Snapshot; digest: Digest; syncing: boolean; onResync: () => void; onSwitchMatter: () => void };

export function AttorneyApp({ snapshot, digest, syncing, onResync, onSwitchMatter }: Props) {
  const brief = useMemo(() => buildBrief(snapshot, digest), [snapshot, digest]);
  const [page, setPage] = useState<PageId>("overview");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareProvider, setShareProvider] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(o => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const share = (id: string | null) => { setShareProvider(id ?? digest.providers[0]?.id ?? null); setPage("sharing"); };

  return (
    <SourceProvider sources={brief.sources}>
      <div className="flex min-h-screen min-w-[1100px]">
        <Sidebar current={page} onNavigate={setPage} matterNumber={brief.case.id} status={brief.case.status === "active" ? "Active" : "Closed"} overdue={brief.overdueCount} onSwitchMatter={onSwitchMatter} />
        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-30">
            <CaseHeader data={brief.case} onSearch={() => setSearchOpen(true)} onShare={() => share(shareProvider)} onResync={onResync} syncing={syncing} />
          </div>
          {page === "overview" && <Overview brief={brief} onShare={share} onProviders={() => setPage("providers")} />}
          {page === "timeline" && <Timeline brief={brief} />}
          {page === "documents" && <Page><DemandDocuments documents={brief.documents} /></Page>}
          {page === "tasks" && (
            <Page>
              <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12">
                {brief.attention.length ? <AttentionCenter items={brief.attention} /> : <p className="text-muted">Nothing overdue or due in the next 30 days.</p>}
                {brief.waiting.length > 0 && <WaitingOn items={brief.waiting} />}
              </div>
            </Page>
          )}
          {page === "providers" && (
            <Page>
              <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12">
                <MedicalProviders providers={brief.providers} onShare={share} />
                {brief.bills.length > 0 && <MedicalBills bills={brief.bills} totalSourceId={brief.billsSourceId} />}
              </div>
            </Page>
          )}
          {page === "sharing" && <Sharing digest={digest} providerId={shareProvider ?? digest.providers[0]?.id ?? null} onPick={setShareProvider} />}
        </main>
      </div>
      <SourceDrawer />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} index={brief.search} />
    </SourceProvider>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1400px] px-10 pt-7 pb-24">{children}</div>;
}

function Overview({ brief, onShare, onProviders }: { brief: Brief; onShare: (id: string) => void; onProviders: () => void }) {
  return (
    <Page>
      {brief.signals.length > 0 && <CaseSignals signals={brief.signals} />}

      <div className="mt-10 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12 max-[1240px]:gap-8">
        <div className="space-y-10">
          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8">
            {brief.incident ? <IncidentCard incident={brief.incident} /> : <div />}
            {brief.client && <ClientCard client={brief.client} />}
          </div>
          {brief.attention.length > 0 && <AttentionCenter items={brief.attention.slice(0, 5)} />}
          {brief.waiting.length > 0 && <WaitingOn items={brief.waiting} />}
        </div>

        <div className="space-y-10">
          <MedicalProviders providers={brief.providers.slice(0, 6)} onShare={onShare} />
          {brief.bills.length > 0 && <MedicalBills bills={brief.bills} totalSourceId={brief.billsSourceId} onOpenFinancials={onProviders} />}
        </div>
      </div>

      {brief.keyNotes.length > 0 && (
        <div className="mt-14">
          <MedicalRecordSummary sections={brief.keyNotes} title="Notes that matter" meta={`Top ${brief.keyNotes.length} of ${brief.totalEntries} entries · ranked by recency and case signals`} />
        </div>
      )}

      <div className="mt-14">
        <CaseStory events={brief.story} totalEntries={brief.totalEntries} />
      </div>

      <div className="mt-14">
        <DemandDocuments documents={brief.documents} />
      </div>
    </Page>
  );
}

const KIND_LABEL: Record<string, string> = { notes: "Note", communications: "Communication", calendar: "Calendar", documents: "Document", tasks: "Task" };

function Timeline({ brief }: { brief: Brief }) {
  const { openSource, activeSourceId } = useSource();
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const items = brief.timeline.filter(i => (kind === "all" || i.kind === kind) && (!query || `${i.title} ${i.detail ?? ""}`.toLowerCase().includes(query.toLowerCase())));
  const months = new Map<string, typeof items>();
  for (const i of items) {
    const key = new Date(i.date.length === 10 ? i.date + "T12:00:00" : i.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    months.set(key, [...(months.get(key) ?? []), i]);
  }
  return (
    <Page>
      <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
        <div className="flex items-center gap-1">
          {["all", "notes", "communications", "calendar", "documents", "tasks"].map(k => (
            <button key={k} type="button" onClick={() => setKind(k)} className={cx("rounded-[4px] px-2.5 py-1 text-[12.5px] transition-colors", kind === k ? "bg-ink text-paper" : "text-ink-2 hover:bg-ink/[0.05]")}>
              {k === "all" ? "All" : k === "calendar" ? "Calendar" : KIND_LABEL[k] + "s"}
              <span className={cx("tabular ml-1.5 font-mono text-[10px]", kind === k ? "text-paper/60" : "text-faint")}>{k === "all" ? brief.timeline.length : brief.timeline.filter(i => i.kind === k).length}</span>
            </button>
          ))}
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the timeline…" className="h-8 w-[260px] rounded-[5px] border border-line bg-surface px-2.5 text-[12.5px] outline-none focus:border-line-strong" />
      </div>
      {[...months.entries()].map(([month, list]) => (
        <div key={month} className="mt-6">
          <SectionHeader title={month} meta={`${list.length} entries`} />
          <ul>
            {list.map(i => {
              const id = sourceId(i.source);
              return (
                <li key={id} className="border-b border-line">
                  <button type="button" onClick={() => openSource(id)} className={cx("grid w-full grid-cols-[72px_110px_minmax(0,1fr)] items-baseline gap-3 py-2 text-left hover:bg-surface", activeSourceId === id && "bg-surface")}>
                    <span className="tabular font-mono text-[11px] text-muted">{fmtDate(i.date)}</span>
                    <span className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{i.tags?.[0] && i.kind !== "notes" ? i.tags[0] : KIND_LABEL[i.kind]}</span>
                    <span className="truncate text-[13px] text-ink">{i.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {items.length === 0 && <p className="py-8 text-center text-[13px] text-muted">No entries match.</p>}
    </Page>
  );
}
