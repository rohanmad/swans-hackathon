"use client";
import { useState } from "react";
import { ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import type { AiBrief, Cited } from "@/lib/ai";
import { useSource } from "../context/SourceContext";
import { cx, fmtDate } from "../lib/format";
import { SectionHeader } from "./SectionHeader";

export type AiState = { status: "off" | "loading" | "ready" | "error"; brief: AiBrief | null; error?: string; retry: () => void };

type CiteTone = "swan" | "high" | "ok" | "warn" | "ink";

const underline: Record<CiteTone, { idle: string; active: string }> = {
  swan: { idle: "decoration-swan/55 hover:bg-swan-soft hover:decoration-swan", active: "bg-swan-soft decoration-swan" },
  high: { idle: "decoration-high/55 hover:bg-high-soft hover:decoration-high", active: "bg-high-soft decoration-high" },
  ok: { idle: "decoration-ok/60 hover:bg-ok-soft hover:decoration-ok", active: "bg-ok-soft decoration-ok" },
  warn: { idle: "decoration-warn/65 hover:bg-warn-soft hover:decoration-warn", active: "bg-warn-soft decoration-warn" },
  ink: { idle: "decoration-ink/40 hover:bg-ink/[0.06] hover:decoration-ink", active: "bg-ink/[0.06] decoration-ink" }
};

function citeTone(text: string, fallback: CiteTone): CiteTone {
  if (/lien|medicaid|medicare|\$|policy limit|wage|specials/i.test(text)) return "warn";
  if (/injur|shoulder|knee|spine|head|brain|tear|mri|concuss|fracture/i.test(text)) return "high";
  if (/treat|surgery|arthroscop|chiropract|physical therap|\bpt\b|imaging/i.test(text)) return "ok";
  if (/coverage|insur|carrier|self-insured/i.test(text)) return "swan";
  if (/liab|fault|litigation|depos|witness/i.test(text)) return "ink";
  return fallback;
}

function CitedText({ text, ids, tone = "swan" }: { text: string; ids: string[]; tone?: CiteTone }) {
  const { sources, openSource, activeSourceId } = useSource();
  const [menu, setMenu] = useState(false);
  const valid = ids.filter(id => sources[id]);
  if (!valid.length) return <>{text}</>;
  const active = valid.includes(activeSourceId ?? "");
  const primary = sources[valid[0]];
  const color = underline[tone];
  const open = () => {
    if (valid.length === 1) openSource(valid[0]);
    else setMenu(open => !open);
  };
  return (
    <span className="group relative inline">
      <span
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
        className={cx(
          "cursor-pointer rounded-[2px] underline decoration-[1.5px] underline-offset-[5px] transition-colors [box-decoration-break:clone]",
          color.idle,
          active && color.active
        )}
      >
        {text}
      </span>
      {!menu && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-ink px-2 py-1 font-sans text-[11px] leading-tight font-normal text-paper shadow-lg group-hover:block">
          {primary.title} · {fmtDate(primary.date)}
          {valid.length > 1 && <span className="text-paper/60"> · {valid.length} sources</span>}
        </span>
      )}
      {menu && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <span className="absolute top-full left-0 z-50 mt-1.5 block w-[340px] rounded-[6px] border border-line bg-surface py-1 font-sans shadow-lg">
            <span className="label block px-3 pt-1.5 pb-1">Open a source</span>
            {valid.map(id => (
              <button key={id} type="button" onClick={() => { setMenu(false); openSource(id); }}
                className={cx("grid w-full grid-cols-[1fr_auto] items-baseline gap-3 px-3 py-1.5 text-left hover:bg-paper", activeSourceId === id && "bg-paper")}>
                <span className="truncate text-[12.5px] text-ink">{sources[id].title}</span>
                <span className="tabular font-mono text-[10.5px] text-muted">{fmtDate(sources[id].date)}</span>
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

function AiLabel({ brief }: { brief: AiBrief }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] text-swan uppercase">
      <Sparkles size={11} strokeWidth={1.8} /> AI · {brief.model} · click underlined text for the source
    </span>
  );
}

export function AiSummary({ ai }: { ai: AiState }) {
  if (ai.status === "off") return null;
  return (
    <section className="rounded-[6px] border border-swan/20 bg-surface px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} strokeWidth={1.8} className="text-swan" />
          <h2 className="text-[13px] font-semibold tracking-[0.08em] uppercase">Case summary</h2>
        </div>
        {ai.brief ? <AiLabel brief={ai.brief} /> : ai.status === "error" && (
          <button type="button" onClick={ai.retry} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink"><RefreshCw size={12} /> Retry</button>
        )}
      </div>
      {ai.status === "loading" && (
        <div className="mt-4 space-y-2">
          <p className="text-[12.5px] text-muted">Reading every note, email, task and document on this matter…</p>
          {[92, 84, 70].map(w => <div key={w} className="h-3 animate-pulse rounded bg-line" style={{ width: `${w}%` }} />)}
        </div>
      )}
      {ai.status === "error" && <p className="mt-3 text-[13px] text-high">{ai.error}</p>}
      {ai.brief && (
        <p className="mt-3 font-serif text-[17px] leading-[1.6] text-ink">
          {ai.brief.overview.map((s, i) => <span key={i}><CitedText text={s.text} ids={s.sources} tone={citeTone(s.text, "swan")} />{" "}</span>)}
        </p>
      )}
    </section>
  );
}

const confidence = { high: { label: "High confidence", filled: 3 }, medium: { label: "Medium confidence", filled: 2 }, low: { label: "Low confidence", filled: 1 } };

export function Injuries({ brief }: { brief: AiBrief }) {
  const [open, setOpen] = useState<number | null>(null);
  const { sources, openSource, activeSourceId } = useSource();
  if (!brief.injuries.length) return null;
  return (
    <section>
      <SectionHeader title="Injuries" meta="AI-extracted · confidence reflects corroborating records" />
      <ul>
        {brief.injuries.map((inj, i) => {
          const meta = confidence[inj.confidence];
          const isOpen = open === i;
          const primary = inj.priority === "primary";
          return (
            <li key={i} className="border-b border-line">
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="grid w-full grid-cols-[14px_132px_1fr_auto] items-center gap-3 py-3 text-left transition-colors hover:bg-surface">
                <ChevronRight size={13} className={cx("text-muted transition-transform duration-150", isOpen && "rotate-90")} />
                <span>
                  <span className={cx("block text-[13px] tracking-[0.06em] uppercase", primary ? "font-semibold" : "font-medium text-ink-2")}>{inj.region}</span>
                  <span className={cx("font-mono text-[9.5px] tracking-[0.1em] uppercase", primary ? "text-high" : "text-muted")}>{inj.priority}</span>
                </span>
                <span className="min-w-0 truncate text-[12.5px] text-ink-2">{inj.finding}</span>
                <span className="flex gap-[3px]" title={meta.label}>
                  {[0, 1, 2].map(k => <span key={k} className={cx("h-[10px] w-[4px] rounded-[1px]", k < meta.filled ? "bg-ink" : "bg-line")} />)}
                </span>
              </button>
              {isOpen && (
                <div className="animate-fade-in pb-4 pl-[26px]">
                  <div className="text-[12.5px] leading-snug text-ink-2">{inj.finding}</div>
                  <div className="mt-1 text-[11.5px] leading-snug text-muted">{meta.label} · {inj.rationale}</div>
                  <ul className="mt-2 divide-y divide-line rounded-[5px] border border-line bg-surface">
                    {inj.sources.filter(id => sources[id]).map(id => (
                      <li key={id}>
                        <button type="button" onClick={() => openSource(id)} className={cx("group grid w-full grid-cols-[1fr_auto] items-baseline gap-3 px-3 py-2 text-left transition-colors hover:bg-paper", activeSourceId === id && "bg-paper")}>
                          <span className="min-w-0">
                            <span className="text-[12.5px] font-medium text-ink group-hover:text-swan">{sources[id].title}</span>
                            {sources[id].excerpt && <span className="block truncate text-[11.5px] text-muted">“{sources[id].excerpt}”</span>}
                          </span>
                          <span className="tabular font-mono text-[10.5px] text-muted">{fmtDate(sources[id].date)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CitedList({ title, meta, items, tone }: { title: string; meta: string; items: Cited[]; tone: "high" | "swan" }) {
  if (!items.length) return null;
  return (
    <section>
      <SectionHeader title={title} meta={meta} />
      <ol className="mt-1">
        {items.map((item, i) => (
          <li key={i} className="grid grid-cols-[22px_1fr] gap-2 border-b border-line py-2.5">
            <span className={cx("tabular pt-[2px] font-mono text-[10.5px]", tone === "high" ? "text-high" : "text-swan")}>{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[13px] leading-snug text-ink-2"><CitedText text={item.text} ids={item.sources} tone={citeTone(item.text, tone)} /></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function GapsAndSteps({ brief }: { brief: AiBrief }) {
  if (!brief.gaps.length && !brief.nextSteps.length) return null;
  return (
    <div className="grid grid-cols-2 gap-12 max-[1240px]:gap-8">
      <CitedList title="Gaps & risks" meta="AI review of the file" items={brief.gaps} tone="high" />
      <CitedList title="Suggested next steps" meta="AI suggestion · attorney decides" items={brief.nextSteps} tone="swan" />
    </div>
  );
}

export function Chronology({ brief }: { brief: AiBrief }) {
  if (!brief.chronology.length) return null;
  return (
    <section>
      <SectionHeader title="Treatment chronology" meta={`${brief.chronology.length} events · AI-extracted from notes, emails and documents`} />
      <ul>
        {brief.chronology.map((e, i) => (
          <li key={i} className="grid grid-cols-[92px_220px_1fr] items-baseline gap-4 border-b border-line py-2.5">
            <span className="tabular font-mono text-[11px] text-muted">{fmtDate(e.date, true)}</span>
            <span className="truncate text-[12.5px] font-medium text-ink">{e.provider}</span>
            <span className="text-[13px] leading-snug text-ink-2"><CitedText text={e.event} ids={e.sources} tone={citeTone(e.event, "ok")} /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
