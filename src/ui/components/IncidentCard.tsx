import type { Incident } from '../types'
import { fmtDate } from '../lib/format'
import { FactText } from './FactText'
import { SectionHeader } from './SectionHeader'

export function IncidentCard({ incident }: { incident: Incident }) {
  return (
    <section>
      <SectionHeader title="Incident" meta={incident.date ? fmtDate(incident.date, true) : undefined} />
      {incident.location && <div className="mt-3 text-[12.5px] text-ink-2">{incident.location}</div>}
      {incident.description.length > 0 && (
        <div className="mt-4">
          <div className="label">Case summary · recorded in Clio</div>
          <FactText segments={incident.description} className="mt-1.5 font-serif text-[16.5px] leading-[1.55] text-ink" />
        </div>
      )}
    </section>
  )
}
