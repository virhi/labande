import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Tables } from './database.types'

type AuthState = {
  session: Session | null
  profile: Tables<'profiles'> | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      // Pas d'appel Supabase direct dans ce callback : on le décale.
      setTimeout(() => loadProfile(next?.user.id), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session])

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}

// Page à rouvrir après le clic sur le lien de connexion (ex. une invitation).
const NEXT_KEY = 'labande.next'

export function rememberNext(path: string) {
  try {
    localStorage.setItem(NEXT_KEY, path)
  } catch {
    // stockage indisponible : on retombera sur l'accueil
  }
}

export function takeNext(): string | null {
  try {
    const next = localStorage.getItem(NEXT_KEY)
    localStorage.removeItem(NEXT_KEY)
    return next
  } catch {
    return null
  }
}
