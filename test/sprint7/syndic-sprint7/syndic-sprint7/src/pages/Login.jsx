import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LanguageToggle from '../components/LanguageToggle'

export default function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [status, setStatus] = useState('idle') // idle | signing | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    setStatus('signing')
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      setStatus('error')
      // Message générique : on ne révèle pas si c'est l'e-mail ou le mot
      // de passe qui est faux (bonne pratique de sécurité).
      setErrorMsg(t('login.error'))
    }
    // En cas de succès, AuthContext bascule automatiquement vers l'app.
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

          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('login.email')}</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('login.password')}</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="input pe-11"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute inset-y-0 end-0 px-3 flex items-center opacity-50 hover:opacity-100"
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.1A9 9 0 0 1 21 12a9.5 9.5 0 0 1-2.3 3.1M6.5 6.5A9.3 9.3 0 0 0 3 12a9 9 0 0 0 11 6.5"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={status === 'signing'}
            >
              {status === 'signing' ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
