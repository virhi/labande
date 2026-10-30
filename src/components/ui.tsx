import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { avatarColor, initial } from '../lib/format'
import { PASSWORD_RULES } from '../lib/password'

// nav : écran principal, avec la barre d'onglets en bas.
export function Screen({ children, nav = false }: { children: ReactNode; nav?: boolean }) {
  return (
    <>
      <main className={nav ? 'screen with-nav' : 'screen'}>{children}</main>
      {nav && <TabBar />}
    </>
  )
}

const NAV = [
  { to: '/', label: 'Défis', icon: 'M5 21V4M5 4h11l-2 4 2 4H5' },
  { to: '/historique', label: 'Historique', icon: 'M4 20h16M7 16v-5M12 16V7M17 16v-8' },
  { to: '/profil', label: 'Profil', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 21a7 7 0 0114 0' },
]

function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end className={({ isActive }) => (isActive ? 'tabbar-item on' : 'tabbar-item')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={n.icon} />
          </svg>
          {n.label}
        </NavLink>
      ))}
    </nav>
  )
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

// Règles du mot de passe, cochées au fil de la saisie.
export function PasswordRules({ password, id }: { password: string; id: string }) {
  return (
    <ul className="pw-rules" id={id}>
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password)
        return (
          <li key={r.id} className={ok ? 'ok' : undefined}>
            <span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.label}
            <span className="sr-only">{ok ? ' : fait' : ' : à faire'}</span>
          </li>
        )
      })}
    </ul>
  )
}
