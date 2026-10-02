import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import type { MedicalSummarySection } from '../types'
import { useSource } from '../context/SourceContext'
import { cx, fmtDate } from '../lib/format'
import { FactText } from './FactText'
import { SectionHeader } from './SectionHeader'

export function MedicalRecordSummary({ sections }: { sections: MedicalSummarySection[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const { sources, openSource, activeSourceId } = useSource()
  const recordCount = new Set(sections.flatMap((s) => s.sourceIds)).size

  return (
    <section>
      <SectionHeader
        title="Medical record summary"
        meta={
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} strokeWidth={1.6} className="text-swan" />
            What the medical records collectively say · synthesized from {recordCount} records
          </span>
        }
      />

      <div className="grid grid-cols-5 max-[1240px]:grid-cols-3">
        {sections.map((s, i) => {
          const isOpen = open === s.id
          return (
            <div
              key={s.id}
              className={cx(
                'flex flex-col py-4 pr-5',
                i > 0 && 'border-l border-line pl-5 max-[1240px]:[&:nth-child(4)]:border-l-0 max-[1240px]:[&:nth-child(4)]:pl-0',
              )}
            >
              <div className={cx('label', s.id === 'ms-outstanding' ? '!text-warn' : '!text-ink-2')}>{s.label}</div>
              <FactText segments={s.body} className="mt-2 flex-1 font-serif text-[15.5px] leading-[1.5] text-ink" />
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="mt-3 flex items-center gap-1 self-start text-[11.5px] text-muted transition-colors hover:text-swan"
              >
                <span className="underline decoration-line-strong decoration-dotted underline-offset-[3px]">
                  View supporting records · {s.sourceIds.length}
                </span>
                <ChevronDown size={11} className={cx('transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <ul className="animate-fade-in mt-2 divide-y divide-line rounded-[5px] border border-line bg-surface">
                  {s.sourceIds.map((id) => {
                    const src = sources[id]
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => openSource(id)}
                          className={cx(
                            'group flex w-full items-baseline justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-paper',
                            activeSourceId === id && 'bg-paper',
                          )}
                        >
                          <span className="truncate text-[12px] text-ink group-hover:text-swan">{src.title}</span>
                          <span className="tabular shrink-0 font-mono text-[10px] text-muted">{fmtDate(src.date)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
