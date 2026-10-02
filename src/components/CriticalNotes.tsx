import { AlertTriangle, Lock } from 'lucide-react'
import type { CriticalNotes as CriticalNotesData } from '../types'
import { fmtDate } from '../lib/format'
import { EvidenceLink } from './EvidenceLink'

export function CriticalNotes({ data }: { data: CriticalNotesData }) {
  return (
    <section className="relative border-l-[3px] border-high bg-gradient-to-r from-high-soft/60 via-surface/40 to-transparent py-4 pr-6 pl-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.14em] text-high uppercase">
          <AlertTriangle size={13} strokeWidth={2} />
          Critical case notes
          <span className="font-normal tracking-[0.08em] text-high/60">· Read first</span>
        </h2>
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <Lock size={11} strokeWidth={1.8} />
          Attorney only · Pinned by {data.pinnedBy} · {fmtDate(data.updated)}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {data.notes.map((note) => (
          <li key={note.id} className="flex items-start gap-3">
            <span className="mt-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-ink" />
            <p className="text-[17px] leading-[1.45] font-semibold tracking-[-0.01em] text-ink">
              {note.text}
              {note.sourceId && (
                <>
                  {' '}
                  <EvidenceLink sourceId={note.sourceId} className="align-middle font-normal tracking-normal" />
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
