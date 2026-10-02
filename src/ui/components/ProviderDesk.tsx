import type { ReactNode } from "react";
import { Mail, Phone } from "lucide-react";
import type { DeskLine, LienPayout, LienRow, MedicalBill, MedicalProvider, ProviderDesk as Desk } from "../types";
import { useSource } from "../context/SourceContext";
import { cx, fmtDate, fmtMoney, telHref } from "../lib/format";
import { CaseSignals } from "./CaseSignals";
import { EvidenceLink } from "./EvidenceLink";
import { MedicalBills } from "./MedicalBills";
import { MedicalProviders } from "./MedicalProviders";
import { SectionHeader } from "./SectionHeader";

type Props = { desk: Desk; providers: MedicalProvider[]; bills: MedicalBill[]; billsSourceId?: string; timeline?: ReactNode };

const grid = "grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12 max-[1240px]:gap-8";
const half = "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 max-[1240px]:gap-8";
const count = (n: number, meta: string) => `${n} · ${meta}`;

export function ProviderDesk({ desk, providers, bills, billsSourceId, timeline }: Props) {
  return (
    <div>
      {desk.signals.length > 0 && <CaseSignals signals={desk.signals} />}
      {timeline && <div className="mt-10">{timeline}</div>}

      <div className={cx(grid, "mt-10")}>
        {bills.length > 0 ? <MedicalBills bills={bills} totalSourceId={billsSourceId} showTotal={!desk.signals.some(sg => sg.id === "charges")} /> : <div />}
        <Liens desk={desk} />
      </div>

      <div className={cx(grid, "mt-14")}>
        <MedicalProviders providers={providers} />
        <Scheduling desk={desk} />
      </div>

      <div className={cx(half, "mt-14")}>
        <Lines title="Medical history" meta={count(desk.medicalHistory.length, "from notes and records")} items={desk.medicalHistory} empty="No medical-history notes are tagged on this matter yet." />
        <Lines title="Prior treatment" meta={count(desk.priorTreatment.length, "before the date of incident")} items={desk.priorTreatment} empty="No prior treatment is recorded before the date of incident." />
      </div>

      <div className={cx(half, "mt-14")}>
        <Lines title="Patient-provided information" meta={count(desk.patientProvided.length, "inbound client messages")} items={desk.patientProvided} empty="No inbound client messages are on file." />
        <Lines title="Still needed from the client" meta={count(desk.stillNeeded.length, "open Clio tasks")} items={desk.stillNeeded} empty="Nothing is waiting on the client." />
      </div>
    </div>
  );
}

function Lines({ title, meta, items, empty }: { title: string; meta: string; items: DeskLine[]; empty: string }) {
  const { openSource, activeSourceId } = useSource();
  return (
    <section>
      <SectionHeader title={title} meta={meta} />
      {items.length === 0 ? <p className="mt-3 text-[13px] text-muted">{empty}</p> : (
        <ul>
          {items.map((item, i) => (
            <li key={item.sourceId + i} className="border-b border-line">
              <button
                type="button"
                onClick={() => openSource(item.sourceId)}
                className={cx("grid w-full grid-cols-[72px_1fr] items-baseline gap-3 py-2.5 text-left transition-colors hover:bg-surface", activeSourceId === item.sourceId && "bg-surface")}
              >
                <span className="tabular font-mono text-[10.5px] text-muted">{item.date ? fmtDate(item.date, true) : "—"}</span>
                <span className="min-w-0">
                  <span className="text-[13px] leading-snug text-ink-2">{item.text}</span>
                  {item.meta && <span className="ml-2 text-[11px] text-muted">{item.meta}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Scheduling({ desk }: { desk: Desk }) {
  const { openSource } = useSource();
  const patient = desk.scheduling[0];
  return (
    <section>
      <SectionHeader title="Contact for scheduling" meta={count(desk.appointments.length, "upcoming appointments")} />
      {patient && (
        <div className="flex items-start justify-between gap-3 border-b border-line py-3">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold tracking-[-0.005em]">{patient.name}</div>
            <div className="text-[12px] text-ink-2">{patient.role}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11.5px] text-muted">
              {patient.phone && <a href={telHref(patient.phone)} className="tabular inline-flex items-center gap-1 hover:text-swan"><Phone size={11} strokeWidth={1.7} />{patient.phone}</a>}
              {patient.email && <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1 truncate hover:text-swan"><Mail size={11} strokeWidth={1.7} />{patient.email}</a>}
              {!patient.phone && !patient.email && <span>No phone or email on the client contact</span>}
            </div>
          </div>
          <EvidenceLink sourceId={patient.sourceId} label="Contact log" />
        </div>
      )}
      {desk.appointments.length === 0 ? <p className="mt-3 text-[13px] text-muted">No upcoming appointments are on the calendar.</p> : (
        <ul>
          {desk.appointments.map((a, i) => (
            <li key={a.sourceId + i} className="border-b border-line">
              <button type="button" onClick={() => openSource(a.sourceId)} className="grid w-full grid-cols-[88px_1fr] items-baseline gap-3 py-2 text-left transition-colors hover:bg-surface">
                <span className="tabular font-mono text-[10.5px] text-muted">{a.date ? fmtDate(a.date, true) : "—"}</span>
                <span className="text-[13px] text-ink-2">{a.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Liens({ desk }: { desk: Desk }) {
  const { openSource, activeSourceId } = useSource();
  const sourceId = desk.liens[0]?.sourceId ?? desk.lienNotes[0]?.sourceId;

  if (!desk.liens.length && !desk.lienNotes.length) {
    return (
      <section>
        <SectionHeader title="Liens" />
        <p className="mt-3 text-[13px] text-muted">No lien is recorded on this matter.</p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title="Liens" meta={`${desk.liens.length} recorded amounts`} />

      {desk.liens.length > 0 && (
        <table className="mt-3 w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="label py-1.5 font-normal">Holder</th>
              <th className="label py-1.5 text-right font-normal">Amount</th>
              <th className="label py-1.5 pl-4 text-right font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {desk.liens.map((l, i) => <LienLine key={l.holder + i} lien={l} active={activeSourceId === l.sourceId} onOpen={() => openSource(l.sourceId)} />)}
          </tbody>
        </table>
      )}

      {desk.lienNotes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {desk.lienNotes.map((n, i) => <li key={i} className="text-[12px] leading-snug text-muted">{n.text}</li>)}
        </ul>
      )}

      {desk.payout && <Payout payout={desk.payout} />}

      {sourceId && <EvidenceLink sourceId={sourceId} className="mt-2.5" />}
    </section>
  );
}

function Payout({ payout }: { payout: LienPayout }) {
  const { openSource, activeSourceId } = useSource();
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="label">{payout.window ? "Expected payout" : "Payout timing"}</div>
      {payout.window && payout.anchor && (
        <button type="button" onClick={() => openSource(payout.anchor!.sourceId)} className="mt-1.5 block text-left">
          <span className="tabular text-[15px] font-medium text-ink">
            {payout.window.from === payout.window.to ? fmtDate(payout.window.from, true) : `${fmtDate(payout.window.from, true)} – ${fmtDate(payout.window.to, true)}`}
          </span>
          <span className="mt-0.5 block text-[12px] text-muted">{payout.anchor.event}</span>
        </button>
      )}
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{payout.basis}</p>
      {payout.blockers.length > 0 && (
        <>
          <div className="label mt-3">Holding up payout</div>
          <ul className="mt-1">
            {payout.blockers.map((b, i) => (
              <li key={b.sourceId + i}>
                <button
                  type="button"
                  onClick={() => openSource(b.sourceId)}
                  className={cx("flex w-full items-baseline gap-3 border-b border-line/70 py-1.5 text-left transition-colors hover:bg-surface", activeSourceId === b.sourceId && "bg-surface")}
                >
                  <span className="w-16 shrink-0 font-mono text-[9.5px] tracking-[0.08em] text-muted uppercase">{b.meta}</span>
                  <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink">{b.text}</span>
                  {b.date && <span className="tabular shrink-0 font-mono text-[10.5px] text-muted">{fmtDate(b.date)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LienLine({ lien, active, onOpen }: { lien: LienRow; active: boolean; onOpen: () => void }) {
  return (
    <tr onClick={onOpen} className={cx("cursor-pointer border-b border-line/70 transition-colors hover:bg-surface", active && "bg-surface")}>
      <td className="py-2">
        <span className="block">{lien.holder}</span>
        <span className="font-mono text-[9.5px] tracking-[0.08em] text-muted uppercase">{lien.isLien ? "Lien" : "Other payer"}</span>
      </td>
      <td className={cx("tabular py-2 text-right font-medium", !lien.isLien && "text-ink-2")}>{fmtMoney(lien.amount)}</td>
      <td className="py-2 pl-4 text-right">
        <span className={cx(
          "rounded-[3px] border px-1.5 py-[1px] font-mono text-[9.5px] tracking-[0.06em] whitespace-nowrap uppercase",
          lien.status === "Asserted" || lien.status === "Outstanding" ? "border-warn/25 bg-warn-soft text-warn"
            : lien.status === "Satisfied" || lien.status === "Paid" || lien.status === "Waived" ? "border-ok/25 bg-ok-soft text-ok"
            : "border-line bg-surface text-muted"
        )}>{lien.status}</span>
      </td>
    </tr>
  );
}
