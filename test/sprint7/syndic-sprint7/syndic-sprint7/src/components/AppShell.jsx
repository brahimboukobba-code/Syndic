import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/AuthContext'
import LanguageToggle from './LanguageToggle'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'
import InstallPrompt from './InstallPrompt'

// Définition des entrées de navigation + rôles autorisés à les voir.
// 'all' = visible par tous les membres.
const NAV = [
  { to: '/',              key: 'dashboard',     icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10', roles: 'all' },
  { to: '/finances',      key: 'finances',      icon: 'M4 6h16M4 12h16M4 18h10', roles: 'all' },
  { to: '/projects',      key: 'projects',      icon: 'M3 7h18v12H3zM3 7l2-3h6l2 3', roles: 'all' },
  { to: '/meetings',      key: 'meetings',      icon: 'M7 4v3m10-3v3M4 9h16M5 7h14v12H5z', roles: 'all' },
  { to: '/announcements', key: 'announcements', icon: 'M3 11l16-6v14L3 13zM3 11v2', roles: 'all' },
  { to: '/complaints',    key: 'complaints',    icon: 'M12 9v4m0 4h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0', roles: 'all' },
  { to: '/history',       key: 'history',       icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0', roles: 'all' },
]

export default function AppShell({ children }) {
  const { t } = useTranslation()
  const { profile, roleNames, building, signOut } = useAuth()
  const location = useLocation()

  const visibleNav = NAV.filter(
    (item) => item.roles === 'all' || roleNames.some((r) => item.roles.includes(r))
  )

  const primaryRole = roleNames[0]

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-e md:border-black/5 md:dark:border-white/10 md:bg-white md:dark:bg-brand-700">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-sand-50">
                <path d="M7 4h10a1 1 0 0 1 1 1v15h-3v-3h-3v3H6V5a1 1 0 0 1 1-1z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{building?.nom || t('app.name')}</p>
              <p className="text-xs opacity-60 truncate">{t('app.name')}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-sand-50'
                    : 'opacity-70 hover:opacity-100 hover:bg-sand-100 dark:hover:bg-brand-600'
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {t(`nav.${item.key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-black/5 dark:border-white/10">
          <NavLink to="/profile" className="block px-3 py-2 rounded-xl hover:bg-sand-100 dark:hover:bg-brand-600">
            <p className="text-sm font-medium truncate">{profile?.nom_complet}</p>
            {primaryRole && (
              <p className="text-xs opacity-60">{t(`roles.${primaryRole}`)}</p>
            )}
          </NavLink>
          <button onClick={signOut} className="btn-ghost w-full justify-start text-sm">
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 bg-white dark:bg-brand-700 px-4 py-3">
          <div className="md:hidden flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-sand-50">
                <path d="M7 4h10a1 1 0 0 1 1 1v15h-3v-3h-3v3H6V5a1 1 0 0 1 1-1z"/>
              </svg>
            </div>
            <span className="font-semibold truncate">{building?.nom || t('app.name')}</span>
          </div>
          <div className="hidden md:block text-sm opacity-60">
            {t(`nav.${visibleNav.find((n) => n.to === location.pathname)?.key || 'dashboard'}`)}
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <LanguageToggle />
            <ThemeToggle />
            <button onClick={signOut} className="btn-ghost px-3 py-1.5 text-sm md:hidden">
              {t('nav.logout')}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 border-t border-black/5 dark:border-white/10 bg-white dark:bg-brand-700 grid grid-cols-5">
          {visibleNav.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${
                  isActive ? 'text-brand-500 dark:text-sand-50' : 'opacity-60'
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {t(`nav.${item.key}`)}
            </NavLink>
          ))}
        </nav>
      </div>
      <InstallPrompt />
    </div>
  )
}
