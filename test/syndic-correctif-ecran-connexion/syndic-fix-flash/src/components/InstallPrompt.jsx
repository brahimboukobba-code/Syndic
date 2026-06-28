import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Affiche une bannière d'installation quand le navigateur le propose.
export default function InstallPrompt() {
  const { t } = useTranslation()
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferred(e)
      // Ne pas réafficher si l'utilisateur a déjà refusé récemment
      if (localStorage.getItem('pwa-dismissed') !== '1') setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  function dismiss() {
    setVisible(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto md:end-4 md:w-80 z-40 rounded-2xl bg-white dark:bg-brand-700 shadow-xl ring-1 ring-black/10 dark:ring-white/10 p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-sand-50"><path d="M7 4h10a1 1 0 0 1 1 1v15h-3v-3h-3v3H6V5a1 1 0 0 1 1-1z"/></svg>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{t('install.title')}</p>
          <p className="text-sm opacity-70 mt-0.5">{t('install.text')}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={install} className="btn-primary py-1.5 px-3 text-sm">{t('install.button')}</button>
            <button onClick={dismiss} className="btn-ghost py-1.5 px-3 text-sm">{t('install.later')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
