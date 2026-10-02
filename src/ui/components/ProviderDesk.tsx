import { Mail, Phone } from "lucide-react";
import type { ProviderDesk as Desk } from "../types";
import { fmtDate, telHref } from "../lib/format";
import { EvidenceLink } from "./EvidenceLink";
import { SectionHeader } from "./SectionHeader";

export function ProviderDesk({ desk }: { desk: Desk }) {
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 max-[1240px]:gap-8">
        <Lines title="Medical history" meta="From notes and records on this matter" items={desk.medicalHistory} empty="No medical-history notes are tagged on this matter yet." />
        <Lines title="Prior treatment" meta="Before the date of incident, or described as prior" items={desk.priorTreatment} empty="No prior treatment is recorded before the date of incident." />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 max-[1240px]:gap-8">
        <Lines title="Patient-provided information" meta="Inbound messages from the client" items={desk.patientProvided} empty="No inbound client messages are on file." />
        <Lines title="Still needed from the client" meta="Open Clio tasks waiting on the patient" items={desk.stillNeeded} empty="Nothing is waiting on the client." />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 max-[1240px]:gap-8">
        <Scheduling desk={desk} />
        <Liens desk={desk} />
      </div>
    </div>
  );
}

function Lines({ title, meta, items, empty }: { title: string; meta: string; items: Desk["medicalHistory"]; empty: string }) {
  return (
    <section>
      <SectionHeader title={title} meta={meta} />
      {items.length === 0 ? <p className="mt-3 text-[13px] text-muted">{empty}</p> : (
        <ul>
          {items.map((item, i) => (
            <li key={item.sourceId + i} className="grid grid-cols-[72px_1fr] items-baseline gap-3 border-b border-line py-2.5">
              <span className="tabular font-mono text-[10.5px] text-muted">{item.date ? fmtDate(item.date) : "—"}</span>
              <span>
                <span className="text-[13px] leading-snug text-ink-2">{item.text}</span>
                {item.meta && <span className="ml-2 text-[11px] text-muted">{item.meta}</span>}
                <EvidenceLink sourceId={item.sourceId} label="Open" className="ml-2" />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Scheduling({ desk }: { desk: Desk }) {
  return (
    <section>
      <SectionHeader title="Contact for scheduling" meta="Patient and treating offices with a phone or email on file" />
      {desk.scheduling.length === 0 ? <p className="mt-3 text-[13px] text-muted">No scheduling contacts are on this matter.</p> : (
        <ul className="mt-1 divide-y divide-line border-y border-line">
          {desk.scheduling.map(c => (
            <li key={c.sourceId} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-[13.5px] font-medium text-ink">{c.name}</div>
                  <div className="text-[11.5px] text-muted">{c.role}</div>
                </div>
                <EvidenceLink sourceId={c.sourceId} label="Open" />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 text-[12.5px]">
                {c.phone && <a href={telHref(c.phone)} className="tabular inline-flex items-center gap-1 text-ink hover:text-swan"><Phone size={11} strokeWidth={1.7} />{c.phone}</a>}
                {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 truncate text-ink hover:text-swan"><Mail size={11} strokeWidth={1.7} />{c.email}</a>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {desk.appointments.length > 0 && (
        <div className="mt-5">
          <div className="label mb-1">Upcoming appointments</div>
          <ul>
            {desk.appointments.map((a, i) => (
              <li key={a.sourceId + i} className="grid grid-cols-[72px_1fr] items-baseline gap-3 border-b border-line py-2">
                <span className="tabular font-mono text-[10.5px] text-muted">{a.date ? fmtDate(a.date, true) : "—"}</span>
                <span className="text-[13px] text-ink-2">{a.text}<EvidenceLink sourceId={a.sourceId} label="Open" className="ml-2" /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Liens({ desk }: { desk: Desk }) {
  return (
    <section>
      <SectionHeader title="Liens & when providers are paid" meta="From matter fields · no payment date is invented" />
      {desk.liens.length === 0 && !desk.payment ? <p className="mt-3 text-[13px] text-muted">No lien is recorded on this matter.</p> : (
        <ul>
          {desk.liens.map((l, i) => (
            <li key={l.sourceId + i} className="border-b border-line py-2.5">
              <div className="text-[13.5px] leading-snug text-ink">{l.text}</div>
              <EvidenceLink sourceId={l.sourceId} label="Open field" />
            </li>
          ))}
        </ul>
      )}
      {desk.payment && (
        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          {desk.payment.text} <EvidenceLink sourceId={desk.payment.sourceId} label="Lien field" />
        </p>
      )}
    </section>
  );
}
