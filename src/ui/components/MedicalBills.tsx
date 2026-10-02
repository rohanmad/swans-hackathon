import { ArrowRight } from 'lucide-react'
import type { BillStatus, MedicalBill } from '../types'
import { useSource } from '../context/SourceContext'
import { cx, fmtMoney } from '../lib/format'
import { EvidenceLink } from './EvidenceLink'
import { SectionHeader } from './SectionHeader'

const billStatusMeta: Record<BillStatus, { label: string; className: string }> = {
  lien: { label: 'Lien · Active', className: 'border-warn/25 bg-warn-soft text-warn' },
  balance: { label: 'Balance due', className: 'border-line-strong bg-paper text-ink-2' },
  pending: { label: 'Pending', className: 'border-line bg-surface text-muted' },
  paid: { label: 'Paid', className: 'border-ok/25 bg-ok-soft text-ok' },
  unknown: { label: 'Status not recorded', className: 'border-line bg-surface text-muted' },
}

const barTones = ['bg-ink', 'bg-ink-2', 'bg-muted', 'bg-faint']

interface Props {
  bills: MedicalBill[]
  onOpenFinancials?: () => void
  totalSourceId?: string
}

export function MedicalBills({ bills, onOpenFinancials, totalSourceId }: Props) {
  const { openSource, activeSourceId } = useSource()
  const sorted = [...bills].sort((a, b) => b.amount - a.amount)
  const total = sorted.reduce((sum, b) => sum + b.amount, 0)

  return (
    <section>
      <SectionHeader title="Medical bills" meta={`${bills.length} providers`} />

      <div className="mt-4">
        <div className="label">Total medical bills</div>
        <div className="tabular mt-1.5 text-[30px] leading-none font-medium tracking-[-0.02em]">{fmtMoney(total)}</div>
      </div>

      <div className="mt-3 flex h-[6px] gap-[2px] overflow-hidden rounded-full">
        {sorted.map((b, i) => (
          <span key={b.id} className={barTones[i % barTones.length]} style={{ width: `${(b.amount / total) * 100}%` }} />
        ))}
      </div>

      <table className="mt-3 w-full text-[13px]">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="label py-1.5 font-normal">Provider</th>
            <th className="label py-1.5 text-right font-normal">Amount</th>
            <th className="label py-1.5 pl-4 text-right font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b, i) => {
            const st = billStatusMeta[b.status]
            return (
              <tr
                key={b.id}
                onClick={() => openSource(b.sourceId)}
                className={cx(
                  'cursor-pointer border-b border-line/70 transition-colors hover:bg-surface',
                  activeSourceId === b.sourceId && 'bg-surface',
                )}
              >
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <span className={cx('h-2 w-2 rounded-[2px]', barTones[i % barTones.length])} />
                    {b.payee}
                  </span>
                </td>
                <td className="tabular py-2 text-right font-medium">{fmtMoney(b.amount)}</td>
                <td className="py-2 pl-4 text-right">
                  <span className={cx('rounded-[3px] border px-1.5 py-[1px] font-mono text-[9.5px] tracking-[0.06em] whitespace-nowrap uppercase', st.className)}>
                    {st.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-2.5 flex items-center justify-between">
        {totalSourceId ? <EvidenceLink sourceId={totalSourceId} /> : <span />}
        {onOpenFinancials && (
          <button
            type="button"
            onClick={onOpenFinancials}
            className="flex items-center gap-1 text-[12px] text-ink-2 transition-colors hover:text-swan"
          >
            All providers <ArrowRight size={12} />
          </button>
        )}
      </div>
    </section>
  )
}
