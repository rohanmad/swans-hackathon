import { navigate } from '../lib/router'
import { cx } from '../lib/format'

export function RoleSwitcher({ current }: { current: 'attorney' | 'provider' }) {
  const options = [
    { id: 'attorney', label: 'Attorney', path: '/' },
    { id: 'provider', label: 'Provider', path: '/provider' },
  ] as const
  return (
    <div>
      <div className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">Prototype · Preview role</div>
      <div className="mt-1.5 grid grid-cols-2 rounded-[5px] border border-line bg-surface p-[2px]">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => navigate(o.path)}
            className={cx(
              'rounded-[3px] py-1 text-[11.5px] transition-colors',
              current === o.id ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-snug text-faint">
        Demo of two permission levels. Real provider accounts cannot switch views.
      </p>
    </div>
  )
}
