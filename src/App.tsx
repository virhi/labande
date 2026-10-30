import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, rememberNext, takeNext, useAuth } from './lib/auth'
import { Screen } from './components/ui'
import Login from './pages/Login'
import Home from './pages/Home'
import NewChallenge from './pages/NewChallenge'
import Join from './pages/Join'
import Challenge from './pages/Challenge'

function Gate() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Après le clic sur le lien de connexion, on revient sur la page demandée (ex. une invitation).
  useEffect(() => {
    if (!session) return
    const next = takeNext()
    if (next && next !== location.pathname) navigate(next, { replace: true })
  }, [session, location.pathname, navigate])

  if (loading) {
    return (
      <Screen>
        <p className="muted">Chargement…</p>
      </Screen>
    )
  }

  if (!session) {
    const inviting = location.pathname.startsWith('/rejoindre/')
    if (location.pathname !== '/') rememberNext(location.pathname)
    return <Login intro={inviting ? 'Un ami t’invite à un défi. Connecte-toi pour le rejoindre.' : undefined} />
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/nouveau" element={<NewChallenge />} />
      <Route path="/rejoindre/:code" element={<Join />} />
      <Route path="/defi/:id" element={<Challenge />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}
