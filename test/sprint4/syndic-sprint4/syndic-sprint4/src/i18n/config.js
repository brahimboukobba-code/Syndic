import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './fr.json'
import ar from './ar.json'

const saved = localStorage.getItem('lang') || 'fr'

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: saved,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})

// Applique la direction du document selon la langue
function applyDir(lng) {
  document.documentElement.lang = lng
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
}
applyDir(saved)
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng)
  applyDir(lng)
})

export default i18n
