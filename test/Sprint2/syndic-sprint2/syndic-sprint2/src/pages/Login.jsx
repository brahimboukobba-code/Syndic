import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LanguageToggle from '../components/LanguageToggle'

export default function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4">
        <span className="font-semibold text-brand-600 dark:text-sand-100">
          {t('app.name')}
        </span>
        <LanguageToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-brand-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-9 w-9 fill-sand-50">
                <path d="M7 4h10a1 1 0 0 1 1 1v15h-3v-3h-3v3H6V5a1 1 0 0 1 1-1zm2 3v2h2V7H9zm4 0v2h2V7h-2zM9 11v2h2v-2H9zm4 0v2h2v-2h-2z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold">{t('login.title')}</h1>
            <p className="mt-1 text-sm opacity-70">{t('login.subtitle')}</p>
          </div>

          {status === 'sent' ? (
            <div className="card text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-emerald-600">
                  <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
                </svg>
              </div>
              <p className="font-medium">{t('login.sent')}</p>
              <p className="mt-2 text-sm opacity-60">{t('login.checkSpam')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t('login.email')}
                </label>
                <input
                  type="email"
                  required
                  className="input"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                />
              </div>
              {status === 'error' && (
                <p className="text-sm text-red-600">{t('login.error')}</p>
              )}
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? t('login.sending') : t('login.send')}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
