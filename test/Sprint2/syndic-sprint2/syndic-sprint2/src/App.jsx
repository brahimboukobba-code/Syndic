import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './lib/AuthContext'
import AppShell from './components/AppShell'
import Placeholder from './components/Placeholder'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Finances from './pages/Finances'
import History from './pages/History'

function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
        <p className="text-sm opacity-60">{t('common.loading')}</p>
      </div>
    </div>
  )
}

function NoBuilding() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm text-center">
        <p className="mb-4">{t('common.noBuilding')}</p>
        <button onClick={signOut} className="btn-ghost">{t('nav.logout')}</button>
      </div>
    </div>
  )
}

function Protected() {
  const { session, loading, building, roleNames } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Login />
  // Connecté mais sans rôle ni immeuble : compte pas encore rattaché
  if (!building && roleNames.length === 0) return <NoBuilding />

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/finances" element={<Finances />} />
        <Route path="/projects" element={<Placeholder titleKey="projects" />} />
        <Route path="/meetings" element={<Placeholder titleKey="meetings" />} />
        <Route path="/announcements" element={<Placeholder titleKey="announcements" />} />
        <Route path="/complaints" element={<Placeholder titleKey="complaints" />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Protected />
    </AuthProvider>
  )
}
