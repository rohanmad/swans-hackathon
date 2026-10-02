import type { BriefSegment, FactKind } from '../types'
import { useSource } from '../context/SourceContext'
import { cx, fmtDate } from '../lib/format'

const kindStyle: Record<FactKind, { label: string; className: string }> = {
  client: { label: 'Client', className: 'decoration-swan/70 hover:bg-swan-soft' },
  incident: { label: 'Incident', className: 'decoration-ink/40 hover:bg-ink/[0.06]' },
  liability: { label: 'Liability', className: 'decoration-ink/40 hover:bg-ink/[0.06]' },
  treatment: { label: 'Treatment', className: 'decoration-ok/70 hover:bg-ok-soft' },
  injury: { label: 'Injury', className: 'decoration-high/70 hover:bg-high-soft' },
  coverage: { label: 'Coverage', className: 'decoration-swan/70 hover:bg-swan-soft' },
  money: { label: 'Liens', className: 'decoration-warn/70 hover:bg-warn-soft' },
  status: { label: 'Status', className: 'decoration-ok/70 hover:bg-ok-soft' },
  activity: { label: 'Recent', className: 'decoration-warn/70 hover:bg-warn-soft' },
}

export function FactText({ segments, className }: { segments: BriefSegment[]; className?: string }) {
  return (
    <p className={className}>
      {segments.map((seg, i) =>
        typeof seg === 'string' ? <span key={i}>{seg}</span> : <Fact key={i} seg={seg} />,
      )}
    </p>
  )
}

function Fact({ seg }: { seg: Exclude<BriefSegment, string> }) {
  const { sources, openSource, activeSourceId } = useSource()
  const style = kindStyle[seg.kind]
  const src = sources[seg.sourceId]
  const active = activeSourceId === seg.sourceId
  return (
    <span className="group relative inline">
      <span
        role="button"
        tabIndex={0}
        onClick={() => openSource(seg.sourceId)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openSource(seg.sourceId))}
        className={cx(
          'cursor-pointer rounded-[2px] font-medium underline decoration-[1.5px] underline-offset-[5px] transition-colors [box-decoration-break:clone]',
          style.className,
          active && 'bg-swan-soft',
        )}
      >
        {seg.text}
      </span>
      {src && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-ink px-2 py-1 font-sans text-[11px] leading-tight font-normal text-paper shadow-lg group-hover:block">
          <span className="font-mono text-[9.5px] tracking-[0.1em] text-paper/60 uppercase">{style.label}</span>
          <span className="mx-1.5 text-paper/30">·</span>
          {src.title} · {fmtDate(src.date)}
        </span>
      )}
    </span>
  )
}
