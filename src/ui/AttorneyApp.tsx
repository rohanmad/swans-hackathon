"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Digest } from "@/lib/digest";
import type { Snapshot } from "@/lib/types";
import { buildBrief, sourceId, type Brief } from "./adapter";
import { SourceProvider, useSource } from "./context/SourceContext";
import { AiSummary, Chronology, GapsAndSteps, Injuries, type AiState } from "./components/AiBriefing";
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
import { ProviderDesk } from "./components/ProviderDesk";
import { SectionHeader } from "./components/SectionHeader";
import { Sidebar, type PageId } from "./components/Sidebar";
import { SourceDrawer } from "./components/SourceDrawer";
import { cx, fmtDate } from "./lib/format";

type Props = { snapshot: Snapshot; digest: Digest; syncing: boolean; onResync: () => void; onSwitchMatter: () => void };

export function AttorneyApp({ snapshot, digest, syncing, onResync, onSwitchMatter }: Props) {
  const brief = useMemo(() => buildBrief(snapshot, digest), [snapshot, digest]);
  const [page, setPage] = useState<PageId>("overview");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(o => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const ai = useAiBrief();

  return (
    <SourceProvider sources={brief.sources}>
      <div className="flex min-h-screen min-w-[1100px]">
        <Sidebar current={page} onNavigate={setPage} matterNumber={brief.case.id} status={brief.case.status === "active" ? "Active" : "Closed"} overdue={brief.overdueCount} onSwitchMatter={onSwitchMatter} />
        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-30">
            <CaseHeader data={brief.case} client={brief.client} clientRequests={brief.clientRequests} onSearch={() => setSearchOpen(true)} onResync={onResync} syncing={syncing} />
          </div>
          {page === "overview" && <Overview brief={brief} ai={ai} onProviders={() => setPage("providers")} />}
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
              <ProviderDesk desk={brief.providerDesk} />
              {ai.brief && ai.brief.chronology.length > 0 && <div className="mt-12"><Chronology brief={ai.brief} /></div>}
              <div className="mt-12 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12">
                <MedicalProviders providers={brief.providers} />
                {brief.bills.length > 0 && <MedicalBills bills={brief.bills} totalSourceId={brief.billsSourceId} />}
              </div>
            </Page>
          )}
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

function useAiBrief(): AiState {
  const [state, setState] = useState<Omit<AiState, "retry">>({ status: "loading", brief: null });
  const started = useRef(false);
  const generate = useCallback(async () => {
    setState({ status: "loading", brief: null });
    try {
      const res = await fetch("/api/ai/brief", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "The AI briefing failed.");
      setState({ status: "ready", brief: body.brief });
    } catch (e) { setState({ status: "error", brief: null, error: e instanceof Error ? e.message : "The AI briefing failed." }); }
  }, []);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const body = await (await fetch("/api/ai/brief", { cache: "no-store" })).json();
        if (!body.configured) return setState({ status: "off", brief: null });
        if (body.brief) return setState({ status: "ready", brief: body.brief });
      } catch { /* fall through to generation */ }
      await generate();
    })();
  }, [generate]);
  return { ...state, retry: generate };
}

function Overview({ brief, ai, onProviders }: { brief: Brief; ai: AiState; onProviders: () => void }) {
  return (
    <Page>
      {brief.signals.length > 0 && <CaseSignals signals={brief.signals} />}
      {ai.status !== "off" && <div className="mt-10"><AiSummary ai={ai} /></div>}

      <div className="mt-10 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12 max-[1240px]:gap-8">
        <div className="space-y-10">
          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8">
            {brief.incident ? <IncidentCard incident={brief.incident} /> : <div />}
            {brief.client && <ClientCard client={brief.client} requests={brief.clientRequests} />}
          </div>
          {ai.brief && <Injuries brief={ai.brief} />}
          {brief.attention.length > 0 && <AttentionCenter items={brief.attention.slice(0, 5)} />}
          {brief.waiting.length > 0 && <WaitingOn items={brief.waiting} />}
        </div>

        <div className="space-y-10">
          <MedicalProviders providers={brief.providers.slice(0, 6)} />
          {brief.bills.length > 0 && <MedicalBills bills={brief.bills} totalSourceId={brief.billsSourceId} onOpenFinancials={onProviders} />}
        </div>
      </div>

      {ai.brief && (ai.brief.gaps.length > 0 || ai.brief.nextSteps.length > 0) && <div className="mt-14"><GapsAndSteps brief={ai.brief} /></div>}

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
