export function SwanMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M4 13.5c2.2 1.6 7.6 1.8 10-1.2 1.2-1.5.6-3.4-1.4-3.6-1.7-.2-2.6 1.3-4.1 1.2C6.3 9.8 6 7.2 7.6 5.6c1-1 2.6-1.1 3.3-.3"
        stroke="var(--color-swan)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="11.6" cy="4.6" r="1" fill="var(--color-swan)" />
    </svg>
  )
}
