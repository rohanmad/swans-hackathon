import type { ReactNode } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import type { Client, DeskLine } from '../types'
import { cx, daysAgo, fmtDate, telHref } from '../lib/format'
import { EvidenceLink } from './EvidenceLink'
import { RequestClient } from './RequestClient'
import { SectionHeader } from './SectionHeader'

export function ClientCard({ client, requests }: { client: Client; requests?: DeskLine[] }) {
  const since = daysAgo(client.lastContact.date)
  const stale = since > 14
  return (
    <section>
      <SectionHeader title="Client" meta={`Represented since ${fmtDate(client.representedSince, true)}`} />

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-[14px] font-medium tracking-[0.04em] text-paper">
          {client.initials}
        </div>
        <div>
          <div className="text-[16px] font-semibold tracking-[-0.01em]">{client.name}</div>
          <div className="text-[12px] text-muted">Client{client.age !== null && ` · ${client.age}`}</div>
        </div>
      </div>

      <dl className="mt-4 space-y-2.5">
        {client.phone && (
          <ContactRow label="Phone" icon={<Phone size={12} strokeWidth={1.7} />}>
            <a href={telHref(client.phone)} className="tabular text-ink hover:text-swan hover:underline">
              {client.phone}
            </a>
          </ContactRow>
        )}
        {client.email && (
          <ContactRow label="Email" icon={<Mail size={12} strokeWidth={1.7} />}>
            <a href={`mailto:${client.email}`} className="truncate text-ink hover:text-swan hover:underline">
              {client.email}
            </a>
          </ContactRow>
        )}
        {client.address && (
          <ContactRow label="Address" icon={<MapPin size={12} strokeWidth={1.7} />}>
            <span className="text-ink-2">{client.address}</span>
          </ContactRow>
        )}
      </dl>

      <div className={cx('mt-4 rounded-[5px] border px-3 py-2.5', stale ? 'border-high/25 bg-high-soft/50' : 'border-line bg-surface')}>
        <div className="flex items-baseline justify-between">
          <span className="label">Last contact</span>
          <span className={cx('text-[11.5px] font-medium', stale ? 'text-high' : 'text-ok')}>{since} days ago</span>
        </div>
        <div className="mt-1 text-[13.5px] font-medium">{fmtDate(client.lastContact.date, true)}</div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[11.5px] text-muted">{client.lastContact.channel}</span>
          <EvidenceLink sourceId={client.lastContact.sourceId} label="Open" />
        </div>
      </div>
      <RequestClient client={client} items={requests ?? []} />
    </section>
  )
}

function ContactRow({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[70px_1fr] items-baseline gap-2 text-[13px]">
      <dt className="label flex items-center gap-1.5">
        <span className="text-faint">{icon}</span>
        {label}
      </dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  )
}
