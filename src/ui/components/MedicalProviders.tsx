import { useState } from 'react'
import { ChevronDown, FileText, Mail, Phone } from 'lucide-react'
import type { MedicalProvider, TreatmentStatus } from '../types'
import { useSource } from '../context/SourceContext'
import { cx, fmtDate, telHref } from '../lib/format'
import { SectionHeader } from './SectionHeader'

const treatmentMeta: Record<TreatmentStatus, { label: string; dot: string; text: string }> = {
  active: { label: 'Active', dot: 'bg-ok', text: 'text-ok' },
  referred: { label: 'Referred', dot: 'bg-warn', text: 'text-warn' },
  complete: { label: 'Complete', dot: 'bg-line-strong', text: 'text-muted' },
}

export function MedicalProviders({ providers }: { providers: MedicalProvider[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const { sources, openSource, activeSourceId } = useSource()
  const active = providers.filter((p) => p.treatment === 'active').length

  return (
    <section>
      <SectionHeader title="Medical providers" meta={`${active} actively treating · ${providers.length} total`} />

      <ul>
        {providers.map((p) => {
          const tm = treatmentMeta[p.treatment]
          const isOpen = expanded === p.id
          return (
            <li key={p.id} className="border-b border-line py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[14px] font-semibold tracking-[-0.005em]">{p.name}</span>
                  </div>
                  <div className="text-[12px] text-ink-2">
                    {p.specialty}
                    {p.office !== p.name && <span className="text-muted"> · {p.office}</span>}
                  </div>
                </div>
                <span className={cx('flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase', tm.text)}>
                  <span className={cx('h-1.5 w-1.5 rounded-full', tm.dot)} />
                  {tm.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-muted">
                {p.phone && (
                  <>
                    <a href={telHref(p.phone)} className="tabular flex items-center gap-1 hover:text-swan">
                      <Phone size={11} strokeWidth={1.7} />
                      {p.phone}
                    </a>
                    <span className="text-line-strong">|</span>
                  </>
                )}
                {p.email && (
                  <>
                    <a href={`mailto:${p.email}`} className="flex items-center gap-1 truncate hover:text-swan">
                      <Mail size={11} strokeWidth={1.7} />
                      {p.email}
                    </a>
                    <span className="text-line-strong">|</span>
                  </>
                )}
                <span>{p.treatmentDetail}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  {p.recordIds.length > 0 && <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className={cx(
                      'flex items-center gap-1 rounded-[4px] border px-2 py-[3px] text-[11.5px] transition-colors',
                      isOpen ? 'border-ink/30 text-ink' : 'border-line text-ink-2 hover:border-ink/30 hover:text-ink',
                    )}
                  >
                    <FileText size={11} strokeWidth={1.7} />
                    Records · {p.recordIds.length}
                    <ChevronDown size={11} className={cx('transition-transform', isOpen && 'rotate-180')} />
                  </button>}
                </span>
              </div>

              {isOpen && (
                <ul className="animate-fade-in mt-2.5 divide-y divide-line rounded-[5px] border border-line bg-surface">
                  {p.recordIds.map((id) => {
                    const src = sources[id]
                    if (!src) return null
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => openSource(id)}
                          className={cx(
                            'group grid w-full grid-cols-[1fr_auto] items-baseline gap-3 px-3 py-1.5 text-left hover:bg-paper',
                            activeSourceId === id && 'bg-paper',
                          )}
                        >
                          <span className="truncate text-[12.5px] text-ink group-hover:text-swan">{src.title}</span>
                          <span className="tabular font-mono text-[10.5px] text-muted">{fmtDate(src.date)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
