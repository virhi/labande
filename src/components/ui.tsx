import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { avatarColor, initial } from '../lib/format'

export function Screen({ children }: { children: ReactNode }) {
  return <main className="screen">{children}</main>
}

export function BackLink({ to, label = 'Retour' }: { to: string; label?: string }) {
  return (
    <Link to={to} className="back" aria-label={label}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </Link>
  )
}

export function Avatar({ id, name, size = 40 }: { id: string; name: string; size?: number }) {
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, background: avatarColor(id), fontSize: size * 0.38 }}>
      {initial(name)}
    </span>
  )
}

export function Brand() {
  return <p className="brand">La Bande</p>
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="error" role="alert">
      {children}
    </p>
  )
}
