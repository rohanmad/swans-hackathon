import type { ReactNode } from 'react'
import type { MedicalSummarySection } from '../types'
import { useSource } from '../context/SourceContext'
import { cx, fmtDate } from '../lib/format'
import { FactText } from './FactText'
import { SectionHeader } from './SectionHeader'

export function MedicalRecordSummary({ sections, title, meta }: { sections: MedicalSummarySection[]; title: string; meta?: ReactNode }) {
  const { sources, openSource } = useSource()

  return (
    <section>
      <SectionHeader title={title} meta={meta} />

      <div className="grid grid-cols-5 max-[1240px]:grid-cols-3">
        {sections.map((s, i) => {
          const src = sources[s.sourceIds[0]]
          return (
            <div
              key={s.id}
              className={cx(
                'flex flex-col py-4 pr-5',
                i > 0 && 'border-l border-line pl-5 max-[1240px]:[&:nth-child(4)]:border-l-0 max-[1240px]:[&:nth-child(4)]:pl-0',
              )}
            >
              <div className="label !text-ink-2">{s.label}</div>
              <FactText segments={s.body} className="mt-2 flex-1 font-serif text-[15.5px] leading-[1.5] text-ink" />
              {src && (
                <button
                  type="button"
                  onClick={() => openSource(s.sourceIds[0])}
                  className="mt-3 self-start text-[11.5px] text-muted underline decoration-line-strong decoration-dotted underline-offset-[3px] transition-colors hover:text-swan"
                >
                  {src.docType} · {fmtDate(src.date, true)}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
