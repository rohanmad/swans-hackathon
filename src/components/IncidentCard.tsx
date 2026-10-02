import { Sparkles } from 'lucide-react'
import type { Incident } from '../types'
import { FactText } from './FactText'
import { SectionHeader } from './SectionHeader'

export function IncidentCard({ incident }: { incident: Incident }) {
  return (
    <section>
      <SectionHeader title="Incident" meta={incident.location} />

      <div className="mt-4">
        <div className="label flex items-center gap-1.5">
          Description of incident
          <Sparkles size={11} strokeWidth={1.7} className="text-swan" />
        </div>
        <FactText segments={incident.description} className="mt-1.5 font-serif text-[16.5px] leading-[1.55] text-ink" />
      </div>
    </section>
  )
}
