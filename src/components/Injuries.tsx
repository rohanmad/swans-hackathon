import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Confidence, Injury } from '../types'
import { useSource } from '../context/SourceContext'
import { cx, fmtDate } from '../lib/format'
import { SectionHeader } from './SectionHeader'

const confidenceMeta: Record<Confidence, { label: string; filled: number; color: string }> = {
  high: { label: 'High confidence', filled: 3, color: 'bg-ink' },
  medium: { label: 'Medium confidence', filled: 2, color: 'bg-ink-2' },
  low: { label: 'Low confidence', filled: 1, color: 'bg-muted' },
}

export function Injuries({ injuries }: { injuries: Injury[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const { sources, openSource, activeSourceId } = useSource()

  return (
    <section>
      <SectionHeader title="Injuries" meta="Confidence reflects corroborating records" />

      <ul>
        {injuries.map((inj) => {
          const meta = confidenceMeta[inj.confidence]
          const isOpen = open === inj.id
          const primary = inj.priority === 'primary'
          return (
            <li key={inj.id} className="border-b border-line">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : inj.id)}
                className="grid w-full grid-cols-[14px_132px_1fr_auto] items-center gap-3 py-3 text-left transition-colors hover:bg-surface"
              >
                <ChevronRight
                  size={13}
                  className={cx('text-muted transition-transform duration-150', isOpen && 'rotate-90')}
                />
                <span>
                  <span className={cx('block text-[13px] tracking-[0.06em] uppercase', primary ? 'font-semibold' : 'font-medium text-ink-2')}>
                    {inj.region}
                  </span>
                  <span
                    className={cx(
                      'font-mono text-[9.5px] tracking-[0.1em] uppercase',
                      primary ? 'text-high' : 'text-muted',
                    )}
                  >
                    {inj.priority}
                  </span>
                </span>
                <span className="min-w-0 truncate text-[12.5px] text-ink-2">{inj.finding}</span>
                <span className="flex gap-[3px]" title={meta.label}>
                  {[0, 1, 2].map((k) => (
                    <span
                      key={k}
                      className={cx('h-[10px] w-[4px] rounded-[1px]', k < meta.filled ? meta.color : 'bg-line')}
                    />
                  ))}
                </span>
              </button>

              {isOpen && (
                <div className="animate-fade-in pb-4 pl-[26px]">
                  <div className="text-[11.5px] leading-snug text-muted">
                    {meta.label} · {inj.rationale}
                  </div>
                  <ul className="mt-2 divide-y divide-line rounded-[5px] border border-line bg-surface">
                    {inj.evidence.map((id) => {
                      const src = sources[id]
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => openSource(id)}
                            className={cx(
                              'group grid w-full grid-cols-[1fr_auto] items-baseline gap-3 px-3 py-2 text-left transition-colors hover:bg-paper',
                              activeSourceId === id && 'bg-paper',
                            )}
                          >
                            <span className="min-w-0">
                              <span className="text-[12.5px] font-medium text-ink group-hover:text-swan">{src.title}</span>
                              <span className="block truncate text-[11.5px] text-muted">“{src.excerpt}”</span>
                            </span>
                            <span className="tabular font-mono text-[10.5px] text-muted">{fmtDate(src.date)}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>

    </section>
  )
}
