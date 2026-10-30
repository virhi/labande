import { useEffect, useRef, type ReactNode } from 'react'

// Panneau qui monte du bas de l'écran (invitation, nouvelle séance).
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
