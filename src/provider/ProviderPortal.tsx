import { ArrowUpRight, Lock, Mail, Phone } from 'lucide-react'
import type { ProviderView, SharedRecord } from '../types'
import { SourceProvider, useSource } from '../context/SourceContext'
import { SourceDrawer } from '../components/SourceDrawer'
import { SectionHeader } from '../components/SectionHeader'
import { SwanMark } from '../components/SwanMark'
import { RoleSwitcher } from '../components/RoleSwitcher'
import { cx, fmtDate, fmtMoney, telHref } from '../lib/format'

export function ProviderPortal({ view }: { view: ProviderView }) {
  return (
    <SourceProvider sources={view.sources}>
      <div className="flex min-h-screen min-w-[1100px]">
        <aside className="sticky top-0 flex h-screen w-[212px] shrink-0 flex-col border-r border-line bg-paper-2/60 px-3 py-5">
          <div className="mb-7 px-2.5">
            <div className="flex items-center gap-2">
              <SwanMark />
              <span className="text-[14px] font-semibold tracking-[0.18em]">SWANS</span>
            </div>
            <div className="mt-1 pl-[26px] text-[11.5px] text-muted">Provider Portal</div>
          </div>

          <div className="px-2.5">
            <div className="label">Signed in as</div>
            <div className="mt-1.5 text-[13px] font-medium text-ink">{view.office.name}</div>
            <div className="text-[11.5px] text-muted">{view.office.specialty} · Billing office</div>
          </div>

          <div className="mt-auto px-2.5 pb-4">
            <RoleSwitcher current="provider" />
          </div>
          <div className="border-t border-line px-2.5 pt-4">
            <div className="flex items-center gap-1.5 text-[11px] leading-snug text-muted">
              <Lock size={11} strokeWidth={1.8} className="shrink-0" />
              Shared by {view.schedulingContact.firm}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
            <div className="flex items-start justify-between gap-6 px-10 pt-5 pb-4">
              <div>
                <div className="label">Patient</div>
                <h1 className="mt-1 text-[17px] font-semibold tracking-[0.04em] uppercase">{view.patient.name}</h1>
                <dl className="mt-1.5 flex flex-wrap items-baseline gap-x-6 text-[12.5px]">
                  <Meta label="Date of injury" value={fmtDate(view.patient.dateOfInjury, true)} />
                  <Meta label="Treating" value={view.office.clinician} />
                </dl>
              </div>
              <div className="text-right">
                <div className="label">Case status</div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-[3px] border border-ok/25 bg-ok-soft px-1.5 py-[1px] font-mono text-[10px] tracking-[0.08em] text-ok uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                  Case {view.caseStatus.label}
                </div>
                <div className="mt-1 text-[11.5px] text-muted">Last update {fmtDate(view.caseStatus.lastUpdate)}</div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1100px] px-10 pt-8 pb-24">
            <SchedulingContact view={view} />

            <div className="mt-12 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12 max-[1240px]:gap-8">
              <Records records={view.sharedRecords} officeName={view.office.name} />
              <div className="space-y-12">
                <LiensAndBills view={view} />
                <CaseUpdates view={view} />
              </div>
            </div>
          </div>
        </main>
      </div>
      <SourceDrawer actionLabel="Download PDF" />
    </SourceProvider>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink-2">{value}</dd>
    </div>
  )
}

function SchedulingContact({ view }: { view: ProviderView }) {
  const c = view.schedulingContact
  const initials = c.name
    .split(' ')
    .map((w) => w[0])
    .join('')
  return (
    <section>
      <SectionHeader title="Contact for scheduling" meta={c.hours} />
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-[14px] font-medium tracking-[0.04em] text-paper">
            {initials}
          </div>
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.01em]">{c.name}</div>
            <div className="text-[12px] text-muted">
              {c.role} · {c.firm}
            </div>
          </div>
        </div>
        <div>
          <div className="label">Phone</div>
          <a href={telHref(c.phone)} className="tabular mt-1 block text-[14px] text-ink hover:text-swan hover:underline">
            {c.phone}
          </a>
        </div>
        <div className="min-w-0">
          <div className="label">Email</div>
          <a href={`mailto:${c.email}`} className="mt-1 block truncate text-[14px] text-ink hover:text-swan hover:underline">
            {c.email}
          </a>
        </div>
        <div className="flex gap-2">
          <a
            href={telHref(c.phone)}
            className="flex h-8 items-center gap-1.5 rounded-[5px] bg-ink px-3 text-[12.5px] text-paper transition-opacity hover:opacity-90"
          >
            <Phone size={13} strokeWidth={1.7} /> Call
          </a>
          <a
            href={`mailto:${c.email}`}
            className="flex h-8 items-center gap-1.5 rounded-[5px] border border-line bg-surface px-3 text-[12.5px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            <Mail size={13} strokeWidth={1.7} /> Email
          </a>
        </div>
      </div>
      <div className="border-t border-line" />
    </section>
  )
}

const groupOrder: SharedRecord['group'][] = ['Imaging', 'Evaluations', 'Treatment records']

function Records({ records, officeName }: { records: SharedRecord[]; officeName: string }) {
  const { openSource, activeSourceId } = useSource()
  const clinical = records.filter((r) => r.group !== 'Billing')
  const groups = groupOrder.filter((g) => clinical.some((r) => r.group === g))

  return (
    <section>
      <SectionHeader title="Records" meta={`${clinical.length} records shared with your office`} />

      <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted">
        <Lock size={11} strokeWidth={1.8} />
        Documents shared with {officeName}. Other case documents are not visible to your office.
      </div>

      {groups.map((g) => (
        <div key={g} className="mt-5">
          <div className="text-[12px] font-semibold tracking-[0.08em] uppercase">{g}</div>
          <ul className="mt-1 divide-y divide-line border-y border-line">
            {clinical
              .filter((r) => r.group === g)
              .map((r) => (
                <li key={r.sourceId}>
                  <button
                    type="button"
                    onClick={() => openSource(r.sourceId)}
                    className={cx(
                      'group grid w-full grid-cols-[1fr_auto_auto] items-baseline gap-4 py-2 text-left hover:bg-surface',
                      activeSourceId === r.sourceId && 'bg-surface',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="text-[13px] text-ink group-hover:text-swan">{r.title}</span>
                      <span className="ml-2 text-[11px] text-muted">{r.docType}</span>
                    </span>
                    <span className="tabular font-mono text-[10.5px] text-muted">{fmtDate(r.date)}</span>
                    <ArrowUpRight size={12} className="text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

function LiensAndBills({ view }: { view: ProviderView }) {
  const { openSource } = useSource()
  const bill = view.providerBills
  const lien = view.providerLien
  return (
    <section>
      <SectionHeader title="Liens & medical bills" meta="Your office only" />
      <div className="mt-4">
        <div className="label">Outstanding medical bills</div>
        <div className="tabular mt-1.5 text-[30px] leading-none font-medium tracking-[-0.02em]">{fmtMoney(bill.amount)}</div>
      </div>
      <dl className="mt-4 divide-y divide-line border-y border-line text-[13px]">
        <div className="flex items-baseline justify-between py-2">
          <dt className="text-muted">Lien status</dt>
          <dd className="flex items-center gap-1.5 font-medium text-ink">
            <span className={cx('h-1.5 w-1.5 rounded-full', lien.status === 'Active' ? 'bg-warn' : 'bg-ok')} />
            {lien.status}
          </dd>
        </div>
        {lien.filed && (
          <div className="flex items-baseline justify-between py-2">
            <dt className="text-muted">Lien on file since</dt>
            <dd className="tabular text-ink-2">{fmtDate(lien.filed, true)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between py-2">
          <dt className="text-muted">Paid from</dt>
          <dd className="text-ink-2">Settlement proceeds</dd>
        </div>
      </dl>
      <div className="label mt-4 mb-1">Documents</div>
      <ul className="divide-y divide-line rounded-[6px] border border-line bg-surface">
        {[bill.sourceId, lien.sourceId].filter((id): id is string => Boolean(id)).map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => openSource(id)}
              className="group flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-paper"
            >
              <span className="text-[12.5px] text-ink group-hover:text-swan">{view.sources[id].title}</span>
              <span className="tabular font-mono text-[10.5px] text-muted">{fmtDate(view.sources[id].date)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CaseUpdates({ view }: { view: ProviderView }) {
  return (
    <section>
      <SectionHeader title="Recent case status" />
      <ul>
        {view.limitedUpdates.map((u) => (
          <li key={u.id} className="grid grid-cols-[52px_1fr] gap-3 border-b border-line py-2.5">
            <span className="tabular pt-[1px] font-mono text-[10.5px] text-muted">{fmtDate(u.date)}</span>
            <span className="text-[13px] leading-snug text-ink-2">{u.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
