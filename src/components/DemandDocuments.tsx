import { useMemo, useState } from 'react'
import { ArrowUpRight, Lock, Search, Star } from 'lucide-react'
import type { DemandDocument, DocCategory, DocStatus } from '../types'
import { useSource } from '../context/SourceContext'
import { cx, fmtDate } from '../lib/format'
import { SectionHeader } from './SectionHeader'

const categories: { id: DocCategory; label: string }[] = [
  { id: 'medical', label: 'Medical' },
  { id: 'liability', label: 'Liability' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'demand', label: 'Demand' },
]

const statusMeta: Record<DocStatus, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'text-ok' },
  draft: { label: 'Draft', className: 'text-swan' },
  requested: { label: 'Requested', className: 'text-warn' },
  missing: { label: 'Missing', className: 'text-high' },
}

type Filter = 'all' | DocCategory

export function DemandDocuments({ documents }: { documents: DemandDocument[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const { openSource } = useSource()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return documents.filter(
      (d) =>
        (filter === 'all' || d.category === filter) &&
        (!q || [d.title, d.group, d.category, d.note ?? ''].join(' ').toLowerCase().includes(q)),
    )
  }, [documents, filter, query])

  const ready = documents.filter((d) => d.status === 'ready').length
  const gaps = documents.filter((d) => d.status === 'requested' || d.status === 'missing')
  const shownCategories = categories.filter((c) => visible.some((d) => d.category === c.id))

  return (
    <section>
      <SectionHeader
        title="Demand documents"
        meta={
          <span className="flex items-center gap-1.5">
            <Lock size={11} strokeWidth={1.8} />
            Attorney only · <span className="tabular text-ink-2">{ready} of {documents.length}</span> ready ·{' '}
            <span className="text-high">{gaps.length} outstanding</span>
          </span>
        }
      />

      <div className="mt-3 flex items-center justify-between gap-4 border-b border-line pb-3">
        <div className="flex items-center gap-1">
          {(['all', ...categories.map((c) => c.id)] as Filter[]).map((f) => {
            const count = f === 'all' ? documents.length : documents.filter((d) => d.category === f).length
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cx(
                  'rounded-[4px] px-2.5 py-1 text-[12.5px] capitalize transition-colors',
                  filter === f ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-ink/[0.05]',
                )}
              >
                {f}
                <span className={cx('tabular ml-1.5 font-mono text-[10px]', filter === f ? 'text-paper/60' : 'text-faint')}>{count}</span>
              </button>
            )
          })}
        </div>
        <label className="flex h-8 w-[260px] items-center gap-2 rounded-[5px] border border-line bg-surface px-2.5 text-[12.5px] focus-within:border-line-strong">
          <Search size={13} strokeWidth={1.7} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="flex-1 bg-transparent outline-none placeholder:text-faint"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">No documents match “{query}”.</p>
      ) : (
        <div className={cx('mt-4 gap-8', shownCategories.length > 1 && 'columns-2')}>
          {shownCategories.map((c) => {
            const docs = visible.filter((d) => d.category === c.id)
            const all = documents.filter((d) => d.category === c.id)
            const catReady = all.filter((d) => d.status === 'ready').length
            const groups = [...new Set(docs.map((d) => d.group))]
            return (
              <div key={c.id} className="mb-6 break-inside-avoid">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[13px] font-semibold tracking-[0.1em] uppercase">{c.label}</h3>
                  <span className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="flex h-[4px] w-16 overflow-hidden rounded-full bg-line">
                      <span className="bg-ok" style={{ width: `${(catReady / all.length) * 100}%` }} />
                    </span>
                    <span className="tabular">{catReady}/{all.length} ready</span>
                  </span>
                </div>
                {groups.map((g) => (
                  <div key={g} className="mt-2.5">
                    <div className="label mb-1">{g}</div>
                    <ul className="divide-y divide-line border-y border-line">
                      {docs
                        .filter((d) => d.group === g)
                        .map((d) => (
                          <DocRow key={d.id} doc={d} onOpen={() => d.sourceId && openSource(d.sourceId)} />
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function DocRow({ doc, onOpen }: { doc: DemandDocument; onOpen: () => void }) {
  const st = statusMeta[doc.status]
  return (
    <li>
      <button
        type="button"
        disabled={!doc.sourceId}
        onClick={onOpen}
        className="group grid w-full grid-cols-[14px_1fr_auto_74px] items-baseline gap-2.5 py-2 text-left enabled:hover:bg-surface"
      >
        <span title={doc.key?.label}>{doc.key && <Star size={11} strokeWidth={1.6} className="translate-y-[1px] fill-warn text-warn" />}</span>
        <span className="min-w-0">
          <span className={cx('text-[13px]', doc.sourceId ? 'text-ink group-hover:text-swan' : 'text-muted')}>{doc.title}</span>
          {doc.note && <span className="ml-2 text-[11px] text-muted">{doc.note}</span>}
        </span>
        <span className="tabular font-mono text-[10.5px] text-muted">{doc.date ? fmtDate(doc.date) : '—'}</span>
        <span className={cx('flex items-center justify-end gap-1 font-mono text-[9.5px] tracking-[0.08em] uppercase', st.className)}>
          {st.label}
          {doc.sourceId && <ArrowUpRight size={11} className="text-faint opacity-0 transition-opacity group-hover:opacity-100" />}
        </span>
      </button>
    </li>
  )
}
