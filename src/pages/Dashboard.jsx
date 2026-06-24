import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/AuthContext'

export default function Dashboard() {
  const { t } = useTranslation()
  const { profile, roleNames, building } = useAuth()
  const primaryRole = roleNames[0]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">
        {t('dashboard.welcome')}, {profile?.nom_complet?.split(' ')[0] || ''}
      </h1>
      {building && <p className="text-sm opacity-60 mb-6">{building.nom} — {building.adresse}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <p className="text-sm opacity-60">{t('dashboard.yourRole')}</p>
          <p className="mt-1 text-xl font-semibold">
            {primaryRole ? t(`roles.${primaryRole}`) : '—'}
          </p>
          {roleNames.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roleNames.slice(1).map((r) => (
                <span key={r} className="rounded-lg bg-sand-100 dark:bg-brand-600 px-2 py-0.5 text-xs">
                  {t(`roles.${r}`)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 card">
        <p className="text-sm opacity-70">{t('dashboard.placeholder')}</p>
      </div>
    </div>
  )
}
