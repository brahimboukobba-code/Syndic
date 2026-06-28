import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { profile, session, roleNames, signOut, reload } = useAuth()
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  async function changePassword(e) {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    if (pwd.length < 6) { setMsg({ type: 'error', text: t('profile.pwdTooShort') }); return }
    if (pwd !== pwd2) { setMsg({ type: 'error', text: t('profile.pwdMismatch') }); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    setSaving(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else { setMsg({ type: 'success', text: t('profile.pwdChanged') }); setPwd(''); setPwd2('') }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-4">{t('profile.title')}</h1>

      {/* Infos */}
      <div className="card space-y-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-brand-500 text-white flex items-center justify-center text-lg font-semibold">
            {(profile?.nom_complet || '?').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{profile?.nom_complet}</p>
            <p className="text-sm opacity-60">{session?.user?.email}</p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {roleNames.map((r) => (
                <span key={r} className="rounded-lg bg-sand-100 dark:bg-brand-600 px-2 py-0.5 text-xs">{t(`roles.${r}`)}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Changer le mot de passe */}
      <form onSubmit={changePassword} className="card space-y-4">
        <p className="font-semibold">{t('profile.changePassword')}</p>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('profile.newPassword')}</label>
          <input type="password" className="input" value={pwd} onChange={(e) => setPwd(e.target.value)} dir="ltr" autoComplete="new-password" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('profile.confirmPassword')}</label>
          <input type="password" className="input" value={pwd2} onChange={(e) => setPwd2(e.target.value)} dir="ltr" autoComplete="new-password" />
        </div>
        {msg.text && (
          <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{msg.text}</p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </form>

      <button onClick={signOut} className="btn-ghost w-full mt-4 text-red-600">{t('profile.logout')}</button>
    </div>
  )
}
