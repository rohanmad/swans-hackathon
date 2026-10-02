import type { ReactNode } from 'react'

export function SectionHeader({ title, meta, rule = true }: { title: string; meta?: ReactNode; rule?: boolean }) {
  return (
    <div className={rule ? 'flex items-baseline justify-between gap-4 border-b border-ink/80 pb-2' : 'flex items-baseline justify-between gap-4'}>
      <h2 className="label !text-ink">{title}</h2>
      {meta && <div className="text-[11.5px] text-muted">{meta}</div>}
    </div>
  )
}
