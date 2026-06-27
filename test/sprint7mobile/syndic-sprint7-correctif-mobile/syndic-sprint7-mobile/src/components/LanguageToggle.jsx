import { useTranslation } from 'react-i18next'

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const next = i18n.language === 'ar' ? 'fr' : 'ar'
  const label = i18n.language === 'ar' ? 'FR' : 'ع'
  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      className="btn-ghost px-3 py-1.5 text-sm"
      aria-label="Changer de langue"
    >
      {label}
    </button>
  )
}
