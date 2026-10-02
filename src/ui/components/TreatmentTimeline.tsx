"use client";
import type { TreatmentLane } from "../types";
import { useSource } from "../context/SourceContext";
import { cx, fmtDate, fmtMoney } from "../lib/format";
import { SectionHeader } from "./SectionHeader";

type Props = { lanes: TreatmentLane[]; incidentDate?: string };

const DAY = 86_400_000;
const LABEL_W = 250;
const NEXT_W = 150;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const time = (d: string) => Date.parse(d.slice(0, 10) + "T12:00:00");
const month = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const duration = (a: string, b: string) => {
  const days = Math.round((time(b) - time(a)) / DAY) + 1;
  if (days < 45) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30.44);
  return months < 24 ? `${months} months` : `${(months / 12).toFixed(1)} years`;
};

type Row = { lane: TreatmentLane; from: string; to: string; sourceId: string; next?: { date: string; sourceId: string; count: number } };

export function TreatmentTimeline({ lanes, incidentDate }: Props) {
  const { openSource } = useSource();
  const today = new Date().toISOString().slice(0, 10);

  const rows: Row[] = lanes.flatMap(lane => {
    const past = [...lane.spans.flatMap(s => [s.from, s.to]), ...lane.marks.filter(m => m.date <= today).map(m => m.date)].sort();
    const upcoming = lane.marks.filter(m => m.date > today).sort((a, b) => a.date.localeCompare(b.date));
    if (!past.length) return [];
    return [{
      lane, from: past[0], to: past[past.length - 1],
      sourceId: lane.spans[0]?.sourceId ?? lane.marks[0].sourceId,
      next: upcoming[0] ? { date: upcoming[0].date, sourceId: upcoming[0].sourceId, count: upcoming.length } : undefined,
    }];
  }).sort((a, b) => a.from.localeCompare(b.from));
  if (!rows.length) return null;

  const start = incidentDate?.slice(0, 10) && incidentDate.slice(0, 10) < rows[0].from ? incidentDate.slice(0, 10) : rows[0].from;
  const end = rows.reduce((m, r) => (r.to > m ? r.to : m), start);
  const min = time(start) - 20 * DAY, max = time(end) + 30 * DAY;
  const pct = (d: string) => ((time(d) - min) / (max - min)) * 100;

  const years: { year: number; from: number; to: number }[] = [];
  for (let y = new Date(min).getFullYear(); y <= new Date(max).getFullYear(); y++) {
    const from = Math.max(0, pct(`${y}-01-01`)), to = Math.min(100, pct(`${y + 1}-01-01`));
    if (to > from) years.push({ year: y, from, to });
  }
  const active = rows.filter(r => r.next).length;
  const cols = `${LABEL_W}px minmax(0,1fr) ${NEXT_W}px`;

  return (
    <section>
      <SectionHeader
        title="Treatment timeline"
        meta={`${rows.length} providers · ${active ? `${active} still treating` : "none currently treating"}`}
      />

      <div className="mt-3 flex items-center gap-5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-[3px] bg-ink/25" />Finished treating</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-[3px] bg-swan/70" />Still treating</span>
        <span className="text-faint">Bars span the billed dates of service. Click a row to open its record.</span>
      </div>

      <div className="relative mt-4">
        <div className="grid border-b border-ink/80" style={{ gridTemplateColumns: cols }}>
          <div className="label self-end pb-1.5">Provider · billed</div>
          <div className="relative h-8">
            {years.map(y => (
              <span key={y.year} className="tabular absolute bottom-1.5 font-mono text-[11px] text-ink-2" style={{ left: `calc(${y.from}% + 6px)` }}>{y.year}</span>
            ))}
          </div>
          <div className="label self-end border-l border-dashed border-line-strong pb-1.5 pl-3">Next visit</div>
        </div>

        {rows.map(r => {
          const left = pct(r.from), width = Math.max(pct(r.to) - left, 0);
          const single = r.from === r.to;
          const text = single ? fmtDate(r.from, true) : `${month(r.from)} – ${month(r.to)} · ${duration(r.from, r.to)}`;
          const labelInside = width > 34;
          const labelLeft = !labelInside && left + width > 62;
          return (
            <div key={r.lane.id} className="grid border-b border-line/70" style={{ gridTemplateColumns: cols }}>
              <button type="button" onClick={() => openSource(r.sourceId)} className="min-w-0 py-2.5 pr-4 text-left hover:text-swan">
                <span className="block truncate text-[13px]" title={r.lane.name}>{r.lane.name}</span>
                <span className="tabular block text-[11.5px] text-muted">{r.lane.billed > 0 ? fmtMoney(r.lane.billed) : "No bill on file"}</span>
              </button>

              <button type="button" onClick={() => openSource(r.sourceId)} className="group relative block" aria-label={`${r.lane.name}: ${text}`}>
                {years.filter((_, i) => i % 2 === 1).map(y => (
                  <span key={y.year} className="absolute inset-y-0 bg-paper-2/60" style={{ left: `${y.from}%`, width: `${y.to - y.from}%` }} />
                ))}
                <span
                  className={cx(
                    "absolute top-1/2 flex h-[18px] -translate-y-1/2 items-center overflow-hidden rounded-[3px] transition-opacity group-hover:opacity-80",
                    r.next ? "bg-swan/70" : "bg-ink/25",
                    single && "-translate-x-1/2"
                  )}
                  style={{ left: `${left}%`, width: single ? 10 : `${width}%`, minWidth: 10 }}
                >
                  {labelInside && <span className={cx("tabular truncate px-2 font-mono text-[10.5px]", r.next ? "text-white" : "text-ink")}>{text}</span>}
                </span>
                {!labelInside && (
                  <span
                    className="tabular absolute top-1/2 -translate-y-1/2 font-mono text-[10.5px] whitespace-nowrap text-ink-2"
                    style={labelLeft ? { right: `calc(${100 - left}% + 10px)` } : { left: `calc(${left + width}% + ${single ? 10 : 6}px)` }}
                  >
                    {text}
                  </span>
                )}
                {r.next && <span className="absolute top-1/2 right-0 h-0 -translate-y-1/2 border-t-2 border-dotted border-swan/60" style={{ left: `${left + width}%` }} />}
              </button>

              <div className="flex items-center border-l border-dashed border-line-strong pl-3">
                {r.next ? (
                  <button type="button" onClick={() => openSource(r.next!.sourceId)} className="text-left hover:underline">
                    <span className="tabular block text-[12.5px] font-medium text-swan">{fmtDate(r.next.date, true)}</span>
                    {r.next.count > 1 && <span className="block text-[11px] text-muted">+{r.next.count - 1} more booked</span>}
                  </button>
                ) : (
                  <span className="text-[11.5px] text-faint">None booked</span>
                )}
              </div>
            </div>
          );
        })}

        {incidentDate && pct(incidentDate) >= 0 && (
          <div className="pointer-events-none absolute top-0 bottom-0" style={{ left: `calc(${LABEL_W}px + (100% - ${LABEL_W + NEXT_W}px) * ${pct(incidentDate) / 100})` }}>
            <span className="absolute top-8 bottom-0 w-px bg-high/60" />
            <span className="absolute -top-0.5 -translate-x-1/2 font-mono text-[9.5px] tracking-[0.1em] whitespace-nowrap text-high uppercase">Incident</span>
          </div>
        )}
      </div>
    </section>
  );
}
