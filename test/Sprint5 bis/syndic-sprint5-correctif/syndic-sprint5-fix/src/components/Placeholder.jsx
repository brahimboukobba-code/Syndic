import { useTranslation } from 'react-i18next'

export default function Placeholder({ titleKey }) {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{t(`nav.${titleKey}`)}</h1>
      <p className="text-sm opacity-60 mb-6">{t('dashboard.comingSoon')}</p>
      <div className="card">
        <div className="flex items-center gap-3 text-sm opacity-70">
          <div className="h-10 w-10 rounded-xl bg-sand-100 dark:bg-brand-600 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
              <path d="M12 8v4m0 4h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" strokeLinecap="round"/>
            </svg>
          </div>
          <p>{t('dashboard.placeholder')}</p>
        </div>
      </div>
    </div>
  )
}
